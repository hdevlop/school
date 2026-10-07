/** Offline candidate: v3 veto plus positive evidence in a closed reply vocabulary. */
import { accepts } from './chatbot-jev.mjs';
import { queryVetoV3 } from './chatbot-jev-query-guard-v3.mjs';

export const QUERY_GUARD_VERSION = 4;
const normalize = text => text.normalize('NFKD').toLowerCase().replace(/[\p{M}\u0640]/gu, '');
const tokens = text => normalize(text).match(/[\p{L}\p{N}]+/gu) ?? [];
const vocabulary = (...parts) => new Set(tokens(parts.join(' ')));
const tokenMatches = (word, allowed) => allowed.has(word)
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
  t9der n3ref nchouf kayn kayna kaynin kaynnin kay9ri kol kamel kamla kamlin lmdrasa lmo2assasa fiha homa
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
const attendance = vocabulary(common, `
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
const countCue = vocabulary('number numbers count counts many nombre nombres chiffre chiffres effectif effectifs combien total totaux عدد العدد عددي اعداد الاعداد ارقام الارقام اجمالي الاجمالي باجمالي الاجمالية مجموع المجموع مجموعي شحال كم ch7al chhal l3adad 3adad a3dad l2ar9am mjmo3 majmou3 ijmaliya');
const classCue = vocabulary('classes class classe اقسام الاقسام اقسامنا a9sam la9sam l2a9sam');
const attendanceCue = vocabulary('attendance presence presences present presents presentes absent absents absentes assiduite حضور الحضور للحضور مواظبة المواظبة حاضر حاضرة الحاضرين الحاضرون غايب غايبين غائب الغائبين الغائبون l7odour 7odour l7oudour ghayb ghayeb ghaybin 7ader 7adra 7adrin');

/** Payload-free callers can keep just veto; offline studies may inspect unknown tokens. */
export function explainQueryVetoV4(query, choice) {
  const oldVeto = queryVetoV3(query, choice);
  if (oldVeto) return { veto: oldVeto, unknownWords: [] };
  if (choice === 'write_request' || choice === 'needs_llm') return { veto: null, unknownWords: [] };
  if (typeof query !== 'string' || !query.trim()) return { veto: 'missing_query', unknownWords: [] };
  if (/["«»“”`()[\]{}]/u.test(query)) return { veto: 'quoted_or_structured_query', unknownWords: [] };
  let positiveText = normalize(query);
  if (['student_count', 'teacher_count', 'student_and_teacher_count'].includes(choice)) {
    // Remove only closed all-school/no-breakdown clauses that v3 already accepts.
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
  let allowed, evidence;
  if (['student_count', 'teacher_count', 'student_and_teacher_count'].includes(choice)) {
    allowed = counts; evidence = countCue;
  } else if (choice === 'class_list') { allowed = classes; evidence = classCue; }
  else if (choice === 'attendance_today') { allowed = attendance; evidence = attendanceCue; }
  else if (choice === 'small_talk') { allowed = smallTalk; }
  else return { veto: 'unsupported_guard_choice', unknownWords: [] };
  const unknownWords = [...new Set(words.filter(word => !tokenMatches(word, allowed)))];
  if (!words.length || unknownWords.length) return { veto: 'outside_positive_reply_vocabulary', unknownWords };
  if (evidence && !words.some(word => tokenMatches(word, evidence))) return { veto: 'missing_positive_reply_evidence', unknownWords: [] };
  return { veto: null, unknownWords: [] };
}

export const queryVetoV4 = (query, choice) => explainQueryVetoV4(query, choice).veto;

export function acceptsWithQueryGuardV4(decision, query, threshold = 0.8, policy = 'core') {
  return accepts(decision, threshold, true, policy) && queryVetoV4(query, decision.choice) === null;
}

export function compareQueryGuardV4(rows, { threshold = 0.8, policy = 'core' } = {}) {
  const before = rows.filter(row => accepts(row.decision, threshold, true, policy));
  const after = before.filter(row => acceptsWithQueryGuardV4(row.decision, row.item.query, threshold, policy));
  const declined = before.filter(row => !acceptsWithQueryGuardV4(row.decision, row.item.query, threshold, policy));
  const counts = subset => ({ samples: subset.length, questions: new Set(subset.map(row => row.item.id)).size,
    families: new Set(subset.map(row => row.item.familyId ?? row.item.id)).size,
    wrong: subset.filter(row => row.decision.choice !== row.item.intent).length });
  return { version: QUERY_GUARD_VERSION, before: counts(before), after: counts(after),
    preventedWrong: counts(declined.filter(row => row.decision.choice !== row.item.intent)),
    lostCorrect: counts(declined.filter(row => row.decision.choice === row.item.intent)),
    declined: declined.map(row => ({ id: row.item.id, repetition: row.repetition, label: row.item.intent,
      choice: row.decision.choice, reason: queryVetoV4(row.item.query, row.decision.choice) })),
    productionAcceptance: false, note: 'Post-result development candidate with positive evidence and closed vocabulary; not native accuracy or runtime integration.' };
}
