import 'reflect-metadata';
import { describe, expect, mock, test } from 'bun:test';
import {
  buildToolPickRequest, createJevToolReranker, parseToolPick, NO_TOOL, RERANK_FAILURE_COOLDOWN_MS, RERANK_FAILURES_BEFORE_COOLDOWN, type ToolCandidate,
} from '../../src/modules/chat/jev/JevToolReranker';
import { JEV_DECISIONS_URL, JEV_MODEL } from '../../src/modules/chat/jev/jevIntents';

const candidates: ToolCandidate[] = [
  { toolName: 'grades_get_by_student', description: "One student's marks", similarity: 0.82 },
  { toolName: 'grades_get_by_section', description: "A section's marks", similarity: 0.79 },
];
const query = 'bghit nno9at dyal 3ac2 f lfrançais';
const pick = (choice: string, confidence = 0.9, model = JEV_MODEL) =>
  ({ model, answers: { tool: { type: 'choice', choice, confidence } } });
const openRouter = { provider: 'openrouter', apiKey: 'private-test-key', baseUrl: null };

function reranker(answer: () => Response | Promise<Response>, settings: any = openRouter) {
  let clock = 1_000;
  const transport = mock(async (_url: any, _init?: any) => answer());
  const rerank = createJevToolReranker({ settings: async () => settings, transport: transport as any, now: () => clock });
  const ask = () => rerank({ query, candidates, signal: new AbortController().signal });
  return { ask, transport, advance: (ms: number) => { clock += ms; } };
}

describe('Jev as the tool reranker', () => {
  test('one request: the message, each candidate as a choice with its description, and none', () => {
    const body = buildToolPickRequest(query, candidates);
    expect(body.model).toBe(JEV_MODEL);
    expect(body.state).toBe(query);
    expect(body.questions.tool.type).toBe('choice');
    expect(body.questions.tool.criteria).toEqual({
      grades_get_by_student: "One student's marks",
      grades_get_by_section: "A section's marks",
      [NO_TOOL]: expect.any(String),
    });
  });

  test('a long description is cut, an empty one falls back to the tool name', () => {
    const body = buildToolPickRequest(query, [{ toolName: 'a', description: 'x'.repeat(900), similarity: 1 },
      { toolName: 'b', description: '', similarity: 1 }]);
    expect(body.questions.tool.criteria.a).toHaveLength(400);
    expect(body.questions.tool.criteria.b).toBe('b');
  });

  test('a pick names a candidate; none is null', () => {
    expect(parseToolPick(pick('grades_get_by_section', 0.91), candidates)).toEqual({ toolName: 'grades_get_by_section', confidence: 0.91 });
    expect(parseToolPick(pick(NO_TOOL, 0.6), candidates)).toEqual({ toolName: null, confidence: 0.6 });
  });

  test.each([
    ['an unknown tool', pick('fees_get_all')],
    ['another model', pick('grades_get_by_section', 0.9, 'other/model')],
    ['a confidence above 1', pick('grades_get_by_section', 1.2)],
    ['no answer', { model: JEV_MODEL, answers: {} }],
  ])('%s is refused', (_label, body) => {
    expect(() => parseToolPick(body, candidates)).toThrow();
  });

  test('sends the request to OpenRouter decisions with the key, no redirects and no data collection', async () => {
    const { ask, transport } = reranker(() => Response.json(pick('grades_get_by_section')));
    expect(await ask()).toEqual({ toolName: 'grades_get_by_section', confidence: 0.9 });
    const [url, init] = transport.mock.calls[0];
    expect(url).toBe(JEV_DECISIONS_URL);
    expect(init.redirect).toBe('error');
    expect(init.headers.authorization).toBe('Bearer private-test-key');
    const body = JSON.parse(init.body);
    expect(body.provider).toEqual({ data_collection: 'deny' });
    expect(Object.keys(body.questions.tool.criteria)).toContain('grades_get_by_student');
  });

  test.each([
    ['no settings', null],
    ['another provider', { provider: 'openai', apiKey: 'k', baseUrl: null }],
    ['no key', { provider: 'openrouter', apiKey: '', baseUrl: null }],
    ['another address', { provider: 'openrouter', apiKey: 'k', baseUrl: 'https://proxy.example/v1' }],
  ])('%s: no call, no pick', async (_label, settings) => {
    const { ask, transport } = reranker(() => Response.json(pick('grades_get_by_section')), settings);
    expect(await ask()).toBeNull();
    expect(transport).not.toHaveBeenCalled();
  });

  test.each([
    ['a refused request', () => new Response('{}', { status: 503 })],
    ['a malformed answer', () => Response.json(pick('fees_get_all'))],
    ['an oversized answer', () => new Response('x'.repeat(70_000))],
    ['a network error', () => { throw new Error('offline'); }],
  ])('%s gives no pick; three in a row skip Jev for the cooldown', async (_label, answer) => {
    const { ask, transport, advance } = reranker(answer);
    for (let i = 0; i < RERANK_FAILURES_BEFORE_COOLDOWN; i++) expect(await ask()).toBeNull();
    expect(await ask()).toBeNull();
    expect(transport).toHaveBeenCalledTimes(RERANK_FAILURES_BEFORE_COOLDOWN);
    advance(RERANK_FAILURE_COOLDOWN_MS);
    await ask();
    expect(transport).toHaveBeenCalledTimes(RERANK_FAILURES_BEFORE_COOLDOWN + 1);
  });

  test('one slow or failed call does not switch Jev off; a success resets the count', async () => {
    const answers = [() => { throw new Error('slow'); }, () => { throw new Error('slow'); },
      () => Response.json(pick('grades_get_by_section')), () => { throw new Error('slow'); }, () => { throw new Error('slow'); },
      () => Response.json(pick('grades_get_by_student'))];
    const { ask, transport } = reranker(() => answers.shift()!());
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await ask())?.toolName ?? null);
    expect(results).toEqual([null, null, 'grades_get_by_section', null, null, 'grades_get_by_student']);
    expect(transport).toHaveBeenCalledTimes(6);
  });

  test('aborted requests (najm-rag timed out) give no pick and count as failures', async () => {
    const transport = mock((_url: any, init: any) => new Promise<Response>((_, reject) => {
      if (init.signal.aborted) return reject(init.signal.reason);
      init.signal.addEventListener('abort', () => reject(init.signal.reason));
    }));
    const rerank = createJevToolReranker({ settings: async () => openRouter, transport: transport as any });
    for (let i = 0; i < RERANK_FAILURES_BEFORE_COOLDOWN; i++) {
      const controller = new AbortController();
      const answer = rerank({ query, candidates, signal: controller.signal });
      controller.abort();
      expect(await answer).toBeNull();
    }
    // Aborted before the call each time; the next message, on a fresh signal, is skipped by the cooldown.
    expect(await rerank({ query, candidates, signal: new AbortController().signal })).toBeNull();
    expect(transport).not.toHaveBeenCalled();
  });

  test('no candidates: no call', async () => {
    const transport = mock(async () => Response.json(pick(NO_TOOL)));
    const rerank = createJevToolReranker({ settings: async () => openRouter, transport: transport as any });
    expect(await rerank({ query, candidates: [], signal: new AbortController().signal })).toBeNull();
    expect(transport).not.toHaveBeenCalled();
  });
});
