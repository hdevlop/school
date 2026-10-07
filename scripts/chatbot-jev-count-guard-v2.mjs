/** Offline candidate only. V1 and all measured decisions remain unchanged. */
import { accepts } from './chatbot-jev.mjs';
import { countQueryVeto, compareCountGuard } from './chatbot-jev-count-guard.mjs';

export const COUNT_GUARD_V2_VERSION = 2;
const normalize = text => text.normalize('NFKD').toLowerCase().replace(/[\p{M}\u0640]/gu, '');
const vocabulary = text => new Set(normalize(text).split(/\s+/u));
const nouns = vocabulary(`name names list lists nom noms liste listes
  اسم الاسم أسماء الأسماء أسمائهم أسماؤهم اسامي الاسامي سميات السميات سمياتهم
  لائحة اللائحة لوائح اللوائح قائمة القائمة قوائم القوائم
  smiyat smiyathom smyathom`);
const markers = vocabulary('pas sans not without دون بدون بلا ماشي ليس وليس bla machi');
const exclusionWords = new Set([...nouns, ...vocabulary(`de les la le leurs leur the their
  détaillée détaillées مفصلة تفصيلية dyalhom mfassla`)]);
const students = vocabulary('student students élève élèves تلميذ تلميذا التلميذ تلاميذ التلاميذ لتلاميذ طلاب الطلاب tilmid tlamid');
const teachers = vocabulary(`teacher teachers enseignant enseignants professeur professeurs prof profs
  أستاذ الأساتذة أساتذة مدرسين المدرسين المدرسون المدرسين والأساتذة والاساتذة asatida ostad`);
const cues = vocabulary('nombre nombres total totaux number many combien effectif effectifs عدد العدد مجموع المجموع مجموعي شحال كم l3adad mjmo3 ch7al chhal ra9m');
const dualCounts = vocabulary('totaux nombres effectifs عددين مجموعي jouj a3dad');
// Deliberately closed grammar: qualifiers, writes, dates and names are not
// discarded when evaluating an exception to the original name/list veto.
const countWords = new Set([...students, ...teachers, ...cues, ...vocabulary(`
  je j ai besoin demande veux voudrais savoir connaître donne moi seulement juste uniquement
  le la les l de d des du et ecole école compte t elle il combien sont inscrits inscrites
  général global tous toute entier entière cette année scolaire en cours pour à actuellement
  how of the school whole all enrolled this year only
  أريد معرفة الإجمالي الكلي كامل كاملين عددين التلاميذ والأساتذة والمدرسين
  المدرسة المؤسسة الآن عندنا دابا ديال بغيت خاصني من في فالمدرسة فيها تضم
  كنقلب على أبحث عن هذه السنة العام هاد الحالية المختارة وصل
  bghit khasni dyal les l kamel kamlin lmdrasa fiha mn f ch7al 3ndna daba wsel
  jouj a3dad w kan9elleb 3la mjmo3 l3am had hna`)]);

function isExclusion(words) {
  return words.length >= 2 && markers.has(words[0]) && words.slice(1).every(word => exclusionWords.has(word))
    && words.slice(1).some(word => nouns.has(word));
}

function isPlainCount(words, choice) {
  if (!words.length || !words.every(word => countWords.has(word)) || !words.some(word => cues.has(word))) return false;
  const hasStudents = words.some(word => students.has(word));
  const hasTeachers = words.some(word => teachers.has(word));
  return choice === 'student_count' ? hasStudents && !hasTeachers
    : choice === 'teacher_count' ? hasTeachers && !hasStudents
      : choice === 'student_and_teacher_count' && hasStudents && hasTeachers
        && (words.some(word => dualCounts.has(word)) || words.filter(word => cues.has(word)).length >= 2);
}

/** Exempt only one terminal/prefix exclusion plus a closed positive count request. */
export function countQueryVetoV2(query, choice) {
  const original = countQueryVeto(query, choice);
  if (original !== 'name_or_list_signal') return original;
  // Quoted command/name text and nested punctuation remain conservative. French
  // word elisions (l'école, d'élèves, j'ai) are allowed as grammar, not quotations.
  if (/["«»“”‘`()[\]{}+*/%=><|]|(?:^|\s)['’]/u.test(query)
    || /-/u.test(normalize(query).replace(/compte-t-elle|a-t-il/gu, ''))) return original;
  const words = normalize(query).match(/[\p{L}\p{N}]+/gu) ?? [];
  for (let cut = 1; cut < words.length; cut++) {
    if (isExclusion(words.slice(cut)) && isPlainCount(words.slice(0, cut), choice)
      || isExclusion(words.slice(0, cut)) && isPlainCount(words.slice(cut), choice)) return null;
  }
  return original;
}

export function acceptsWithCountGuardV2(decision, query, threshold, policy = 'core') {
  return accepts(decision, threshold, true, policy) && countQueryVetoV2(query, decision.choice) === null;
}

export function compareCountGuardV2(rows, { threshold = 0.8, policy = 'core' } = {}) {
  const baseline = compareCountGuard(rows, { threshold, policy });
  const before = rows.filter(row => accepts(row.decision, threshold, true, policy));
  const declined = before.filter(row => countQueryVetoV2(row.item.query, row.decision.choice) !== null);
  const after = before.filter(row => acceptsWithCountGuardV2(row.decision, row.item.query, threshold, policy));
  const counts = subset => ({ samples: subset.length, questions: new Set(subset.map(row => row.item.id)).size,
    wrongSamples: subset.filter(row => row.decision.choice !== row.item.intent).length,
    wrongQuestions: new Set(subset.filter(row => row.decision.choice !== row.item.intent).map(row => row.item.id)).size,
    acceptedFamilies: new Set(subset.map(row => row.item.familyId ?? row.item.id)).size });
  return { ...baseline, guardVersion: COUNT_GUARD_V2_VERSION, version1After: baseline.after,
    after: counts(after), preventedWrong: counts(declined.filter(row => row.decision.choice !== row.item.intent)),
    lostCorrect: counts(declined.filter(row => row.decision.choice === row.item.intent)),
    declined: declined.map(row => ({ id: row.item.id, repetition: row.repetition, label: row.item.intent,
      choice: row.decision.choice, previouslyCorrect: row.decision.choice === row.item.intent,
      reason: countQueryVetoV2(row.item.query, row.decision.choice) })),
    note: 'Post-result dev candidate: closed exclusion grammar only. Not a general count-intent validator, native acceptance or runtime integration.' };
}
