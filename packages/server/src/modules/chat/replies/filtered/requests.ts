import { canonical } from './records';
export const FILTERED_REPLY_VERSION = 6;
type Kind = 'girls' | 'maths-teachers' | 'parent-identity' | 'combined-total' | 'upcoming-exams'
  | 'monthly-exams' | 'large-classes' | 'all-classes' | 'fourth-maths-grades' | 'previous-year' | 'previous-month-absences' | 'teacher-count' | 'sixth-primary-count' | 'separate-counts' | 'reference-clarification';
// A closed request set: additional names, dates, classes, operations or quotes do not match.
const phrases: Record<Kind, string[]> = {
  'teacher-count': ['شحال من أستاذ كيقري فالمدرسة ديالنا دابا؟', 'ch7al mn ostad kay9erri f lmdrasa dyalna daba?',
    'شحال عندنا ديال الأساتذة فالمدرسة؟', 'ch7al 3ndna dyal lasatida f lmdrasa?',
    'عطيني غير العدد ديال الأساتذة، ماشي السميات ديالهم.', '3tini ghir l3adad dyal lasatida, machi smiyat dyalhom.',
    'الأساتذة ديالنا شحال هوما كاملين؟', 'lasatida dyalna ch7al homa kamlin?'],
  'separate-counts': ['عطيني عدد التلاميذ بوحدو وعدد الأساتذة بوحدو، ديال المدرسة كاملة.',
    '3tini 3adad tlamd bo7do w 3adad lasatida bo7do, dyal lmdrasa kamla.'],
  'reference-clarification': ['وبالنسبة لهادوك، شنو بان ليك؟', 'w b nnisba lhadok, chno ban lik?'],
  'sixth-primary-count': ['شحال من تلميذ كاين غير فالسادس ابتدائي؟', 'ch7al mn tilmid kayn ghir f ssadis ibtida2i?'],
  'monthly-exams': ['شحال من فرض عند التلاميذ هاد الشهر؟', 'ch7al mn fard 3nd tlamd had chher?'],
  'large-classes': ['شنو هما الأقسام اللي فيهم كثر من تلاتين تلميذ؟', 'chno homa l2a9sam li fihom kter mn tlatin tilmid?'],
  'all-classes': ['عطيني لائحة ديال الأقسام كاملين.', '3tini lista dyal l2a9sam kamlin.',
    'شنو هما الأقسام اللي عندنا فالمدرسة؟', 'chno homa l2a9sam li 3ndna f lmdrasa?',
    'وريني الأقسام ديال المدرسة.', 'werini l2a9sam dyal lmdrasa.',
    'شمن أقسام كاينين فالمدرسة؟', 'chmen a9sam kaynin f lmdrasa?'],
  'previous-month-absences': ['وريني الغياب ديال التلاميذ فالشهر اللي فات.', 'werini lghiyab dyal tlamd f chher li fat.'],
  'fourth-maths-grades': ['شنو هوما النقط ديال القسم الرابع فالرياضيات؟', 'chno homa nno9at dyal l9ism rrabi3 f riyadiyat?'],
  'previous-year': ['وشحال كانو العام اللي فات؟', 'w ch7al kano l3am li fat?'],
  'combined-total': ['جمع ليا عدد التلاميذ مع عدد الأساتذة وعطيني المجموع.',
    'jme3 liya 3adad tlamd m3a 3adad lasatida w 3tini lmajmou3.'],
  'upcoming-exams': ['واش كاينين شي فروض هاد الأيام الجاية؟', 'wach kaynin chi forod had liyam jaya?'],
  girls: ['شحال من بنت كاينة فالمدرسة؟', 'ch7al mn bent kayna f lmdrasa?',
    'كم عدد التلميذات في المدرسة؟', "Combien de filles sont inscrites dans l'école ?"],
  'maths-teachers': ['عطيني السميات ديال الأساتذة اللي كيقريو الرياضيات.',
    '3tini smiyat dyal lasatida li kay9erriw riyadiyat.',
    'اعرض أسماء أساتذة الرياضيات.', 'Liste les enseignants de mathématiques.'],
  'parent-identity': ['شحال خلص هاد الولي هاد الشهر؟', 'ch7al khelles had lwali had chher?',
    'كم دفع هذا الولي هذا الشهر؟', 'Combien ce parent a-t-il payé ce mois-ci ?'],
};
const requests = new Map(Object.entries(phrases).flatMap(([kind, texts]) =>
  texts.map(text => [canonical(text), kind as Kind] as const)));
export const schoolFilteredReplyKind = (query: string) => /[«»“”"`]/u.test(query) ? null : requests.get(canonical(query)) ?? null;
