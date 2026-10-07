import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { validateCorpus } from './chatbot-scoring.mjs';
const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const factsPath = resolve(option('facts', 'docs/evidence/chatbot-latency/morocco-school-facts.json'));
const factsText = await Bun.file(factsPath).text();
const facts = JSON.parse(factsText);
const original = await Bun.file('datasets/chatbot-latency/questions.json').json();
if (!Number.isInteger(facts.studentCount) || !Number.isInteger(facts.teacherCount)
  || facts.academicYear !== original.academicYear || !Array.isArray(facts.classes) || !Array.isArray(facts.upcomingExams)) {
  throw new Error('Capture valid, current-year school facts first');
}
const cases = original.cases.filter((item) => ['ary', 'ar', 'fr'].includes(item.language)).map((item) => {
  const updated = { ...item };
  if (item.id.startsWith('student-count-')) updated.answerFacts = [String(facts.studentCount)];
  if (item.id.startsWith('teacher-count-')) updated.answerFacts = [String(facts.teacherCount)];
  if (item.id.startsWith('students-and-teachers-')) updated.answerFacts = [String(facts.studentCount), String(facts.teacherCount)];
  if (item.id.startsWith('classes-')) {
    updated.schoolFacts = { kind: 'classes', totalCount: facts.classes.length, records: facts.classes.map(({ name, sections }) => ({ name, sections })) };
    updated.storedNames = facts.classes.flatMap((row) => [row.name, row.description, row.level]).filter((name) => typeof name === 'string' && name.trim());
  }
  if (item.id.startsWith('upcoming-exams-')) {
    updated.schoolFacts = { kind: 'exams', totalCount: facts.upcomingExams.length, records: facts.upcomingExams.slice(0, 5) };
    updated.storedNames = [...new Set(facts.upcomingExams.flatMap((row) => [row.title, row.subject, row.class, row.section]))];
  }
  if (item.id.startsWith('missing-student-')) updated.storedNames = ['Zzbench Qqtest'];
  return updated;
});
const corpus = { version: 4, scope: 'Complete Moroccan school corpus: all ten original scenarios in Darija, Modern Standard Arabic and French. Exact stored names exempt from language scoring; per-row exam/class facts and successful-empty attendance wording required. Darija register checked heuristically.',
  role: 'admin', academicYear: facts.academicYear, factsCapturedAt: facts.capturedAt,
  factsSha256: createHash('sha256').update(factsText).digest('hex'), cases };
validateCorpus(corpus);
await Bun.write(resolve(option('output', 'datasets/chatbot-latency/morocco.json')), JSON.stringify(corpus, null, 2) + '\n');
console.log(JSON.stringify({ cases: cases.length, languages: ['ary', 'ar', 'fr'], factsSha256: corpus.factsSha256 }));
