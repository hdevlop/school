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

test('an empty quiz list answered without reading the class exams is corrected once', () => {
  const read = (name: string, content: string, id = name) => [
    { role: 'assistant', content: null, tool_calls: [{ id, type: 'function', function: { name, arguments: '{"sectionId":"s1"}' } }] },
    { role: 'tool', tool_call_id: id, content },
  ];
  const turn = (...reads: object[][]) => ({ messages: [{ role: 'system', content: 'x' }, { role: 'user', content: 'CM1A' }, ...reads.flat()] });
  const none = answer('ما كاينش كويز فـ CM1 A.');
  const quizOffered = new Set([...offered, 'assessments_get_by_section', 'grades_get_by_exam']);
  expect(completionProblem(none, quizOffered, turn(read('assessments_get_by_section', '[]')))).toEqual({ kind: 'empty_quiz_list' });
  expect(completionProblem(none, quizOffered, turn(read('assessments_get_by_section', '{"data":[]}')))).toEqual({ kind: 'empty_quiz_list' });
  // The exams were read, the quiz list had records, or the exam list is not offered.
  expect(completionProblem(none, quizOffered, turn(read('assessments_get_by_section', '[]'), read('exams_get_by_section', '[]')))).toBeNull();
  expect(completionProblem(none, quizOffered, turn(read('assessments_get_by_section', '[{"id":"a1"}]')))).toBeNull();
  expect(completionProblem(none, new Set(['assessments_get_by_section']), turn(read('assessments_get_by_section', '[]')))).toBeNull();
  // An earlier turn's empty read does not count.
  const earlier = { messages: [...turn(read('assessments_get_by_section', '[]')).messages, { role: 'assistant', content: 'ما كاينش.' }, { role: 'user', content: 'merci' }] };
  expect(completionProblem(none, quizOffered, earlier)).toBeNull();
  const note = correctionNote({ kind: 'empty_quiz_list' }, quizOffered);
  expect(note).toContain('exams_get_by_section');
  expect(note).toContain('grades_get_by_exam');
});

test('"no results" said from the class exam list without reading them is corrected', () => {
  const read = (name: string, content: string) => [
    { role: 'assistant', content: null, tool_calls: [{ id: name, type: 'function', function: { name, arguments: '{}' } }] },
    { role: 'tool', tool_call_id: name, content },
  ];
  const turn = (...reads: object[][]) => ({ messages: [{ role: 'user', content: 'CM1A' }, ...reads.flat()] });
  const withResults = new Set([...offered, 'grades_get_by_exam']);
  const exams = read('exams_get_by_section', '[{"id":"e1","title":"Sciences"}]');
  for (const none of ['ما كاينش كويز فـ العلوم فـ CM1 A.', 'الإملاء مازال ما كاينش نتيجات.', 'Aucune note pour ce contrôle.'])
    expect(completionProblem(answer(none), withResults, turn(exams))).toEqual({ kind: 'results_not_read' });
  // Listing the exams, results already read, an empty exam list, or no results read offered.
  expect(completionProblem(answer('CM1 A: Sciences (2026-11-12), Anglais (2026-11-11).'), withResults, turn(exams))).toBeNull();
  expect(completionProblem(answer('ما كاينش نقط.'), withResults, turn(exams, read('grades_get_by_exam', '[]')))).toBeNull();
  expect(completionProblem(answer('ما كاينش امتحانات.'), withResults, turn(read('exams_get_by_section', '[]')))).toBeNull();
  expect(completionProblem(answer('ما كاينش كويز.'), offered, turn(exams))).toBeNull();
  expect(correctionNote({ kind: 'results_not_read' }, withResults)).toContain('grades_get_by_exam');
});

test('an answer that names tool IDs is planning, with or without offered tools', () => {
  const plan = 'الخطوة 1: تحقق من حساب ولي الأمر\n```\nparents_get_my_identity\n```\nالخطوة 4: student-profile_get_academic';
  expect(completionProblem(answer(plan), new Set())).toEqual({ kind: 'planning_only' });
  expect(completionProblem(answer('ريما جابت 10/10 فـ Mathématiques.'), new Set())).toBeNull();
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
