/** Offline audit of selected Jev replies; never classifies or executes data tools. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { jevReplyPlan } from '../../src/modules/chat/jevReplyPlan';
import { schoolReplyLanguage } from '../../src/modules/chat/schoolReplyLanguage';
import { queryVetoV5, queryVetoV6 } from '../../src/modules/chat/jevQueryGuard';
import type { JevIntent } from '../../src/modules/chat/jevIntents';

if (import.meta.main) {
  const [runs, fixturePath, output, version = '5'] = process.argv.slice(2);
  if (!['5', '6'].includes(version)) throw Error('Use guard audit version 5 or 6');
  const queryVeto = version === '6' ? queryVetoV6 : queryVetoV5;
  if (!output || existsSync(output)) throw Error('Supply raw runs, fixture and new output');
  const corpusPath = 'datasets/chatbot-latency/darija-tool-selection-20261008.json';
  const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
  const segments = runs.split(',').map(path => JSON.parse(readFileSync(path, 'utf8')));
  const rows = segments.flatMap(segment => segment.rows);
  const attempts = segments.flatMap(segment => segment.attempts);
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8').replace(/^\uFEFF/, ''));
  const actual: Record<string, unknown> = Object.fromEntries(Object.entries(fixture).map(([tool, content]) =>
    [tool, JSON.parse((content as Array<{ type: string; text: string }>).find(part => part.type === 'text')!.text)]));
  const selected = attempts.filter(a => a.selected === 'template').map(attempt => {
    const row = rows.find(row => row.correlationId === attempt.correlationId);
    const item = corpus.cases.find((item: { id: string }) => item.id === row?.caseId);
    if (!row || !item) throw Error('Missing selected reply');
    const language = schoolReplyLanguage(item.query);
    if (!language) throw Error('Selected reply has unknown language');
    const plan = jevReplyPlan(attempt.choice, language, item.expectation.academicYear, version === '6' ? item.query : undefined,
      row.startedAt.slice(0, 10));
    if (!plan) throw Error('Selected unsupported intent');
    const expectedText = 'text' in plan ? plan.text : plan.render(plan.calls.map(call => {
      if (!Object.hasOwn(actual, call.name)) throw Error('Missing fixture data for '+call.name);
      return actual[call.name];
    }));
    return { caseId: row.caseId, choice: attempt.choice, expectedIntent: item.intent,
      queryGuardPassed: queryVeto(item.query, attempt.choice) === null,
      intentMatchesFrozenLabel: attempt.choice === item.intent,
      capturedAnswerMatchesScopedRenderer: row.text.trim() === expectedText.trim(),
      expectedText, capturedText: row.text };
  });
  const populated: Record<string, unknown> = {
    students_get_student_count: { count: 500 }, teachers_get_teacher_count: { count: 50 },
    classes_get_classes: [{ name: 'السادس ابتدائي', sections: [{ name: 'A' }, { name: 'B' }] },
      { name: 'الرابع ابتدائي', sections: [] }],
    attendance_get_today_students: ['present', 'absent', 'late'].map((status, index) => ({
      type: 'student', status, date: '2026-10-08', student: { name: ['سلمى', 'ياسين', 'أمين'][index], phone: 'private-phone' },
      class: { name: 'السادس ابتدائي' }, section: { name: 'A' }, notes: 'private-notes',
    })),
    exams_get_upcoming_exams: [
      { title: 'فرض الرياضيات', class: { name: 'السادس ابتدائي' }, section: { name: 'B' }, date: '2026-10-15', startTime: '10:00', endTime: '11:00' },
      { title: 'فرض العربية', class: { name: 'الرابع ابتدائي' }, section: { name: 'A' }, date: '2026-10-09', startTime: '08:30', endTime: '09:30' },
    ],
  };
  const intents: JevIntent[] = ['student_count', 'teacher_count', 'student_and_teacher_count', 'class_list', 'attendance_today',
    ...(version === '6' ? ['upcoming_exams' as const] : [])];
  const sampleReplies = intents.map(intent => {
    const plan = jevReplyPlan(intent, 'ary', '2026-2027', version === '6' ? 'إمتى الفرض الجاي؟' : undefined, '2026-10-08');
    if (!plan || 'text' in plan) throw Error('Expected read plan');
    const text = plan.render(plan.calls.map(call => populated[call.name]));
    const passed = intent === 'student_count' ? text.includes('500') && !text.includes('50 أستاذ')
      : intent === 'teacher_count' ? text.includes('50') && !text.includes('500')
      : intent === 'student_and_teacher_count' ? text.includes('500') && text.includes('50')
      : intent === 'class_list' ? text.includes('السادس ابتدائي: A, B') && text.includes('الرابع ابتدائي: ما كاين حتى شعبة مسجلة')
      : intent === 'upcoming_exams' ? text.includes('فرض العربية — الرابع ابتدائي / A — 2026-10-09 — 08:30–09:30') && !text.includes('فرض الرياضيات')
      : text.includes('سلمى — 2026-10-08 — حاضر') && text.includes('ياسين — 2026-10-08 — غايب')
        && text.includes('أمين — 2026-10-08 — جا معطل') && !text.includes('private');
    return { intent, calls: plan.calls, passed, text };
  });
  const declined = corpus.cases.filter((item: { intent: string }) => item.intent === 'needs_llm').flatMap((item: { id: string; query: string }) =>
    intents.map(choice => ({ caseId: item.id, injectedChoice: choice, veto: queryVeto(item.query, choice) })));
  const sources = [...runs.split(','), fixturePath, corpusPath, 'packages/server/src/modules/chat/jevReplyPlan.ts',
    'packages/server/src/modules/chat/schoolListReplies.ts', 'packages/server/src/modules/chat/schoolReplyTemplates.ts',
    'packages/server/src/modules/chat/schoolReplyLanguage.ts', 'packages/server/src/modules/chat/jevQueryGuard.ts',
    'packages/server/src/modules/chat/jevGuard/queryV3.ts', 'packages/server/src/modules/chat/jevGuard/queryV4.ts',
    'packages/server/src/modules/chat/jevGuard/queryV5.ts', import.meta.path];
  if (version === '6') sources.push('packages/server/src/modules/chat/jevGuard/queryV6.ts', 'packages/server/src/modules/chat/jevGuard/examsV6.ts');
  const report = { status: 'offline-scoped-and-populated-renderer-audit', paidRequests: 0,
    source: sources.map(path => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') })),
    guardVersion: Number(version), selectedReplies: selected.length, selectedRepliesPassed: selected.filter(row => row.queryGuardPassed
      && row.intentMatchesFrozenLabel && row.capturedAnswerMatchesScopedRenderer).length,
    populatedSamplesPassed: sampleReplies.filter(row => row.passed).length, populatedSamples: sampleReplies,
    unsupportedInjections: declined.length, unsupportedInjectionVetoes: declined.filter(row => row.veto !== null).length,
    selected, declined, productionAcceptance: false,
    limitations: ['Replays the renderer against the saved fixture snapshot; no populated live MCP or paid LLM filtering test.',
      'Populated samples cover supported unfiltered replies, not gender/subject/date-window filtering.',
      'Injection checks force unsupported choices to exercise the guard; they do not measure Jev classification accuracy.',
      'Fallback final answers and non-admin authorization are not qualified by this audit.'] };
  writeFileSync(output, JSON.stringify(report, null, 2)+'\n', { flag: 'wx' });
  console.log(JSON.stringify({ selected: report.selectedReplies, passed: report.selectedRepliesPassed,
    populatedPassed: report.populatedSamplesPassed, rejected: report.unsupportedInjectionVetoes, injections: report.unsupportedInjections }));
  if (report.selectedReplies !== report.selectedRepliesPassed || report.populatedSamplesPassed !== intents.length
    || report.unsupportedInjectionVetoes !== report.unsupportedInjections) process.exitCode = 1;
}
