/**
 * Planning picks a sub-subject ("Grammaire", "الإملاء") or a subject; its exam
 * is of that subject. A name typed before sub-subjects existed, or imported,
 * is only suggested a subject until it is added to Subjects.
 */
import { foldSubjectName as fold } from '@sms/contracts';

/** Words in a Planning name → words in the School subject's name, first match wins. */
const SUGGESTIONS: Array<[RegExp, string[]]> = [
  [/islam|اسلامي|قران|القران/, ['islam', 'اسلامي']],
  [/fini|artisti|art|plasti|dessin|فنيه|تشكيل/, ['artisti', 'arts', 'فنيه']],
  [/اجتماعيات|تاريخ|جغرافي|histoire|geograph|social/, ['histoire', 'social', 'اجتماعيات']],
  [/math|رياضيات|calcul|numer/, ['math', 'رياضيات']],
  [/scien|eveil|علوم|نشاط علمي/, ['scientifique', 'sciences', 'علوم']],
  [/angl|english|انجليزي/, ['anglais', 'english', 'انجليزي']],
  [/informat|robot|comput|معلوميات/, ['informat', 'معلوميات']],
  [/sport|بدنيه|رياضه/, ['physique et sport', 'sport', 'بدنيه']],
  [/grammaire|conjugaison|orthographe|dictee|vocabulaire|lexique|lecture|poesie|expression|production|comprehension|etude du son|etude de langue|son|francais|french/, ['francais', 'french', 'فرنسيه']],
];
const ARABIC = /[؀-ۿ]/;

export function suggestSubject(name: string, subjects: Array<{ id: string; name: string }>) {
  const folded = fold(name), named = subjects.map(subject => ({ ...subject, folded: fold(subject.name) }));
  const exact = named.find(subject => subject.folded === folded);
  if (exact) return exact.id;
  for (const [pattern, words] of SUGGESTIONS) {
    if (!pattern.test(folded)) continue;
    // Words in order of preference: "Sciences" in primary is Activité scientifique before SVT.
    for (const word of words) { const found = named.find(subject => subject.folded.includes(fold(word))); if (found) return found.id; }
  }
  // Any other Arabic row is the Arabic language (الإملاء, التعبير الكتابي, التطبيقات الكتابية…).
  if (ARABIC.test(name)) return named.find(subject => /العربيه|arab/.test(subject.folded))?.id ?? null;
  return null;
}

/** The subject a Planning name is an exam of: its sub-subject's subject, or the subject of that name. */
export function resolveSubject(name: string, subSubjects: Array<{ subjectId: string; name: string }>, subjects: Array<{ id: string; name: string }>) {
  const folded = fold(name);
  return subSubjects.find(part => fold(part.name) === folded)?.subjectId ?? subjects.find(subject => fold(subject.name) === folded)?.id ?? null;
}
