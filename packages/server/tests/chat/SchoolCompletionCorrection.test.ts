import { expect, test } from 'bun:test';
import { completionProblem, correctionNote, withCorrection } from '../../src/modules/chat/transport/schoolCompletionCorrection';
import { schoolChatFetch, schoolChatTransportContext, type SchoolChatTransportFrame } from '../../src/modules/chat/transport/SchoolChatTransport';

const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
const offered = new Set(['search_search_students', 'grades_get_by_student', 'sections_get_sections', 'exams_get_by_section']);
const request = {
  method: 'POST',
  body: JSON.stringify({
    model: 'openai/gpt-oss-20b',
    messages: [{ role: 'system', content: 'School rules.' }, { role: 'user', content: 'وريني نقط JEBARA RIMA' }],
    tools: [...offered].map(name => ({ type: 'function', function: { name } })),
  }),
};

const sse = (...chunks: object[]) => [...chunks.map(chunk => `data: ${JSON.stringify(chunk)}`), 'data: [DONE]'].join('\n\n') + '\n\n';
const answer = (content: string) => sse({ choices: [{ index: 0, delta: { content } }] });
const toolCall = (name: string) => sse({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'c1', type: 'function', function: { name, arguments: '{}' } }] } }] });
const stream = (text: string) => new Response(text, { headers: { 'content-type': 'text/event-stream' } });

/** A provider that returns the given completions in turn and records each request body. */
function provider(...completions: Response[]) {
  const bodies: any[] = [];
  const fetcher = schoolChatFetch((async (_url, init) => { bodies.push(JSON.parse(String(init?.body))); return completions.shift() ?? stream(answer('extra')); }) as typeof fetch);
  const frame: SchoolChatTransportFrame = { embeddingUrl: 'http://127.0.0.1:11434/v1/embeddings', calls: 0 };
  const call = () => schoolChatTransportContext.run(frame, async () => (await fetcher(endpoint, request)).text());
  return { bodies, frame, call };
}

test('recognises the completions worth one corrected request', () => {
  expect(completionProblem(toolCall('parents_get_my_identity'), offered)).toEqual({ kind: 'unoffered_tool', names: ['parents_get_my_identity'] });
  expect(completionProblem(toolCall('grades_get_by_student'), offered)).toBeNull();
  expect(completionProblem(toolCall('grades_get_by_student<|channel|>commentary'), offered)).toBeNull();
  expect(completionProblem(answer('bulletary to=functions.academic-dashboard_get_kpis'), offered)).toEqual({ kind: 'planning_only' });
  expect(completionProblem(answer('We need to call grades_get_by_student. Then answer.'), offered)).toEqual({ kind: 'planning_only' });
  expect(completionProblem(answer(''), offered)).toEqual({ kind: 'planning_only' });
  expect(completionProblem(answer("Pouvez-vous me préciser le nom complet de l'épreuve ou me donner son identifiant ?"), offered)).toEqual({ kind: 'asks_for_id' });
  expect(completionProblem(answer('عطيني المعرف ديال الامتحان؟'), offered)).toEqual({ kind: 'asks_for_id' });
});

test('ordinary answers and clarifying questions without an ID are kept', () => {
  expect(completionProblem(answer('ما كاينش نقط فالعربية عند JEBARA RIMA هاد العام.'), offered)).toBeNull();
  expect(completionProblem(answer('Moyenne : 8,03/10. ID de la section : LYJSo.'), offered)).toBeNull();
  expect(completionProblem(answer('Wach kat9sed CM1 A wla CM1 B?'), offered)).toBeNull();
});

test('the correction is added to the system message and names the offered tools', () => {
  const note = correctionNote({ kind: 'unoffered_tool', names: ['parents_get_my_identity'] }, offered);
  expect(note).toContain('parents_get_my_identity');
  expect(note).toContain('grades_get_by_student');
  const body = withCorrection(JSON.parse(request.body), note);
  expect(body.messages[0].content).toBe(`School rules.\n\n${note}`);
  expect(body.messages).toHaveLength(2);
  expect(withCorrection({ messages: [{ role: 'user', content: 'x' }] }, note).messages[0]).toEqual({ role: 'system', content: note });
});

test('an unusable completion is replaced by one corrected request', async () => {
  const p = provider(stream(toolCall('parents_get_my_identity')), stream(toolCall('search_search_students')));
  const text = await p.call();
  expect(p.bodies).toHaveLength(2);
  expect(p.bodies[1].messages[0].content).toContain('Correction:');
  expect(p.bodies[1].temperature).toBe(0);
  expect(text).toContain('search_search_students');
  expect(p.frame.calls).toBe(2);
});

test('a good completion is sent once and passed on unchanged', async () => {
  const p = provider(stream(answer('ريما عندها 8 نقط.')));
  expect(await p.call()).toContain('ريما عندها 8 نقط.');
  expect(p.bodies).toHaveLength(1);
});

test('only one correction per turn, and provider failures are never retried', async () => {
  const p = provider(stream(answer("Donnez-moi l'ID ?")), stream(answer("Donnez-moi l'ID ?")));
  await p.call();
  expect(p.bodies).toHaveLength(2);
  await p.call();
  expect(p.bodies).toHaveLength(3);

  const failing = provider(new Response('overloaded', { status: 503 }));
  await failing.call();
  expect(failing.bodies).toHaveLength(1);
  expect(failing.frame.failedGeneration).toBe(true);
});
