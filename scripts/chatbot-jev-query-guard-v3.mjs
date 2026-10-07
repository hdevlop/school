/** Offline semantic veto candidate. Preserves measured scores and the v1/v2 guards. */
import { accepts } from './chatbot-jev.mjs';
import { countQueryVetoV2 } from './chatbot-jev-count-guard-v2.mjs';
import { schoolWriteRefusalKind } from '../packages/server/src/modules/chat/schoolReplyWrite.ts';

export const QUERY_GUARD_VERSION = 3;
const countChoices = new Set(['student_count', 'teacher_count', 'student_and_teacher_count']);
const readChoices = new Set([...countChoices, 'class_list', 'attendance_today', 'small_talk', 'upcoming_exams']);
const normalize = text => text.normalize('NFKD').toLowerCase().replace(/[\p{M}\u0640]/gu, '');
const students = /(?<![\p{L}\p{N}])(?:students?|pupils?|eleves?|(?:ال|وال|بال|لل|ولل|ل|و|ب)?(?:تلميذ|تلميذا|تلميذة|تلاميذ|طالب|طلاب|طلبة)|tilmid|tilmida|tlamid|tlamd)(?![\p{L}\p{N}])/u;
const teachers = /(?<![\p{L}\p{N}])(?:teachers?|enseignant(?:e)?s?|professeurs?|profs?|(?:ال|وال|بال|لل|ولل|ل|و|ب)?(?:استاذ|استاذا|اساتذة|مدرس|مدرسا|مدرسين|مدرسون|معلمين|معلمون)|ostad|asatida|lasatida)(?![\p{L}\p{N}])/u;
const arithmetic = /(?<![\p{L}\p{N}])(?:calculate|compute|add|sum|combine|multiply|divide|subtract|difference|average|ratio|percentage|additionne|additionner|calcule|calculer|soustrais|difference|moyenne|pourcentage|جمع|اجمع|احسب|اطرح|متوسط|نسبة|jme3|jma3|7seb|7ssab)(?![\p{L}\p{N}])|[+*/%=<>]/u;
const oneCombinedResult = /(?<![\p{L}\p{N}])(?:one\s+(?:number|total)|un\s+seul\s+(?:nombre|total)|رقم\s+واحد|المجموع|lmajmou3|ra9m\s+wa7ed)(?![\p{L}\p{N}])/u;
const dualCounts = /(?<![\p{L}\p{N}])(?:separate|separement|بوحدو|عددين|bo7do|jouj\s+a3dad|deux\s+(?:totaux|nombres)|both\s+(?:totals|counts))(?![\p{L}\p{N}])/u;
const classFilter = /(?<![\p{L}\p{N}])(?:class(?:es)?|classe(?:s)?|section(?:s)?|grade|(?:[فب]?ال)?(?:قسم|اقسام)|(?:ف?ال)(?:اول|ثاني|ثالث|رابع|خامس|سادس)|ابتدائي|ibtida2i|fl9ism|l9ism|9ism)(?![\p{L}\p{N}])/u;
const otherFilter = /(?<![\p{L}\p{N}])(?:girls?|boys?|female|male|gender|filles?|garcons?|maths?|mathematiques|subject|matiere|status|active|inactive|(?:ال)?(?:بنات|بنت|اولاد|ذكور|اناث|تلميذات|تلميذة|رياضيات)|bent|l?bnat|riyadiyat)(?![\p{L}\p{N}])/u;
const dateFilter = /\b\d{4}(?:[-/]\d{4})?\b|(?<![\p{L}\p{N}])(?:yesterday|last|previous|month|week|hier|passee?|precedente?|mois|semaine|البارح|الامس|الماضي|الماضية|فات|الشهر|الاسبوع|lbare7|chher|chhr|simana)(?![\p{L}\p{N}])/u;
const today = /(?<![\p{L}\p{N}])(?:today|aujourd['’]hui|du\s+jour|اليوم|لليوم|lyoum|lyom)(?![\p{L}\p{N}])/u;
const attendance = /(?<![\p{L}\p{N}])(?:absent|absents|present|presence|attendance|غياب|الغياب|غايب|غائب|غايبين|حاضر|غايب|ghayeb|ghaybin|7ader|7adra|l7oudour)(?![\p{L}\p{N}])/u;
const countCue = /(?<![\p{L}\p{N}])(?:combien|nombre|number|many|كم|شحال|عدد|العدد|ch7al|chhal|l3adad)(?![\p{L}\p{N}])/u;
const words = text => normalize(text).match(/[\p{L}\p{N}]+/gu) ?? [];
const exclusions = new Set(words('sans pas without not دون بدون بلا ماشي bla machi'));
const nameWords = new Set(words('name names list lists nom noms liste listes اسم الاسم أسماء الأسماء اسامي الاسامي سميات السميات سمياتهم لائحة اللائحة قائمة قوائم smiyat smiyathom smyathom lista'));
const excludedWords = new Set([...nameWords, ...words('de les la le leurs leur the their ديال ديالهم dyal dyalhom détaillée détaillées مفصلة تفصيلية mfassla')]);
const positiveCountWords = new Set(words(`
  je j ai besoin demande veux voudrais savoir connaitre donne dis moi tu peux seulement juste uniquement
  le la les l de d des du et ecole cette annee scolaire en cours pour a actuellement total totaux nombre nombres combien effectif global equipe enseignante
  eleve eleves enseignant enseignants enseignante professeur professeurs prof profs
  how many number students student teachers teacher whole school all enrolled this year only
  اريد اعطني معرفة الاجمالي الكلي كامل كاملين عددين مجموعي عدد العدد مجموع المجموع كم شحال من غير بغيت خاصني عطيني اللي عندنا ديال دابا المدرسة المؤسسة الموسسة فالمدرسة في هاد العام السنة لهذه هذه الان وليس
  التلميذ تلميذ تلميذا التلاميذ تلاميذ لتلاميذ الطلاب طلاب الطلبة طلبة الاستاذ استاذ استاذا الاساتذة اساتذة والاساتذة المدرسين للمدرسين
  bghit khasni 3tini ghir l3adad dyal tlamd tlamid tilmid asatida lasatida ostad w li kamel kamlin lmdrasa fiha mn f ch7al 3ndna daba l3am had hna mjmo3 jouj a3dad bo7do bjouj
`));
function plainExcludedNamesCount(query, choice) {
  if (/["«»“”‘`()[\]{};]/u.test(query) || /(?:^|\s)['’]/u.test(query)) return false;
  const tokens = words(query);
  const excluded = list => list.length >= 2 && exclusions.has(list[0])
    && list.slice(1).every(token => excludedWords.has(token)) && list.slice(1).some(token => nameWords.has(token));
  const positive = list => list.length > 0 && list.every(token => positiveCountWords.has(token))
    && countCue.test(list.join(' ')) && (choice !== 'student_and_teacher_count'
      || dualCounts.test(list.join(' ')) || list.filter(token => countCue.test(token)).length >= 2);
  for (let cut = 1; cut < tokens.length; cut++) {
    if (excluded(tokens.slice(cut)) && positive(tokens.slice(0, cut))
      || excluded(tokens.slice(0, cut)) && positive(tokens.slice(cut))) return true;
  }
  return false;
}

/** Declines ambiguity; never changes a choice, score or refusal into a tool call. */
export function queryVetoV3(query, choice) {
  if (!readChoices.has(choice)) return null;
  if (typeof query !== 'string' || !query.trim()) return 'missing_query';
  if (schoolWriteRefusalKind(query)) return 'explicit_school_write';
  const original = normalize(query);
  // Closed terminal exclusions remove no named class, code, date or operation.
  const text = /["«»“”‘`()[\]{};]/u.test(query) ? original : original
    .replace(/(?:دون\s+(?:تحديد\s+قسم|تفصيل\s+حسب\s+الاقسام)|بلا\s+(?:قسم\s+معين|تفصيل\s+ديال\s+الاقسام)|bla\s+tafsil\s+dyal\s+les\s+classes)[\s.!?؟,]*$/u, '')
    .replace(/(?:ماشي\s+العدد\s+ديالهم|machi\s+l3adad\s+dyalhom|pas\s+le\s+nombre)[\s.!?؟,]*$/u, '')
    .replace(/في\s+جميع\s+اقسام\s+(?:الموسسة|المدرسة)/gu, '');
  const separateCollection = choice === 'student_and_teacher_count' && /(?<![\p{L}\p{N}])(?:جمع|jme3|jma3)(?![\p{L}\p{N}])/u.test(text)
    && /(?<![\p{L}\p{N}])(?:بوحدو|bo7do)(?![\p{L}\p{N}])/u.test(text)
    && !oneCombinedResult.test(text)
    && !arithmetic.test(text.replace(/(?<![\p{L}\p{N}])(?:جمع|jme3|jma3)(?![\p{L}\p{N}])/gu, ''));
  if (arithmetic.test(text) && !separateCollection) return 'arithmetic_request';
  if (countChoices.has(choice)) {
    if (choice === 'student_and_teacher_count' && oneCombinedResult.test(text) && !dualCounts.test(text)) return 'single_combined_result';
    if (classFilter.test(text) || otherFilter.test(text) || dateFilter.test(text) || today.test(text) || attendance.test(text)) return 'qualified_count';
    const student = students.test(text), teacher = teachers.test(text);
    if (choice === 'student_count' && (!student || teacher)
      || choice === 'teacher_count' && (!teacher || student)
      || choice === 'student_and_teacher_count' && (!student || !teacher)) return 'count_subject_disagreement';
    const veto = countQueryVetoV2(query, choice);
    return veto === 'name_or_list_signal' && plainExcludedNamesCount(query, choice) ? null : veto;
  }
  if (choice === 'attendance_today' && (classFilter.test(text) || otherFilter.test(text) || dateFilter.test(text)
    || teachers.test(text) || countCue.test(text) || !today.test(text))) return 'qualified_attendance';
  if (choice === 'class_list' && (countCue.test(text) || otherFilter.test(text) || dateFilter.test(text)
    || students.test(text) || teachers.test(text) || /(?<![\p{L}\p{N}])(?:horaire|timetable|planning|رياضيات|riyadiyat)(?![\p{L}\p{N}])/u.test(text))) return 'qualified_class_list';
  if (choice === 'upcoming_exams' && (countCue.test(text) || classFilter.test(text) || otherFilter.test(text) || dateFilter.test(text))) return 'qualified_exam_request';
  if (choice === 'small_talk' && (students.test(text) || teachers.test(text) || attendance.test(text) || countCue.test(text))) return 'school_data_request';
  return null;
}

export function acceptsWithQueryGuardV3(decision, query, threshold = 0.8, policy = 'core') {
  return accepts(decision, threshold, true, policy) && queryVetoV3(query, decision.choice) === null;
}

export function compareQueryGuardV3(rows, { threshold = 0.8, policy = 'core' } = {}) {
  const before = rows.filter(row => accepts(row.decision, threshold, true, policy));
  const after = before.filter(row => acceptsWithQueryGuardV3(row.decision, row.item.query, threshold, policy));
  const declined = before.filter(row => !acceptsWithQueryGuardV3(row.decision, row.item.query, threshold, policy));
  const counts = subset => ({ samples: subset.length, questions: new Set(subset.map(row => row.item.id)).size,
    families: new Set(subset.map(row => row.item.familyId ?? row.item.id)).size,
    wrong: subset.filter(row => row.decision.choice !== row.item.intent).length });
  return { version: QUERY_GUARD_VERSION, before: counts(before), after: counts(after),
    preventedWrong: counts(declined.filter(row => row.decision.choice !== row.item.intent)),
    lostCorrect: counts(declined.filter(row => row.decision.choice === row.item.intent)),
    declined: declined.map(row => ({ id: row.item.id, repetition: row.repetition, label: row.item.intent,
      choice: row.decision.choice, reason: queryVetoV3(row.item.query, row.decision.choice) })),
    productionAcceptance: false, note: 'Post-result offline semantic veto candidate; finite patterns do not prove all remaining classifications correct.' };
}
