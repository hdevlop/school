import { withoutLeakedPlanning } from './schoolAnswerPlanning';
interface ToolDelta { index: number; function?: { name?: string; arguments?: string }; [key: string]: unknown }
interface Choice { index: number; delta?: { content?: string | null; tool_calls?: ToolDelta[]; [key: string]: unknown }; [key: string]: unknown }
interface Chunk { choices?: Choice[]; [key: string]: unknown }

/** Adapt only the observed Harmony suffix, never guess a function or its inputs. */
export function offeredToolName(name: string, offered: ReadonlySet<string>): string | null {
  if (offered.has(name)) return name;
  const match = /^(.*?)(?:<\|channel\|>(?:commentary|json)?){1,4}$/u.exec(name);
  return match && offered.has(match[1]!) ? match[1]! : null;
}

/** One bounded provider completion, before the SDK sees names or planning text.
 * Tool steps expose structured calls only; answer-only steps retain their text
 * except leaked planning (schoolAnswerPlanning).
 * Module guards/validation still execute every call. No retry or new generation.
 */
export function schoolProviderResponse(response: Response, offered: ReadonlySet<string>, failed: () => void): Response {
  if (!response.ok || !response.body || !response.headers.get('content-type')?.includes('text/event-stream')) return response;
  const reader = response.body.getReader();
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const decoder = new TextDecoder();
      let raw = '', bytes = 0;
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          bytes += part.value.byteLength;
          if (bytes > 1_048_576) throw Error('School provider completion exceeds stream bound');
          raw += decoder.decode(part.value, { stream: true });
        }
        raw += decoder.decode();
        if (cancelled) return;
        const frames = raw.split(/\r?\n\r?\n/u).filter(Boolean).map(frame => {
          const data = frame.split(/\r?\n/u).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
          let chunk: Chunk | null = null;
          try { chunk = JSON.parse(data); } catch { /* comments and DONE retain their framing */ }
          return { frame, data, chunk };
        });
        if (!frames.some(frame => frame.data === '[DONE]')) throw Error('School provider stream ended before DONE');
        const names = new Map<string, string>(), toolChoices = new Set<number>();
        for (const { chunk } of frames) for (const choice of chunk?.choices ?? []) {
          for (const call of choice.delta?.tool_calls ?? []) {
            toolChoices.add(choice.index);
            const key = `${choice.index}:${call.index}`;
            names.set(key, (names.get(key) ?? '') + (call.function?.name ?? ''));
          }
        }
        // Answer-only steps: leaked planning before the answer is cut, and a
        // planning-only answer fails (schoolAnswerPlanning).
        const answers = new Map<number, string>();
        for (const { chunk } of frames) for (const choice of chunk?.choices ?? []) {
          if (!toolChoices.has(choice.index) && typeof choice.delta?.content === 'string')
            answers.set(choice.index, (answers.get(choice.index) ?? '') + choice.delta.content);
        }
        const rewritten = new Map<number, string>();
        for (const [index, answer] of answers) {
          const checked = withoutLeakedPlanning(answer);
          if ('planningOnly' in checked) throw Error('School provider answer was planning only');
          if (checked.text !== answer) rewritten.set(index, checked.text);
        }
        const emittedNames = new Set<string>(), emittedAnswers = new Set<number>();
        const encoder = new TextEncoder();
        for (const { frame, chunk } of frames) {
          let changed = false;
          for (const choice of chunk?.choices ?? []) {
            if (choice.delta && toolChoices.has(choice.index) && Object.hasOwn(choice.delta, 'content')) {
              delete choice.delta.content; changed = true;
            }
            if (choice.delta && rewritten.has(choice.index) && typeof choice.delta.content === 'string') {
              choice.delta.content = emittedAnswers.has(choice.index) ? '' : rewritten.get(choice.index)!;
              emittedAnswers.add(choice.index); changed = true;
            }
            for (const call of choice.delta?.tool_calls ?? []) {
              const key = `${choice.index}:${call.index}`;
              const name = offeredToolName(names.get(key) ?? '', offered);
              if (name && call.function && Object.hasOwn(call.function, 'name')) {
                if (emittedNames.has(key)) delete call.function.name;
                else { call.function.name = name; emittedNames.add(key); }
                changed = true;
              }
            }
          }
          controller.enqueue(encoder.encode((changed ? 'data: ' + JSON.stringify(chunk) : frame) + '\n\n'));
        }
        controller.close();
      } catch (error) {
        if (!cancelled) { failed(); controller.error(error); }
        await reader.cancel().catch(() => {});
      } finally { reader.releaseLock(); }
    },
    cancel(reason) { cancelled = true; return reader.cancel(reason); },
  });
  const headers = new Headers(response.headers);
  headers.delete('content-length'); headers.delete('content-encoding');
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}
