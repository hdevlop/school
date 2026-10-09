import { schoolReplyLanguage } from '../replies/schoolReplyLanguage';

const normalizedHeader = 'x-school-chat-response-normalized';

/** This is a transport failure message, never a claim about school records. */
export function schoolChatFailureText(query: string): string {
  const language = schoolReplyLanguage(query);
  return language === 'ary' ? 'ما قدرتش نكمل الجواب دابا. عاود سولني، أو شوف المعطيات فلوحة التحكم.'
    : language === 'ar' ? 'تعذر إكمال الإجابة الآن. أعد المحاولة أو راجع البيانات في لوحة التحكم.'
      : language === 'fr' ? 'Je ne peux pas terminer la réponse pour le moment. Réessayez ou consultez les données dans le tableau de bord.'
        : /^(?:muestra|mu[eé]strame|cu[aá]ntos?|cu[aá]les?|dame|mis|quiero|hola)(?!\p{L})/iu.test(query.trim())
          ? 'No pude completar la respuesta. Inténtalo de nuevo o consulta los datos en el panel.'
          : 'I could not complete the reply. Try again or check the data in the dashboard.';
}

/** An actual failed read is visible even if a later model step recovers. */
export function schoolChatToolFailureText(query: string): string {
  const language = schoolReplyLanguage(query);
  return language === 'ary' ? 'شي محاولة لجلب المعطيات ما نجحاتش فهاد الجواب. ما نقدرش نأكد المعلومات اللي ما رجعاتش من قراءة ناجحة.'
    : language === 'ar' ? 'فشلت محاولة لجلب البيانات أثناء هذه الإجابة. لا يمكن تأكيد المعلومات التي لم تُرجعها قراءة ناجحة.'
      : language === 'fr' ? 'Une tentative de lecture a échoué pendant cette réponse. Les informations sans lecture réussie ne peuvent pas être confirmées.'
        : 'A data retrieval attempt failed during this reply. Information without a successful read cannot be confirmed.';
}

export function latestChatUserText(messages: unknown): string {
  if (!Array.isArray(messages)) return '';
  const message = [...messages].reverse().find(value => value?.role === 'user');
  const content = message?.parts ?? message?.content;
  return typeof content === 'string' ? content : Array.isArray(content)
    ? content.filter(part => part?.type === 'text' && typeof part.text === 'string').map(part => part.text).join(' ') : '';
}

export function schoolChatAllowanceText(query: string): string {
  const language = schoolReplyLanguage(query);
  return language === 'ary' ? 'وصلنا للميزانية الشهرية ديال المساعد. شوف المعطيات فلوحة التحكم.'
    : language === 'ar' ? 'بلغ المساعد الحد الشهري للميزانية. يرجى الاطلاع على البيانات في لوحة التحكم.'
      : language === 'fr' ? 'Le budget mensuel de l’assistant est atteint. Consultez les données dans le tableau de bord.'
        : 'The assistant monthly allowance is reached. Check the data in the dashboard.';
}

/**
 * Preserve the SDK stream; make empty completion and broken streams visible.
 * No generation retry, tools, persistence, year resolution or usage estimation.
 */
export function schoolChatResponse(response: Response, query: string, signal?: AbortSignal, budget?: { stopped?: string }): Response {
  if (response.headers.get(normalizedHeader) === 'v1'
    || !response.ok || !response.body || response.headers.get('x-vercel-ai-ui-message-stream') !== 'v1'
    || !response.headers.get('content-type')?.includes('text/event-stream')
    || response.headers.has('content-encoding')) return response;
  const reader = response.body.getReader(), decoder = new TextDecoder(), encoder = new TextEncoder();
  const failureText = () => budget?.stopped === 'allowance' ? schoolChatAllowanceText(query) : schoolChatFailureText(query);
  const partId = 'school-unavailable-' + crypto.randomUUID();
  const encodeEvent = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
  let buffer = '', oversized = false, hasText = false, hasStart = false, terminal = false, aborted = false, repaired = false;
  const failedCalls = new Set<string>();
  const maxFrameChars = 262144;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      let emitted = false;
      const emit = (value: string) => { if (value) { controller.enqueue(encoder.encode(value)); emitted = true; } };
      const notice = (message = failureText()) => {
        if (aborted || signal?.aborted || repaired) return;
        repaired = true;
        if (!hasStart) { emit(encodeEvent({ type: 'start', messageId: 'school-unavailable-' + crypto.randomUUID() })); hasStart = true; }
        emit(encodeEvent({ type: 'text-start', id: partId }));
        emit(encodeEvent({ type: 'text-delta', id: partId, delta: hasText ? '\n\n' + message : message }));
        emit(encodeEvent({ type: 'text-end', id: partId }));
      };
      const processFrame = (frame: string, separator: string) => {
        const data = frame.split(/\r?\n/u).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (data === '[DONE]') {
          if (!terminal && !aborted && !signal?.aborted) {
            notice(); emit(encodeEvent({ type: 'error', errorText: failureText() }));
          }
          terminal = true; emit(frame + separator); return;
        }
        let event: Record<string, unknown>;
        try { event = JSON.parse(data); } catch { emit(frame + separator); return; }
        if (!event || typeof event !== 'object') { emit(frame + separator); return; }
        if (event.type === 'start') hasStart = true;
        if (event.type === 'text-delta' && typeof event.delta === 'string' && event.delta.trim()) hasText = true;
        if (event.type === 'abort') aborted = true;
        if (!aborted && !signal?.aborted && (event.type === 'tool-input-error' || event.type === 'tool-output-error'
          || event.type === 'tool-output-available' && typeof event.output === 'string'
            && (/^Error \([A-Z_]+\):/u.test(event.output) || event.output === 'Tool execution failed'))) {
          // SDK errors may contain validation inputs or upstream bodies. Keep
          // the original stream shape but replace only its error description.
          failedCalls.add(typeof event.toolCallId === 'string' ? event.toolCallId : 'unknown');
          if (event.type !== 'tool-output-available') {
            emit(encodeEvent({ ...event, errorText: schoolChatToolFailureText(query) })); return;
          }
        }
        if (event.type === 'error' && !aborted && !signal?.aborted) {
          notice(); emit(encodeEvent({ ...event, errorText: failureText() })); return;
        }
        if (event.type === 'finish') {
          const unavailable = repaired || !hasText || event.finishReason === 'error';
          if ((unavailable || failedCalls.size) && !aborted && !signal?.aborted) {
            notice(unavailable ? failureText() : schoolChatToolFailureText(query));
            const metadata = event.messageMetadata && typeof event.messageMetadata === 'object' ? event.messageMetadata : {};
            emit(encodeEvent({ ...event, messageMetadata: { ...metadata, schoolReplyOutcome: unavailable ? 'unavailable' : 'tool_failure',
              ...(budget?.stopped === 'allowance' ? { schoolUnavailableReason: 'monthly_allowance' } : {}),
              ...(failedCalls.size ? { schoolFailedToolCalls: failedCalls.size } : {}) } }));
          } else emit(frame + separator);
          terminal = true; return;
        }
        emit(frame + separator);
      };
      const consume = (text: string) => {
        buffer += text;
        for (;;) {
          const delimiter = /\r?\n\r?\n/u.exec(buffer);
          if (!delimiter) break;
          const frame = buffer.slice(0, delimiter.index), separator = delimiter[0];
          buffer = buffer.slice(delimiter.index + separator.length);
          if (oversized) { emit(frame + separator); oversized = false; } else processFrame(frame, separator);
        }
        if (buffer.length > maxFrameChars) {
          if (!oversized && /^data:\s*\{\s*"type"\s*:\s*"tool-(?:input|output)-error"/u.test(buffer)) {
            // The SDK puts the event type first. Observe an oversized error
            // without accumulating its input/error body or reparsing it.
            failedCalls.add('oversized-error-' + failedCalls.size);
          }
          // Large tool payloads pass through without accumulating or parsing.
          // Unknown/large text frames conservatively count as visible output.
          if (!oversized && !/^data:\s*\{\s*"type"\s*:\s*"(?:tool-|data-)/u.test(buffer)) hasText = true;
          emit(buffer.slice(0, -3)); buffer = buffer.slice(-3); oversized = true;
        }
      };
      try {
        let part: Awaited<ReturnType<typeof reader.read>>;
        do {
          part = await reader.read();
          if (!part.done) consume(decoder.decode(part.value, { stream: true }));
        } while (!part.done && !emitted);
        if (!part.done) return;
        consume(decoder.decode());
        if (buffer) {
          if (oversized) emit(buffer);
          else {
            // A truncated final JSON event must not prevent the SDK from
            // reading the failure notice that follows it.
            const data = buffer.split(/\r?\n/u).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
            try { JSON.parse(data); processFrame(buffer, '\n\n'); } catch { if (data === '[DONE]') processFrame(buffer, '\n\n'); }
          }
          buffer = '';
        }
        if (!terminal && !aborted && !signal?.aborted) {
          notice(); emit(encodeEvent({ type: 'error', errorText: failureText() })); emit('data: [DONE]\n\n');
        }
        reader.releaseLock(); controller.close();
      } catch (error) {
        if (aborted || signal?.aborted) { controller.error(error); return; }
        notice(); emit(encodeEvent({ type: 'error', errorText: failureText() })); emit('data: [DONE]\n\n');
        void reader.cancel().catch(() => {}); controller.close();
      }
    },
    cancel(reason) { aborted = true; return reader.cancel(reason); },
  });
  const headers = new Headers(response.headers);
  // One normalizer owns notices across middleware and hot-reload module graphs.
  headers.set(normalizedHeader, 'v1');
  headers.delete('content-length');
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}
