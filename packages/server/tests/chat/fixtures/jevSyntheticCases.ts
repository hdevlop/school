import type { JevIntent } from '../../../src/modules/chat/jev/jevIntents';
export { jevDarijaCases } from './jevDarijaCases';

/** Assistant-authored integration cases, not independent native qualification. */
export const jevSyntheticCases: Array<{ id: string; language: 'fr' | 'ar' | 'ary'; query: string; intent: JevIntent }> = [
  { id: 'fr-student', language: 'fr', query: 'Je voudrais connaître le nombre total d’élèves de notre école.', intent: 'student_count' },
  { id: 'fr-teacher', language: 'fr', query: 'Donne-moi le nombre global d’enseignants de l’école.', intent: 'teacher_count' },
  { id: 'fr-dual', language: 'fr', query: 'Je voudrais les deux nombres, élèves et enseignants, séparément.', intent: 'student_and_teacher_count' },
  { id: 'fr-classes', language: 'fr', query: 'Je voudrais connaître la liste complète des classes de l’école.', intent: 'class_list' },
  { id: 'fr-attendance', language: 'fr', query: 'Je voudrais voir les présences des élèves aujourd’hui pour toute l’école.', intent: 'attendance_today' },
  { id: 'fr-greeting', language: 'fr', query: 'Bonjour, merci pour votre aide.', intent: 'small_talk' },
  { id: 'fr-write', language: 'fr', query: 'Ajoute un élève nommé ZzJevDemo.', intent: 'write_request' },
  { id: 'fr-filter', language: 'fr', query: 'Quel est le nombre de filles en CE2 ?', intent: 'needs_llm' },
  { id: 'ar-student', language: 'ar', query: 'أريد معرفة العدد الإجمالي للتلاميذ في المدرسة.', intent: 'student_count' },
  { id: 'ar-teacher', language: 'ar', query: 'أعطني العدد الكلي للأساتذة في المدرسة بالكامل.', intent: 'teacher_count' },
  { id: 'ar-dual', language: 'ar', query: 'أريد عدد التلاميذ وعدد الأساتذة كل واحد في سطر.', intent: 'student_and_teacher_count' },
  { id: 'ar-classes', language: 'ar', query: 'أريد القائمة الكاملة لأقسام المدرسة.', intent: 'class_list' },
  { id: 'ar-attendance', language: 'ar', query: 'أريد عرض سجل الحضور لجميع التلاميذ اليوم.', intent: 'attendance_today' },
  { id: 'ar-greeting', language: 'ar', query: 'شكرا لمساعدتك.', intent: 'small_talk' },
  { id: 'ar-write', language: 'ar', query: 'أضف تلميذا اسمه ZzJevDemo.', intent: 'write_request' },
  { id: 'ar-filter', language: 'ar', query: 'كم عدد التلميذات في قسم CE2؟', intent: 'needs_llm' },
  { id: 'ary-student', language: 'ary', query: 'بغيت العدد ديال التلاميذ فهاد العام بلا تفاصيل.', intent: 'student_count' },
  { id: 'ary-teacher', language: 'ary', query: 'عطيني العدد ديال الأساتذة فالمدرسة كاملة.', intent: 'teacher_count' },
  { id: 'ary-dual', language: 'ary', query: 'بغيت العدد ديال التلاميذ والعدد ديال الأساتذة، كل واحد فسطر.', intent: 'student_and_teacher_count' },
  { id: 'ary-classes', language: 'ary', query: 'بغيت اللائحة ديال الأقسام كاملة بلا معلومات أخرى.', intent: 'class_list' },
  { id: 'ary-attendance', language: 'ary', query: 'وريني سجل الحضور ديال التلاميذ اليوم فالمدرسة كاملة.', intent: 'attendance_today' },
  { id: 'ary-greeting', language: 'ary', query: 'واش نقدر نسولك على شي حاجة؟', intent: 'small_talk' },
  { id: 'ary-write', language: 'ary', query: 'زيد تلميذ جديد سميتو ZzJevDemo فهاد المدرسة.', intent: 'write_request' },
  { id: 'ary-filter', language: 'ary', query: 'شحال من بنت كاينة فقسم CE2؟', intent: 'needs_llm' },
];
