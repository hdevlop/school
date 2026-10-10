import { accepts } from '../jevDecision';
import type { JevDecision } from '../jevIntents';
import { countQueryVeto } from './countGuard';
import { schoolWriteRefusalKind } from '../../replies/schoolReplyWrite';

/** Query wording only: semantic vetoes, bounded aliases and positive reply vocabulary. */
const countChoices = new Set(['student_count', 'teacher_count', 'student_and_teacher_count']);
const readChoices = new Set([...countChoices, 'class_list', 'attendance_today', 'small_talk', 'upcoming_exams']);
const normalize = (text: string) => text.normalize('NFKD').toLowerCase().replace(/[\p{M}\u0640]/gu, '');
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
const words = (text: string) => normalize(text).match(/[\p{L}\p{N}]+/gu) ?? [];
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
function plainExcludedNamesCount(query: any, choice: any) {
  if (/["«»“”‘`()[\]{};]/u.test(query) || /(?:^|\s)['’]/u.test(query)) return false;
  const tokens = words(query);
  const excluded = (list: string[]) => list.length >= 2 && exclusions.has(list[0])
    && list.slice(1).every(token => excludedWords.has(token)) && list.slice(1).some(token => nameWords.has(token));
  const positive = (list: string[]) => list.length > 0 && list.every(token => positiveCountWords.has(token))
    && countCue.test(list.join(' ')) && (choice !== 'student_and_teacher_count'
      || dualCounts.test(list.join(' ')) || list.filter(token => countCue.test(token)).length >= 2);
  for (let cut = 1; cut < tokens.length; cut++) {
    if (excluded(tokens.slice(cut)) && positive(tokens.slice(0, cut))
      || excluded(tokens.slice(0, cut)) && positive(tokens.slice(cut))) return true;
  }
  return false;
}

/** Declines ambiguity; never changes a choice, score or refusal into a tool call. */
function semanticQueryVeto(query: any, choice: any) {
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
    const veto = countQueryVeto(query, choice);
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

const tokens = (text: string): string[] => normalize(text).match(/[\p{L}\p{N}]+/gu) ?? [];
const vocabulary = (...parts: string[]) => new Set(tokens(parts.join(' ')));
const tokenMatches = (word: string, allowed: Set<string>) => allowed.has(word)
  || ['و', 'ل', 'لل', 'ول', 'ولل'].some(prefix => word.startsWith(prefix) && allowed.has(word.slice(prefix.length)));
const common = `
  i me my we our you your please can could would give tell show display just only all whole entire complete
  the a an of in for at this school establishment institution current year now and both each separately without not
  je j ai aimerais voudrais veux tu peux pourrais me moi nous notre nos votre le la les l de d des du au aux un une
  et ou pour dans a en cette cet ce ici tout toute tous toutes seulement uniquement juste sans pas ni avec sur
  donne donner dis indique affiche afficher montre presente consulter connaitre savoir ecole scolaire etablissement institution
  global globale globaux complet complete total totaux ensemble annee actuellement maintenant details information informations
  cours cherche repondre par compte equipe enseignante personne c est que demande celui puis resumer besoin quel quels quelles
  هل يمكنك عرض تقدر توريني لدينا فيها يبلغ يوجد اجمالا اطلب ابحث عن معا ما
  خلال الحالية حاليا لهذه احتاج الى اخبرني باجمالي حصيلة على مستوى فالمؤسسة فهاد وصل حساب
  المسجلة المسجل المسجلين ف sana msjlin ra9m wsel lmo2assassa lia ar9am wa7d
  من في عندنا عندي هاد هذه لهذا هذي دابا الان كامل كاملة كاملا كاملين كلها كله جميع فقط غير بلا دون بدون وليس ماشي
  اريد اعرض اذكر اعطني اطلع الاطلاع معرفة المؤسسة الموسسة المدرسة بالمدرسة فالمدرسة مدرستنا لمؤسستنا مؤسسة مدرسة
  بغيت خاصني عطيني وريني قول قولي ليا لنا لي اللي هو هما هوما شنو شمن عافاك نعرف نشوف كاين كاينة كاينين كيقري ديال ديالنا ديالهم عندكم
  had hna daba li liya lina 3ndna 3ndi 3ndkom dyal dyalna dyalhom f fi mn w wa ghir bla machi
  ana bghit baghi khasni 3tini t3tini 3afak werini wrini werrini goul gouli chno chnou chmen chmn chkon chkoun
  t9der n3ref nchouf kayn kayna kaynin kaynnin kay9ri kol kamel kamla kamlin lmdrasa madrasa mdrasa lmo2assasa fiha homa
`;
const counts = vocabulary(common, `
  number numbers count counts many how enrollment enrolled pupils pupil students student teachers teacher
  nombre nombres chiffre chiffres effectif effectifs eleves eleve inscrits inscrites inscrit enseignant enseignants enseignante enseignantes prof professeur professeurs profs
  combien deux chacun sa ligne leur leurs noms nom liste listes repartition noms details detaillee detaillees t elle emploie avons
  عدد العدد عددي اعداد ارقام الارقام اجمالي الاجمالي الاجمالية اجماليا الكلي مجموع المجموع مجموعي شحال كم رقما رقم رقمين واحدا منفصلين منفصل مستقل سطر
  تلميذ تلميذا التلميذ تلميذة التلميذة تلاميذ التلاميذ للتلاميذ الطلاب طلاب طلبة الطلبة
  استاذ استاذا الاستاذ اساتذة الاساتذة والاساتذة الاساتذه مدرس مدرسا المدرس المدرسين للمدرسين والمدرسين معلمين المعلمين
  مسجل المسجل مسجلين المسجلين المسجلون العام السنة الدراسية لهاذ هذ بوحدو بجوج فينا
  لائحة اللائحة قائمة القائمة قوائم القوائم اسم الاسم الاسماء اسامي الاسامي السميات سميات سمياتهم اسمائهم سمية مفصلة تفصيلية تضم
  ch7al chhal l3adad 3adad a3dad l2ar9am ljmali lijmali mjmo3 majmou3 lmajmou3
  tlamid tlamd tilmid tilmida asatida lasatida ostad msjjel msjjelin l3am jouj bjouj bo7do bo7dhom
  smiyat smyathom smiyathom lista les classes tafsil mfassla ijmaliya كل واحد جوج الاعداد اعداد المسجلين جمع jm3
`);
const classes = vocabulary(common, `
  list lists names name classes class existing which what catalogue qui existent
  liste listes noms nom classes classe existantes existant quelles quels quelles sont sont noms existantes indiquant leurs exacts ligne ses sections
  لائحة اللائحة قائمة القائمة القائمة الكاملة اقسام الاقسام اقسامنا اسم اسماء اسامي الاسامي السميات الموجودة موجودة هما
  a9sam la9sam l2a9sam les classes lista lasami smiyat homa chmen chmn عدد العدد l3adad اسرد مع ذكر اسمائها كما هي بالسميات كيف ما
`);
const attendanceVocabulary = vocabulary(common, `
  attendance presence present presents absent absents absences today who is are status record report
  presence presences presents presentes absent absents absentes suivi situation jour aujourd hui etat qui est sont voir ouvrir
  سجل حالة الحضور حضور للحضور حاضر حاضرة حاضرين الحاضرين الحاضرون الحاضرات غايب غايبين غائب الغائبين الغائبون
  شكون وشكون والحاضرين والغائبين اليوم لليوم نهار داير كيف كيفاش تلميذ التلميذ تلاميذ التلاميذ لتلاميذ لجميع للتلاميذ تلاميذنا
  l7odour 7odour l7oudour ghayb ghayeb ghaybin 7ader 7adra 7adrin lyoum lyom llyoum nhar kif kifach dayr chkoun chkon
  feuille absences enregistrees enregistres date releves etats assiduite احتاج لكل دون تحديد قسم بلا قسم معين ورقة الغياب والغياب المسجلة سجلات حالات مواظبة المواظبة تسجلو
  pupils students eleves eleve tlamid tlamd tilmid tilmida liste list lists قائمة لائحة lista دون تصفية بلا حتى فلتر sans filtre
`);
const smallTalk = vocabulary(`
  hello hi hey thanks thank you goodbye bye good morning evening afternoon welcome please okay ok fine great
  how are can could what do does help assistant me i you your for with know explain briefly just wanted say greeting greetings
  bonjour salut coucou bonsoir merci beaucoup au revoir bonne journee bien aide ton ta toi votre c etait clair pour
  je j ai passe juste te saluer on se reparle une autre fois tu peux m expliquer brievement ce que sais faire comme assistant
  bon okay d accord ca va tres a d etre la m aider quels genres de demandes scolaires traiter espere vas aujourd hui viens dire
  مرحبا اهلا السلام عليكم سلام صباح الخير مساء شكرا شكرا لك على المساعدة مساعد كمساعد الشرح كان واضحا واضح
  الله يجازيك بخير هادشي اللي كنت محتاج محتاجة محتاجه واش نقدر نسولك على شي حاجة شنو تقدر تعاوني تعاونني فيه نتا
  بسلامة نتلاقاو غدا ان شاء الله مزيان بزاف ديالك جيت غير نسلم عليك ونمشي الى اللقاء نتحدث مرة اخرى لاحقا
  ما الذي تستطيع مساعدتي بصفتك مساعدا فيه بك اشكرك في هذه الدردشة نوع التي تقدمها لي هنا السلام ليك هاد فالدردشة تشرح ليا عليه اتمنى نتمنى تكون اليوم اردت فقط القاء التحية مسا
  salam 3likom sba7 lkhir msa lkhir lah allah yjazik bikhir hadchi li kent me7taj
  wach n9der nsowlek 3la chi 7aja chno t9der t3awenni fih nta ka lmousa3id
  bslama ntla9aw ghdda ghedda incha2allah nchallah mzyan bzaf bzzaf chokran 3la lmousa3ada
  jit ghir nsellem 3lik w nmchi chre7 dyalk wade7 chi merra okhra
  lik had lmosaa3ada f chat tchre7 lia 3lih hna ntmenna tkoun lyoum
`);
const countEvidence = vocabulary('number numbers count counts many nombre nombres chiffre chiffres effectif effectifs combien total totaux عدد العدد عددي اعداد الاعداد ارقام الارقام اجمالي الاجمالي باجمالي الاجمالية مجموع المجموع مجموعي شحال كم ch7al chhal l3adad 3adad a3dad l2ar9am mjmo3 majmou3 ijmaliya');
const classCue = vocabulary('classes class classe اقسام الاقسام اقسامنا a9sam la9sam l2a9sam');
const attendanceCue = vocabulary('attendance presence presences present presents presentes absent absents absentes assiduite حضور الحضور للحضور مواظبة المواظبة حاضر حاضرة الحاضرين الحاضرون غايب غايبين غائب الغائبين الغائبون l7odour 7odour l7oudour ghayb ghayeb ghaybin 7ader 7adra 7adrin');

/** Require positive wording evidence and retain unrecognized words in the explanation. */
function explainVocabularyVeto(query: any, choice: any) {
  const semanticVeto = semanticQueryVeto(query, choice);
  if (semanticVeto) return { veto: semanticVeto, unknownWords: [] };
  if (choice === 'write_request' || choice === 'needs_llm') return { veto: null, unknownWords: [] };
  if (typeof query !== 'string' || !query.trim()) return { veto: 'missing_query', unknownWords: [] };
  if (/["«»“”`()[\]{}]/u.test(query)) return { veto: 'quoted_or_structured_query', unknownWords: [] };
  let positiveText = normalize(query);
  if (['student_count', 'teacher_count', 'student_and_teacher_count'].includes(choice)) {
    // Remove only closed all-school/no-breakdown clauses that the semantic checks already accept.
    // An added class, subject, name or operation keeps the suffix intact.
    positiveText = positiveText
      .replace(/في\s+جميع\s+اقسام\s+(?:الموسسة|المدرسة)/gu, '')
      .replace(/(?:دون\s+تفصيل\s+حسب\s+الاقسام|بلا\s+تفصيل\s+ديال\s+الاقسام|bla\s+tafsil\s+dyal\s+les\s+classes|دون\s+تصنيف\s+حسب\s+المادة|بلا\s+ما\s+تفرقهم\s+ليا\s+على\s+حساب\s+المواد)[\s.!?؟,]*$/u, '');
    const originalWords = tokens(query);
    if (choice === 'teacher_count' && originalWords.some(word => ['inscrits', 'inscrites'].includes(word))) {
      return { veto: 'ambiguous_enrolled_subject', unknownWords: [] };
    }
    if (originalWords.includes('jm3') && (choice !== 'student_and_teacher_count'
      || !/kol\s+wa7d\s+bo7do/u.test(positiveText))) return { veto: 'ambiguous_combined_count', unknownWords: [] };
  } else if (choice === 'class_list') {
    positiveText = positiveText.replace(/دون\s+اسماء\s+تلاميذها[\s.!?؟,]*$/u, '');
  }
  const words = tokens(positiveText);
  let allowed: Set<string>, evidence: Set<string> | undefined;
  if (['student_count', 'teacher_count', 'student_and_teacher_count'].includes(choice)) {
    allowed = counts; evidence = countEvidence;
  } else if (choice === 'class_list') { allowed = classes; evidence = classCue; }
  else if (choice === 'attendance_today') { allowed = attendanceVocabulary; evidence = attendanceCue; }
  else if (choice === 'small_talk') { allowed = smallTalk; }
  else return { veto: 'unsupported_guard_choice', unknownWords: [] };
  const unknownWords = [...new Set(words.filter(word => !tokenMatches(word, allowed)))];
  if (!words.length || unknownWords.length) return { veto: 'outside_positive_reply_vocabulary', unknownWords };
  if (evidence && !words.some(word => tokenMatches(word, evidence))) return { veto: 'missing_positive_reply_evidence', unknownWords: [] };
  return { veto: null, unknownWords: [] };
}

const end = '[\\s.!?؟,]*$';

/** Bounded phrase aliases, not unknown-word deletion or entity normalization. */
function explainOrdinaryQueryVeto(query: any, choice: any) {
  const originalVeto = semanticQueryVeto(query, choice);
  if (originalVeto) return { veto: originalVeto, aliases: [], unknownWords: [] };
  if (typeof query !== 'string' || !query.trim() || /["«»“”`()[\]{}]/u.test(query)
    || !['small_talk', 'class_list', 'attendance_today', ...countChoices].includes(choice)) {
    return { ...explainVocabularyVeto(query, choice), aliases: [] };
  }
  let text = normalize(query);
  const aliases: string[] = [];
  const alias = (pattern: RegExp, replacement: string, name: string) => {
    const changed = text.replace(pattern, replacement);
    if (changed !== text) aliases.push(name);
    text = changed;
  };
  if (countChoices.has(choice)) {
    alias(/(?<!\p{L})(الموسسة|المدرسة|مدرستنا)\s+بالكامل(?!\p{L})/u, '$1 كاملة', 'whole_school');
    alias(new RegExp(`(?:دون|بدون)\\s+اي\\s+تفصيل${end}`, 'u'), 'دون details', 'no_details_arabic');
    alias(new RegExp(`بلا\\s+تفاصيل${end}`, 'u'), 'بلا details', 'no_details_darija');
    alias(new RegExp(`bla\\s+tafasil${end}`, 'u'), 'bla details', 'no_details_arabizi');
  }
  if (choice === 'student_and_teacher_count') {
    alias(/(?<!\p{L})جوج\s+اعداد\s+بوحدهم(?!\p{L})/u, 'جوج اعداد بوحدو', 'separate_numbers');
    alias(/(?<!\p{L})totaux\s+scolaires(?!\p{L})/u, 'totaux scolaire', 'school_totals');
    alias(new RegExp(`كل\\s+واحد\\s+فسطر${end}`, 'u'), 'كل واحد في سطر', 'separate_lines_arabic');
    alias(new RegExp(`kol\\s+wa7d\\s+f\\s+ster${end}`, 'u'), 'kol wa7d f سطر', 'separate_lines_arabizi');
    // The original semantic veto runs first. Actual arithmetic/combined-result requests
    // cannot be rescued by appending a negated operation to their end.
    alias(new RegExp(`بلا\\s+ما\\s+تجمع\\s+العددين${end}`, 'u'), '', 'no_combination_darija');
    alias(new RegExp(`bla\\s+ma\\s+tjme3\\s+l3adadin${end}`, 'u'), '', 'no_combination_arabizi');
  }
  if (choice === 'class_list') {
    alias(new RegExp(`sans\\s+autre\\s+information${end}`, 'u'), 'sans information', 'classes_only_french');
    alias(new RegExp(`بلا\\s+معلومات\\s+اخرى${end}`, 'u'), 'بلا information', 'classes_only_darija');
    alias(new RegExp(`bla\\s+ma3lomat\\s+okhra${end}`, 'u'), 'bla information', 'classes_only_arabizi');
  }
  if (choice === 'attendance_today') {
    alias(/(?<!\p{L})المدرسة\s+باكملها(?!\p{L})/u, 'المدرسة كلها', 'whole_school_attendance');
  }
  if (choice === 'small_talk') {
    alias(/^شكرا\s+لمساعدتك(?!\p{L})/u, 'شكرا على المساعدة', 'thanks_for_help');
  }
  return { ...explainVocabularyVeto(text, choice), aliases };
}

/** Closed unfiltered exam requests. Names, dates and extra clauses stay on the fallback. */
function examReplyKind(query: string): 'next' | 'list' | null {
  const text = normalize(query)
    .replace(/[.!?؟]+$/u, '').replace(/\s+/gu, ' ').trim();
  if (/^(?:امتى الفرض الجاي|imta lfard jay)$/u.test(text)) return 'next';
  if (/^(?:وريني التواريخ ديال الفروض الجايين فالمدرسة كاملة|werini tawarikh dyal lforod jayin f lmdrasa kamla|واش كاينين شي فروض هاد الايام الجاية|wach kaynin chi forod had liyam jaya|شنو هوما الامتحانات اللي جايين|ما هي الامتحانات القادمة)$/u.test(text)) return 'list';
  return null;
}

export function explainQueryVeto(query: any, choice: any) {
  if (choice === 'class_list' && typeof query === 'string') {
    // A bounded class-name synonym; keep every qualifier for the independent
    // positive vocabulary and ambiguity veto. Never delete unknown words.
    const named = query.replace(/(?<!\p{L})سميات(?!\p{L})/gu, 'أسماء');
    const result = explainOrdinaryQueryVeto(named, choice);
    return { ...result, aliases: named === query ? result.aliases : [...result.aliases, 'class_names_darija'] };
  }
  if (choice !== 'upcoming_exams') return explainOrdinaryQueryVeto(query, choice);
  const veto = semanticQueryVeto(query, choice);
  if (veto) return { veto, aliases: [], unknownWords: [] };
  return { veto: typeof query === 'string' && examReplyKind(query) ? null : 'unsupported_exam_request',
    aliases: [], unknownWords: [] };
}
export const queryVeto = (query: string, choice: string) => explainQueryVeto(query, choice).veto;

export function acceptsWithQueryGuard(decision: JevDecision, query: string, threshold = 0.8) {
  return accepts(decision, threshold, true) && queryVeto(query, decision.choice) === null;
}
