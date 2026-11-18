import type { CompetencyDomain, CompetencyLevel } from '@sms/contracts';
import { LEVEL_RANK } from './competencyLevels';

/**
 * The remark book: what a teacher writes for the parents at the foot of the
 * pupil sheet, proposed from the month's levels so the teacher edits rather
 * than writes. Built on the school's own remarks (CP Arabic: "تواجه صعوبة في
 * التعرف على بعض الحروف وقراءتها…", "تحتاج إلى تحسين التحكم في القلم واحترام
 * اتجاه الكتابة") and the usual wording of Moroccan report cards.
 *
 * Parent remarks name observed skills and suggest one activity for the family.
 * `{masculine|feminine}` picks the pupil's form (يواجه|تواجه, Il|Elle).
 */
export type RemarkLanguage = 'ar' | 'fr';
export type RemarkGender = 'M' | 'F' | null | undefined;

/** A skill's topic, teacher support wording and optional home activity. */
type Entry = { topic: string; need?: string; activity?: string; practiceByLevel?: Partial<Record<CompetencyLevel, string>> };

const decimals: Entry = {
  topic: 'قراءة الأعداد العشرية ومقارنتها',
  activity: 'يمكن وضع 2,5 و2,05 في جدول المنازل، ثم مقارنة الرقمين في منزلة الأعشار لتحديد العدد الأكبر.',
};

const AR: Record<string, Entry> = {
  // اللغة العربية — the school's CP and CE2 grids first.
  'القراءة السليمة': {
    topic: 'التعرف على بعض الحروف وقراءتها بشكل صحيح',
    activity: 'يمكن اختيار حرف من الدرس والبحث عنه معًا في ثلاث كلمات ثم قراءتها بصوت مسموع.',
    need: '{يحتاج|تحتاج} إلى دعم ومواكبة فردية لتجاوز {صعوباته|صعوباتها} في التعرف على الحروف وقراءتها.',
  },
  'القراءة السليمة المعبرة': { topic: 'القراءة السليمة والمعبرة' },
  'القراءة المعبرة': { topic: 'القراءة المعبرة' },
  'فهم المسموع': { topic: 'فهم المسموع والتفاعل معه', activity: 'يمكن قراءة حكاية قصيرة بصوت مسموع، ثم الحديث معًا عمّا وقع في بدايتها ونهايتها.' },
  'فهم المقروء': { topic: 'فهم المقروء والإجابة عن الأسئلة', activity: 'بعد قراءة فقرة قصيرة، يمكن طرح سؤال والبحث معًا عن الجملة التي تتضمن الجواب.' },
  'فهم النص': { topic: 'فهم النص والإجابة عن الأسئلة' },
  'فهم أسئلة النص': { topic: 'فهم أسئلة النص والإجابة عنها' },
  'قيمة النص': { topic: 'استخلاص قيمة النص' },
  'التجزيء المقطعي': {
    topic: 'التعرف على المقاطع وتجزيء الكلمات',
    activity: 'يمكن اختيار كلمة من الدرس ونطقها ببطء مع التصفيق مرة لكل مقطع.',
    need: '{يحتاج|تحتاج} إلى مواكبة لتجاوز {صعوباته|صعوباتها} في التعرف على الحروف والمقاطع وكتابتها.',
  },
  'المرونة': { topic: 'القراءة بطلاقة واسترسال', activity: 'يمكن قراءة جملتين بالتناوب ثم إعادة قراءتهما مع مراعاة مواضع الوقف.' },
  'الخط': {
    topic: 'رسم بعض الحروف وكتابتها بالشكل الصحيح',
    activity: 'يمكن اختيار حرف من الكراسة وكتابته على السطر ثم مقارنة شكله بالنموذج.',
    need: '{يحتاج|تحتاج} إلى تحسين التحكم في القلم واحترام اتجاه الكتابة ومقاييس الحروف.',
  },
  'النقل': {
    topic: 'نقل الكلمات والجمل بشكل سليم',
    activity: 'يمكن نسخ جملة قصيرة ثم مقارنتها بالأصل كلمةً كلمة مع الانتباه للمسافات.',
    need: '{يحتاج|تحتاج} إلى مزيد من التمرن على النقل مع احترام السطر والمسافات بين الكلمات.',
  },
  'الإملاء': {
    topic: 'الربط بين الحرف والصوت والتمييز بين الحروف والحركات',
    activity: 'يمكن إملاء ثلاث كلمات من الدرس ثم مراجعة الحروف والحركات معًا.',
    need: '{يحتاج|تحتاج} إلى دعم في الربط بين الحرف والصوت المناسب له.',
  },
  'التعبير الكتابي': {
    topic: 'التعبير الكتابي وتركيب جمل سليمة',
    activity: 'يمكن اختيار صورة وكتابة جملتين تصفان ما يحدث فيها ثم قراءتهما معًا.',
    need: '{يحتاج|تحتاج} إلى أنشطة متنوعة ومتدرجة في التعبير الكتابي لتركيب جمل سليمة.',
  },
  'التراكيب': { topic: 'توظيف الظواهر التركيبية' },
  'النحو والتركيب': { topic: 'توظيف قواعد النحو والتركيب' },
  'الصرف والتحويل': { topic: 'تطبيق قواعد الصرف والتحويل' },
  'الأساليب': { topic: 'توظيف الأساليب المدروسة' },
  'الشكل': { topic: 'شكل أواخر الكلمات' },
  'تحليل النص واستثماره': { topic: 'تحليل النص واستثماره' },
  'تحليل النص': { topic: 'تحليل النص' },
  'تقويم النص وإبداء الرأي': { topic: 'تقويم النص وإبداء الرأي فيه' },
  'البلاغة': { topic: 'توظيف الظواهر البلاغية' },
  'توليد الأفكار وتنظيمها': { topic: 'توليد الأفكار وتنظيمها' },
  'احترام نمط النص': { topic: 'احترام نمط النص المطلوب' },
  'سلامة اللغة والأسلوب': { topic: 'سلامة اللغة والأسلوب' },
  'الاستماع والفهم': { topic: 'الاستماع والفهم' },
  'التعبير الشفهي': { topic: 'التعبير الشفهي بجمل سليمة' },
  'اكتساب المهارة': { topic: 'اكتساب مهارات التعبير' },
  'تطبيق المهارة': { topic: 'تطبيق مهارات التعبير' },
  'إنتاج نص متكامل': { topic: 'إنتاج نص متكامل' },
  // التربية الإسلامية
  'الحفظ': { topic: 'حفظ السور المقررة' },
  'التلاوة السليمة': { topic: 'تلاوة القرآن الكريم تلاوة سليمة' },
  'فهم المعاني': { topic: 'فهم معاني الآيات' },
  'التمثل': { topic: 'تمثل القيم المدروسة' },
  'التمثل في السلوك': { topic: 'تطبيق القيم في الحياة اليومية' },
  'معرفة الأحداث': { topic: 'معرفة أحداث السيرة النبوية' },
  'استخلاص القيم': { topic: 'استخلاص القيم' },
  'معرفة الأحكام': { topic: 'معرفة الأحكام المقررة' },
  'التطبيق العملي': { topic: 'التطبيق العملي للمعارف المكتسبة' },
  'معرفة الحقوق والواجبات': { topic: 'معرفة الحقوق والواجبات' },
  // الرياضيات (CE6, taught in Arabic)
  'الأعداد العشرية': decimals,
  'الاعداد العشرية': decimals,
  'الأعداد الكسرية': {
    topic: 'تمثيل الكسور ومقارنتها',
    activity: 'يمكن طيّ شريطين متساويين إلى أنصاف وأرباع، ثم وضع نصف الشريط الأول بجانب ربعين من الثاني ومقارنة الطولين.',
  },
  'قياس الأطوال والكتل والسعات والمساحة': {
    topic: 'اختيار الوحدة المناسبة للقياس',
    activity: 'يمكن اختيار الوحدة المناسبة لطول طاولة وكتلة تفاحة وسعة قارورة ومساحة صفحة، ثم تفسير كل اختيار.',
  },
  'قياس سعة التخزين الرقمي': {
    topic: 'مقارنة سعات التخزين الرقمي',
    activity: 'يمكن مقارنة حجم ملفين معروضين بالميغابايت وتحديد أيّهما يشغل مساحة أكبر وكم يبلغ الفرق بينهما.',
  },
  'الأعداد الصحيحة الطبيعية': {
    topic: 'قراءة الأعداد الصحيحة الطبيعية وكتابتها ومقارنتها',
    activity: 'يمكن كتابة عدد من ستة أرقام، ثم تفكيكه حسب المنازل وإعادة تركيبه.',
  },
  'الأعداد العشرية والكسور': {
    topic: 'التعامل مع الأعداد العشرية والكسور',
    activity: 'يمكن تقسيم شريط إلى عشرة أجزاء متساوية وتلوين ثلاثة منها، ثم كتابة الجزء الملوّن على شكل كسر وعدد عشري.',
  },
  'العمليات الأربع': {
    topic: 'إنجاز العمليات الأربع',
    activity: 'يمكن تقدير ناتج عملية قبل إنجازها، ثم مقارنة الناتج بالتقدير للتحقق منه.',
  },
  'الحساب الذهني': {
    topic: 'الحساب الذهني',
    activity: 'يمكن حساب 19 × 5 ذهنياً بحساب 20 × 5 ثم طرح 5، وشرح الخطوتين.',
  },
  'حل المسائل': {
    topic: 'حل المسائل',
    activity: 'في مسألة قصيرة، يمكن تحديد المطلوب، ورسم المعطيات، ثم التحقق من أن الجواب يجيب عن السؤال.',
  },
  'التوازي والتعامد': {
    topic: 'رسم المستقيمات المتوازية والمتعامدة',
    activity: 'يمكن رسم مستقيم ثم إنشاء عمودين عليه بالكوس، والتحقق من أن العمودين متوازيان.',
  },
  'الأشكال الهندسية': {
    topic: 'التعرف على الأشكال الهندسية وخاصياتها',
    activity: 'يمكن مقارنة شكلين من الدرس وتسمية خاصية مشتركة وخاصية تميّز أحدهما.',
  },
  'الإنشاءات الهندسية': {
    topic: 'الإنشاءات الهندسية',
    activity: 'يمكن رسم قطعة مستقيم بطول معلوم ثم إنشاء محورها بالمدور والمسطرة والتحقق من موضع منتصفها.',
  },
  'قياس الأطوال والكتل والسعات': {
    topic: 'قياس الأطوال والكتل والسعات والتحويل بين وحداتها',
    activity: 'يمكن قياس طول الطاولة بالسنتيمتر، ثم التعبير عن القياس نفسه بالمتر.',
  },
  'المحيط والمساحة': {
    topic: 'حساب المحيط والمساحة',
    activity: 'يمكن رسم مستطيل على ورق مربّع، ثم عدّ الوحدات حول حدوده لحساب محيطه والمربعات داخله لحساب مساحته.',
  },
  'المدة والزمن': {
    topic: 'حساب المدد وقراءة الزمن',
    activity: 'يمكن تحديد وقت الانطلاق والوصول على خط زمني وحساب المدّة على مرحلتين مروراً بالساعة الموالية.',
  },
  'قراءة الجداول والمبيانات': {
    topic: 'قراءة الجداول والمبيانات واستثمارها',
    activity: 'يمكن اختيار خانة في جدول، وتحديد سطرها وعمودها، ثم شرح ما يمثّله العدد فيها.',
  },
  'التناسبية والنسبة المئوية': {
    topic: 'التناسبية والنسبة المئوية',
    activity: 'يمكن حساب ثمن أربع قطع انطلاقاً من ثمن قطعتين، ثم إيجاد ثمن قطعة واحدة للتحقق.',
  },
  // الاجتماعيات
  'قراءة الخريطة': { topic: 'قراءة الخريطة' },
  'التموقع في الزمن': { topic: 'التموقع في الزمن' },
  'استثمار الوثائق': { topic: 'استثمار الوثائق' },
};

const FR: Record<string, Entry> = {
  // English classes use the school's French parent-facing wording.
  'Understanding simple instructions': { topic: 'la compréhension des consignes en anglais', activity: 'Donnez une consigne courte en anglais et invitez votre enfant à la réaliser.' },
  'Naming familiar things': { topic: 'le nom des objets familiers en anglais', activity: 'Choisissez trois objets de la maison et nommez-les ensemble en anglais.' },
  'Songs and rhymes': { topic: 'les comptines en anglais', activity: 'Reprenez une comptine de classe en alternant les vers avec votre enfant.' },
  'Learning new words': { topic: 'le vocabulaire anglais étudié en classe', activity: 'Associez trois mots du cours à des images, puis cachez les mots pour les retrouver.' },
  'Using words in context': { topic: 'l’emploi du vocabulaire anglais en contexte', activity: 'Choisissez un mot du cours et inventez ensemble une phrase qui l’utilise.' },
  'Recognizing letters and words': { topic: 'la reconnaissance des lettres et des mots en anglais', activity: 'Choisissez un mot du cours et retrouvez-le ensemble dans une phrase.' },
  'Copying words': { topic: 'la copie de mots en anglais', activity: 'Proposez un mot à copier, puis comparez la copie au modèle lettre par lettre.' },
  'Understanding spoken English': { topic: 'la compréhension de l’anglais oral', activity: 'Écoutez un court dialogue en anglais et relevez ensemble ce que demande chaque personne.' },
  'Speaking with confidence': { topic: 'la prise de parole en anglais', activity: 'Rejouez un dialogue du cours à deux, puis échangez les rôles.' },
  'Reading aloud': { topic: 'la lecture à voix haute en anglais', activity: 'Lisez une courte phrase à tour de rôle en marquant les pauses.' },
  'Understanding a text': { topic: 'la compréhension de textes en anglais', activity: 'Après un court passage, demandez à votre enfant de retrouver la phrase qui répond à une question.' },
  'Spelling': { topic: 'l’orthographe des mots anglais', activity: 'Choisissez trois mots du cours à écrire de mémoire, puis vérifiez-les ensemble.' },
  'Writing sentences': { topic: 'la rédaction de phrases en anglais', activity: 'Partez d’une phrase du cours et changez le sujet ou le verbe pour en écrire une autre.' },
  'Listening comprehension': { topic: 'la compréhension orale en anglais', activity: 'Écoutez un court dialogue en anglais et demandez à votre enfant d’en résumer l’idée principale.' },
  'Oral expression': { topic: 'l’expression orale en anglais', activity: 'Choisissez une image et invitez votre enfant à la décrire en deux phrases en anglais.' },
  'Reading comprehension': { topic: 'la compréhension des textes en anglais', activity: 'Après un court texte en anglais, demandez à votre enfant d’en résumer l’idée principale avec ses propres mots.' },
  'Guided writing': { topic: 'la rédaction guidée en anglais', activity: 'Reprenez une phrase modèle du cours et remplacez deux éléments pour rédiger une nouvelle phrase.' },
  'Free writing': { topic: 'la rédaction autonome en anglais', activity: 'Invitez votre enfant à raconter un moment de sa journée en trois phrases en anglais, puis à les relire.' },
  'Grammar': { topic: 'la grammaire anglaise', activity: 'Choisissez une phrase du cours et transformez-la en question, puis en phrase négative.' },
  'Vocabulary': { topic: 'le vocabulaire anglais', activity: 'Choisissez trois mots du cours et invitez votre enfant à employer chacun dans une phrase.' },
  'Pronunciation': { topic: 'la prononciation en anglais', activity: 'Écoutez une courte phrase en anglais, puis répétez-la en suivant le rythme et l’accent des mots.' },
  // Français — oral
  'Écouter et comprendre': {
    topic: 'la compréhension orale',
    need: 'Lisez une courte consigne à voix haute et invitez votre enfant à la reformuler.',
    practiceByLevel: {
      not_acquired: 'Dites « montre le crayon » et faites le geste ensemble.',
      beginning: 'Donnez deux consignes à la suite. Faites-les exécuter dans l’ordre.',
      in_progress: 'Lisez une consigne en deux étapes. Faites-la reformuler avant de commencer.',
    },
  },
  'Comprendre un message oral': {
    topic: 'la compréhension orale',
    need: 'Écoutez un court message et invitez votre enfant à en redire les deux idées principales.',
    practiceByLevel: {
      not_acquired: 'Écoutez une annonce courte et cherchez ensemble de qui elle parle.',
      beginning: 'Relisez une invitation. Faites relever à l’oral le lieu et l’heure.',
      in_progress: 'Faites écouter un message puis transmettre à quelqu’un les informations nécessaires pour agir.',
    },
  },
  'Comprendre un discours oral': {
    topic: 'la compréhension des discours oraux',
    practiceByLevel: {
      not_acquired: 'Écoutez le début d’un discours. Aidez votre enfant à en nommer le sujet.',
      beginning: 'Écoutez un court passage. Faites relever l’idée défendue et un exemple.',
      in_progress: 'Faites résumer un discours en distinguant la thèse et les arguments entendus.',
    },
  },
  "S'exprimer oralement": {
    topic: "l'expression orale",
    need: "{Il|Elle} doit prendre la parole plus souvent en classe et s'exprimer par des phrases complètes.",
    practiceByLevel: {
      not_acquired: 'Montrez une image et commencez « Je vois… ». Laissez votre enfant compléter.',
      beginning: 'Faites décrire une image en une phrase, puis préciser un détail.',
      in_progress: 'Faites raconter une scène en trois phrases à quelqu’un qui ne voit pas l’image.',
    },
  },
  "S'exprimer à l'oral (raconter, décrire)": {
    topic: "l'expression orale",
    need: "{Il|Elle} doit prendre la parole plus souvent en classe et s'exprimer par des phrases complètes.",
    practiceByLevel: {
      not_acquired: 'Choisissez une photo et nommez ensemble le lieu, les personnes et l’action.',
      beginning: 'Faites raconter un souvenir avec trois repères : d’abord, ensuite, enfin.',
      in_progress: 'Invitez votre enfant à raconter un événement puis à préciser un détail demandé par son auditeur.',
    },
  },
  'Prendre la parole': {
    topic: 'la prise de parole',
    need: '{Il|Elle} doit participer davantage et oser prendre la parole en classe.',
    practiceByLevel: {
      not_acquired: 'Préparez ensemble une phrase pour présenter un sujet familier, puis dites-la à voix haute.',
      beginning: 'Avec trois mots repères, faites présenter une idée et un exemple.',
      in_progress: 'Faites présenter un sujet sans lire, puis répondre à une question de l’auditeur.',
    },
  },
  'Débattre et argumenter': {
    topic: "l'argumentation à l'oral",
    practiceByLevel: {
      not_acquired: 'Sur un sujet familier, complétez ensemble « Je pense que… parce que… ».',
      beginning: 'Demandez un argument et un exemple à l’appui d’un avis.',
      in_progress: 'Proposez une objection. Faites-la reformuler avant d’y répondre avec un argument.',
    },
  },
  'Réciter une comptine ou un poème': {
    topic: 'la récitation',
    need: '{Il|Elle} doit apprendre ses comptines et ses poèmes à la maison.',
    practiceByLevel: {
      not_acquired: 'Dites un vers en frappant le rythme. Invitez votre enfant à le répéter.',
      beginning: 'Alternez les vers d’une comptine connue, puis échangez les rôles.',
      in_progress: 'Faites réciter une strophe de mémoire en marquant les pauses.',
    },
  },
  'Réciter un poème': {
    topic: 'la récitation',
    need: '{Il|Elle} doit apprendre ses poèmes à la maison et les réciter avec le ton.',
    practiceByLevel: {
      not_acquired: 'Lisez un vers en deux groupes de mots et faites répéter chaque groupe.',
      beginning: 'Cachez deux vers appris. Donnez le premier mot si votre enfant hésite.',
      in_progress: 'Faites réciter une strophe de mémoire, puis vérifier les mots oubliés dans le texte.',
    },
  },
  'Dire un poème': {
    topic: 'la récitation',
    need: '{Il|Elle} doit apprendre ses poèmes à la maison et les réciter avec le ton.',
    practiceByLevel: {
      not_acquired: 'Lisez deux vers ensemble et marquez au crayon les pauses à entendre.',
      beginning: 'Faites dire une strophe en appuyant sur un mot important dans chaque vers.',
      in_progress: 'Faites essayer deux intonations et expliquer laquelle convient le mieux au poème.',
    },
  },
  // Français — lecture
  'Reconnaître les sons et les lettres': {
    topic: 'la reconnaissance des sons et des lettres',
    need: "{Il|Elle} a besoin d'un accompagnement régulier pour associer chaque lettre à son son.",
    practiceByLevel: {
      not_acquired: 'Prononcez un son étudié et montrez la lettre qui le représente dans un mot connu.',
      beginning: 'Dites trois mots. Faites repérer celui qui commence par le son étudié et montrer sa lettre.',
      in_progress: 'Choisissez un son du cours. Faites trouver deux mots où il s’entend et repérer son écriture.',
    },
  },
  'Lire des syllabes et des mots': {
    topic: 'la lecture des syllabes et des mots',
    need: "{Il|Elle} doit s'entraîner chaque jour à lire des syllabes et des mots simples.",
    practiceByLevel: {
      not_acquired: 'Avec deux lettres déjà étudiées, faites entendre chaque son puis lisez la syllabe ensemble.',
      beginning: 'Écrivez deux syllabes connues sur des cartes. Faites-les lire puis assembler en un mot.',
      in_progress: 'Faites lire un mot nouveau composé de syllabes connues, puis le retrouver dans une phrase.',
    },
  },
  'Lire une phrase': {
    topic: 'la lecture de phrases',
    need: '{Il|Elle} doit lire chaque jour à voix haute pour gagner en aisance.',
    practiceByLevel: {
      not_acquired: 'Lisez une phrase courte en suivant chaque mot du doigt, puis relisez-la ensemble.',
      beginning: 'Faites lire une phrase du cahier et montrer le mot qui dit ce que fait le personnage.',
      in_progress: 'Faites lire à voix haute deux phrases nouvelles et expliquer le lien entre elles.',
    },
  },
  'Lire avec fluidité': {
    topic: 'la lecture fluide',
    need: '{Il|Elle} doit lire chaque jour à voix haute pour gagner en fluidité.',
    practiceByLevel: {
      not_acquired: 'Lisez une courte phrase en modèle, puis reprenez-la ensemble sans couper les mots.',
      beginning: 'Lisez une phrase à tour de rôle. Faites-la relire en regroupant les mots qui vont ensemble.',
      in_progress: 'Faites lire seul un court passage en respectant les pauses, puis reprendre une phrase hésitante.',
    },
  },
  'Lire de façon expressive': {
    topic: 'la lecture expressive',
    need: '{Il|Elle} doit lire à voix haute en respectant la ponctuation et le ton.',
    practiceByLevel: {
      not_acquired: 'Lisez la même phrase comme une question puis comme une affirmation. Faites imiter les deux voix.',
      beginning: 'Marquez les pauses d’un dialogue et lisez chacun le rôle d’un personnage.',
      in_progress: 'Faites lire un dialogue à deux voix et justifier une intonation par les mots du texte.',
    },
  },
  'Comprendre un texte lu': {
    topic: 'la compréhension des textes',
    need: "{Il|Elle} doit s'entraîner à relire le texte et à répondre aux questions avec précision.",
    practiceByLevel: {
      not_acquired: 'Lisez deux phrases et cherchez ensemble le nom du personnage.',
      beginning: 'Après une lecture courte, demandez qui agit et où. Faites montrer les mots qui renseignent.',
      in_progress: 'Faites raconter un épisode avec ses propres mots et retrouver la phrase qui confirme un détail.',
    },
  },
  'Comprendre un texte': {
    topic: 'la compréhension des textes',
    need: "{Il|Elle} doit s'entraîner à relire le texte et à repérer les informations importantes.",
    practiceByLevel: {
      not_acquired: 'Relisez un paragraphe ensemble et repérez qui fait quoi.',
      beginning: 'Posez une question sur le passage. Faites souligner la phrase qui donne la réponse.',
      in_progress: 'Demandez pourquoi le personnage agit ainsi. Faites appuyer la réponse sur deux indices du texte.',
    },
  },
  'Exploiter un texte': {
    topic: "l'exploitation des textes",
    practiceByLevel: {
      not_acquired: 'Lisez une question et repérez ensemble un mot qui aide à retrouver le bon passage.',
      beginning: 'Faites relever une information dans deux paragraphes puis les réunir en une réponse.',
      in_progress: 'Demandez une réponse justifiée par un court extrait et une explication personnelle.',
    },
  },
  'Lire et comprendre une œuvre': {
    topic: 'la lecture et la compréhension des œuvres',
    need: '{Il|Elle} doit lire davantage et régulièrement les œuvres au programme.',
    practiceByLevel: {
      not_acquired: 'Après une scène, notez ensemble les personnages présents et ce qui arrive.',
      beginning: 'Faites résumer un chapitre en reliant une décision du personnage à sa conséquence.',
      in_progress: 'Faites comparer deux moments de l’œuvre pour expliquer l’évolution d’un personnage.',
    },
  },
  'Identifier le genre et la structure du texte': {
    topic: "l'identification du genre et de la structure des textes",
    practiceByLevel: {
      not_acquired: 'Comparez un dialogue de théâtre et un récit. Repérez ensemble un indice visible de chaque genre.',
      beginning: 'Faites délimiter les étapes d’un texte et donner un titre à chacune.',
      in_progress: 'Faites justifier le genre d’un extrait par deux indices et expliquer le rôle de sa dernière partie.',
    },
  },
  'Interpréter et donner son avis': {
    topic: "l'interprétation des textes et l'expression d'un avis personnel",
    practiceByLevel: {
      not_acquired: 'Choisissez ensemble un passage marquant et complétez « Ce passage me fait penser à… ».',
      beginning: 'Faites formuler un avis sur un personnage et choisir une citation qui l’appuie.',
      in_progress: 'Proposez deux lectures possibles d’un passage. Faites défendre l’une à partir du texte.',
    },
  },
  // Français — écriture
  'Graphisme et tracé des lettres': {
    topic: 'le tracé des lettres',
    need: '{Il|Elle} doit améliorer la tenue du crayon et respecter le sens du tracé des lettres.',
    practiceByLevel: {
      not_acquired: 'Montrez le point de départ d’une lettre du cahier et suivez son tracé ensemble avec le doigt.',
      beginning: 'Faites tracer trois fois la lettre entre deux lignes, puis comparer avec le modèle.',
      in_progress: 'Faites écrire un mot contenant la lettre travaillée et vérifier sa taille et ses liaisons.',
    },
  },
  'Copie': {
    topic: 'la copie',
    need: "{Il|Elle} doit copier sans se presser, en respectant les lignes et l'espace entre les mots.",
    practiceByLevel: {
      not_acquired: 'Copiez un mot court ensemble, puis comparez chaque lettre au modèle.',
      beginning: 'Faites observer un groupe de mots, le cacher, le copier puis vérifier les espaces.',
      in_progress: 'Faites copier une phrase par groupes de mots, puis vérifier ponctuation et lettres oubliées.',
    },
  },
  'Écriture et copie': {
    topic: "l'écriture et la copie",
    need: '{Il|Elle} doit soigner son écriture et copier sans erreurs.',
    practiceByLevel: {
      not_acquired: 'Prenez un mot du texte et montrez comment le placer sur la ligne avant de le copier.',
      beginning: 'Faites copier une phrase en deux groupes, puis comparer chaque groupe au modèle.',
      in_progress: 'Faites copier trois lignes et retrouver seul un écart de lettre, d’accent ou de ponctuation.',
    },
  },
  'Dictée': {
    topic: 'la dictée',
    need: '{Il|Elle} doit mémoriser les mots étudiés et relire sa dictée avant de la rendre.',
    practiceByLevel: {
      not_acquired: 'Lisez un mot connu, repérez ensemble les lettres qui écrivent ses sons, puis cachez-le et dictez-le.',
      beginning: 'Dictez trois mots du cahier. Faites comparer au modèle et réécrire le mot corrigé.',
      in_progress: 'Dictez une courte phrase du cours. Faites vérifier les accords avant de montrer le modèle.',
    },
  },
  'Production écrite': {
    topic: 'la production écrite',
    need: "{Il|Elle} a besoin d'écrire régulièrement de courts textes en suivant la consigne.",
    practiceByLevel: {
      not_acquired: 'Choisissez une image et construisez ensemble une phrase avant de l’écrire.',
      beginning: 'Faites écrire deux phrases sur une scène en précisant qui agit et où.',
      in_progress: 'Faites raconter une courte suite d’actions, puis relire pour vérifier leur ordre.',
    },
  },
  'Planifier son texte': {
    topic: "l'organisation de ses idées à l'écrit",
    practiceByLevel: {
      not_acquired: 'À partir du sujet, notez ensemble trois idées en quelques mots.',
      beginning: 'Faites ranger trois idées dans un ordre qui répond à la consigne.',
      in_progress: 'Faites préparer un plan puis vérifier que chaque partie apporte une idée distincte.',
    },
  },
  'Rédiger selon la consigne': {
    topic: 'la rédaction selon la consigne',
    need: '{Il|Elle} doit lire attentivement la consigne avant de rédiger.',
    practiceByLevel: {
      not_acquired: 'Soulignez ensemble le verbe de la consigne et formulez une première phrase adaptée.',
      beginning: 'Faites rédiger un paragraphe en gardant sous les yeux deux exigences de la consigne.',
      in_progress: 'Faites relire le texte avec la consigne et modifier un passage pour mieux atteindre le but demandé.',
    },
  },
  'Réviser et corriger son texte': {
    topic: 'la relecture de ses écrits',
    need: "{Il|Elle} doit prendre l'habitude de relire et de corriger ses écrits.",
    practiceByLevel: {
      not_acquired: 'Relisez ensemble une phrase écrite et vérifiez la majuscule et le point.',
      beginning: 'Faites relire un paragraphe en vérifiant d’abord les accords, puis les mots oubliés.',
      in_progress: 'Demandez de choisir une phrase peu claire, de la reformuler puis de comparer les deux versions.',
    },
  },
  'Respecter la consigne': {
    topic: 'le respect de la consigne',
    need: '{Il|Elle} doit lire attentivement la consigne avant de rédiger.',
    practiceByLevel: {
      not_acquired: 'Entourez ensemble le verbe de la consigne et nommez le type de texte attendu.',
      beginning: 'Faites transformer la consigne en deux critères et vérifier le brouillon avec ces critères.',
      in_progress: 'Faites repérer un passage qui s’écarte du sujet et le réécrire en fonction du destinataire.',
    },
  },
  'Organiser son texte': {
    topic: "l'organisation de ses textes",
    practiceByLevel: {
      not_acquired: 'Donnez trois phrases mélangées. Retrouvez ensemble celle qui introduit le sujet.',
      beginning: 'Faites regrouper les phrases d’un brouillon par idée et choisir un ordre.',
      in_progress: 'Faites relire les débuts de paragraphes et retravailler une transition pour rendre le lien explicite.',
    },
  },
  'Correction de la langue': {
    topic: 'la correction de la langue écrite',
    need: "{Il|Elle} doit relire ses écrits pour corriger l'orthographe et les accords.",
    practiceByLevel: {
      not_acquired: 'Reprenez une phrase du brouillon. Repérez ensemble le sujet et le verbe, puis vérifiez l’accord.',
      beginning: 'Faites relire un paragraphe en cherchant un seul type d’erreur déjà étudié.',
      in_progress: 'Faites corriger deux erreurs différentes du brouillon et expliquer la règle utilisée pour chacune.',
    },
  },
  // Français — étude de la langue
  'La phrase': {
    topic: 'la construction de la phrase',
    practiceByLevel: {
      not_acquired: 'Remettez ensemble trois étiquettes dans l’ordre pour former une phrase simple.',
      beginning: 'Faites retrouver la majuscule et le point, puis lire la phrase entière.',
      in_progress: 'Donnez des mots mélangés. Faites écrire une phrase qui a du sens et vérifier ses limites.',
    },
  },
  'Les déterminants': {
    topic: "l'emploi des déterminants",
    practiceByLevel: {
      not_acquired: 'Montrez un objet, nommez-le avec son déterminant et faites répéter les deux mots ensemble.',
      beginning: 'Faites placer le, la ou les devant trois noms connus en s’aidant d’images.',
      in_progress: 'Faites passer deux groupes du singulier au pluriel et expliquer le changement de déterminant.',
    },
  },
  'Grammaire': {
    topic: 'la grammaire',
    need: "{Il|Elle} a besoin de revoir ses leçons de grammaire et de s'exercer régulièrement.",
    practiceByLevel: {
      not_acquired: 'Prenez une phrase du cahier. Repérez ensemble un exemple de la notion étudiée.',
      beginning: 'Faites transformer une phrase selon le modèle du cours et entourer ce qui change.',
      in_progress: 'Faites inventer une phrase illustrant la règle étudiée et expliquer le choix effectué.',
    },
  },
  'Conjugaison': {
    topic: 'la conjugaison',
    need: "{Il|Elle} doit apprendre ses conjugaisons et s'exercer régulièrement.",
    practiceByLevel: {
      not_acquired: 'Choisissez un verbe du cours et dites ensemble sa forme avec deux pronoms au temps étudié.',
      beginning: 'Faites changer le sujet d’une phrase et retrouver la forme du verbe dans le tableau du cours.',
      in_progress: 'Faites réécrire deux phrases au temps étudié, puis justifier les terminaisons.',
    },
  },
  'Orthographe': {
    topic: "l'orthographe",
    need: "{Il|Elle} doit apprendre l'orthographe des mots étudiés et relire ses écrits.",
    practiceByLevel: {
      not_acquired: 'Prenez un mot du cahier. Repérez ensemble la difficulté, cachez le mot puis réécrivez-le.',
      beginning: 'Faites classer trois mots selon la règle du cours et vérifier leur écriture dans le cahier.',
      in_progress: 'Faites corriger une phrase contenant la difficulté étudiée et expliquer la correction.',
    },
  },
  'Vocabulaire': {
    topic: 'le vocabulaire',
    need: '{Il|Elle} est {invité|invitée} à lire davantage pour enrichir son vocabulaire.',
    practiceByLevel: {
      not_acquired: 'Associez un mot de la leçon à un objet, une image ou un geste, puis redites-le ensemble.',
      beginning: 'Faites choisir le mot qui convient dans deux phrases et expliquer son sens.',
      in_progress: 'Faites employer deux mots proches dans des phrases qui montrent leur différence de sens.',
    },
  },
  'Lexique': {
    topic: 'le vocabulaire',
    need: '{Il|Elle} est {invité|invitée} à lire davantage pour enrichir son vocabulaire.',
    practiceByLevel: {
      not_acquired: 'Lisez un mot dans sa phrase et cherchez ensemble une reformulation simple.',
      beginning: 'Faites regrouper quatre mots autour d’un thème et expliquer le choix d’un mot.',
      in_progress: 'Faites remplacer un mot par un synonyme et expliquer la nuance dans le passage.',
    },
  },
  // Mathématiques — nombres et calcul
  'Compter et dénombrer': {
    topic: 'le dénombrement',
    activity: 'Faites compter quelques jetons en les déplaçant un par un, puis demandez combien il y en a en tout.',
    practiceByLevel: {
      not_acquired: 'Posez trois jetons. Touchez chacun avec votre enfant en disant un, deux, trois.',
      beginning: 'Faites compter cinq jetons en les déplaçant un par un. Demandez le total.',
      in_progress: 'Faites compter huit jetons, puis espacez-les. Demandez si le total a changé et pourquoi.',
    },
  },
  'Lire et écrire les nombres': {
    topic: "la lecture et l'écriture des nombres",
    activity: 'Dictez un nombre du cours. Faites-le écrire en chiffres, puis relire à voix haute.',
    practiceByLevel: {
      not_acquired: 'Montrez le chiffre 3, nommez-le ensemble, puis retrouvez-le parmi trois cartes.',
      beginning: 'Dictez un nombre du cours. Faites-le écrire avec une bande numérique comme appui.',
      in_progress: 'Dictez deux nombres comme 12 et 21. Faites-les écrire puis relire sans modèle.',
    },
  },
  'Lire, écrire et décomposer les nombres': { topic: "la lecture, l'écriture et la décomposition des nombres", need: "{Il|Elle} doit s'entraîner à lire, écrire et décomposer les nombres." },
  'Comparer et ranger les nombres': {
    topic: 'la comparaison et le rangement des nombres',
    activity: 'Faites ranger trois cartes numérotées du plus petit au plus grand, puis expliquer le premier choix.',
    practiceByLevel: {
      not_acquired: 'Alignez deux jetons face à trois jetons. Demandez de montrer où il y en a le plus.',
      beginning: 'Aidez votre enfant à placer 12 et 21 sur une bande numérique et à lire le plus grand.',
      in_progress: 'Faites ranger 12, 21 et 22, puis expliquer comment départager 21 et 22.',
    },
  },
  'Comparer, ranger et encadrer': { topic: 'la comparaison et le rangement des nombres' },
  'Additionner et soustraire': { topic: "l'addition et la soustraction", need: "{Il|Elle} doit s'entraîner régulièrement à l'addition et à la soustraction." },
  'Calcul mental': { topic: 'le calcul mental', need: '{Il|Elle} doit apprendre ses tables et pratiquer le calcul mental chaque jour.' },
  'Techniques opératoires': { topic: 'les techniques opératoires', need: '{Il|Elle} doit revoir les techniques opératoires et poser ses opérations avec soin.' },
  'Fractions et nombres décimaux': { topic: 'les fractions et les nombres décimaux', need: '{Il|Elle} doit revoir les fractions et les nombres décimaux par des exercices progressifs.' },
  'Résoudre un petit problème': {
    topic: 'la résolution de problèmes',
    activity: 'Proposez un petit achat. Faites dessiner les quantités, puis choisir l’opération.',
    practiceByLevel: {
      not_acquired: 'Posez deux jetons, ajoutez-en un et demandez combien il y en a maintenant.',
      beginning: 'Proposez un petit achat. Faites dessiner les quantités avant de chercher la réponse.',
      in_progress: 'Donnez un problème en une étape. Faites choisir une opération et vérifier le résultat.',
    },
  },
  'Résoudre des problèmes': {
    topic: 'la résolution de problèmes',
    need: "{Il|Elle} doit s'entraîner à bien lire et comprendre l'énoncé avant de résoudre un problème.",
  },
  'Problèmes à étapes': { topic: 'la résolution de problèmes à étapes', need: '{Il|Elle} doit apprendre à organiser sa démarche étape par étape.' },
  // Mathématiques — géométrie, mesure, données
  'Reconnaître les figures planes': {
    topic: 'la reconnaissance des figures',
    activity: 'Dessinez trois figures. Faites retrouver le triangle grâce à ses trois côtés, même en tournant la feuille.',
    practiceByLevel: {
      not_acquired: 'Montrez un triangle. Suivez ses trois côtés du doigt et retrouvez-le parmi deux figures.',
      beginning: 'Faites trier des triangles et des carrés en comptant leurs côtés.',
      in_progress: 'Faites retrouver un triangle tourné et expliquer pourquoi il reste un triangle.',
    },
  },
  'Reconnaître les formes géométriques': {
    topic: 'la reconnaissance des formes géométriques',
    activity: 'Tracez le contour de deux objets. Faites nommer les formes et montrer leurs côtés.',
    practiceByLevel: {
      not_acquired: 'Tracez le contour d’un couvercle rond. Faites retrouver ce contour parmi deux dessins.',
      beginning: 'Faites associer deux objets à des formes dessinées, puis nommer chaque forme.',
      in_progress: 'Faites comparer le contour d’un carré et celui d’un rectangle non carré. Que remarquez-vous sur leurs côtés ?',
    },
  },
  'Reconnaître et tracer les figures': { topic: 'le tracé des figures', need: '{Il|Elle} doit soigner ses tracés et bien utiliser ses instruments de géométrie.' },
  'Droites parallèles et perpendiculaires': { topic: 'le tracé des droites parallèles et perpendiculaires', need: "{Il|Elle} doit soigner ses tracés et bien utiliser l'équerre et la règle." },
  'Symétrie': { topic: 'la symétrie' },
  'Se repérer dans l’espace': { topic: "le repérage dans l'espace" },
  'Comparer et mesurer des longueurs': {
    topic: 'la mesure des longueurs',
    activity: 'Faites comparer deux crayons, puis mesurer chacun en plaçant une extrémité sur le zéro de la règle.',
    practiceByLevel: {
      not_acquired: 'Alignez les extrémités de deux crayons. Demandez de montrer le plus long.',
      beginning: 'Placez un crayon sur le zéro de la règle. Faites lire sa longueur en centimètres.',
      in_progress: 'Faites mesurer deux crayons et calculer leur différence de longueur en centimètres.',
    },
  },
  'Reconnaître la monnaie': { topic: 'la reconnaissance de la monnaie' },
  'Longueurs, masses et capacités': { topic: 'les mesures de longueurs, de masses et de capacités', need: '{Il|Elle} doit revoir les unités de mesure et leurs conversions.' },
  'Durées et monnaie': { topic: 'le calcul des durées et la monnaie' },
  'Périmètre et aire': { topic: "le calcul du périmètre et de l'aire" },
  'Lire un tableau simple': { topic: 'la lecture de tableaux' },
  'Lire un tableau ou un diagramme': { topic: 'la lecture de tableaux et de diagrammes', need: "{Il|Elle} doit s'entraîner à lire et à exploiter des tableaux et des diagrammes." },
  // Mathématiques — collège
  'Nombres décimaux et fractions': { topic: 'les nombres décimaux et les fractions', need: "{Il|Elle} doit revoir les règles de calcul sur les fractions et s'exercer régulièrement." },
  'Nombres relatifs': { topic: 'les nombres relatifs', need: "{Il|Elle} doit revoir les règles des signes et s'exercer régulièrement." },
  'Puissances': { topic: 'les puissances' },
  'Calcul littéral et équations': { topic: "le calcul littéral et la résolution d'équations", need: "{Il|Elle} doit revoir les règles du calcul littéral et s'entraîner à résoudre des équations." },
  'Figures et constructions': { topic: 'les constructions géométriques', need: '{Il|Elle} doit soigner ses constructions et justifier chaque étape.' },
  'Symétries': { topic: 'les symétries' },
  'Théorèmes (Thalès, Pythagore)': { topic: "l'application des théorèmes de Thalès et de Pythagore", need: "{Il|Elle} doit apprendre les théorèmes et s'entraîner à les appliquer." },
  'Proportionnalité': { topic: 'la proportionnalité' },
  'Fonctions': { topic: 'les fonctions' },
  'Organiser des données': { topic: "l'organisation des données" },
  'Moyenne et représentations': { topic: 'le calcul de la moyenne et la lecture des graphiques' },
  'Rédiger une démonstration': { topic: 'la rédaction des démonstrations', need: '{Il|Elle} doit apprendre ses propriétés et rédiger ses démonstrations avec rigueur.' },
};

const PHRASES = {
  ar: {
    coverage: (rated: number, total: number) => `عدد الكفايات المقيّمة هذا الشهر ${rated} من أصل ${total}.`,
    mastered: (topic: string) => `أظهر التقييم تمكّنًا من ${topic}.`,
    advanced: (topic: string) => `من نقاط القوة المسجّلة هذا الشهر ${topic}.`,
    developing: (topic: string) => `يتواصل التدرّب على ${topic}.`,
    support: (topic: string) => `يستدعي ${topic} مزيدًا من الدعم.`,
    allMastered: 'أظهر تقييم هذا الشهر تمكّنًا من جميع الكفايات المقررة.',
    extend: (topic: string) => `لتوسيع العمل على ${topic}، يمكن اختيار مثال جديد من الكراسة وشرح طريقة إنجازه.`,
    practice: (topic: string) => `للتدرّب على ${topic} في المنزل، يمكن مراجعة مثال من الدرس ثم تطبيقه في تمرين مشابه.`,
    need: '{يحتاج|تحتاج} إلى دعم ومواكبة في {topic}.',
    unknown: (name: string) => name,
  },
  fr: {
    coverage: (rated: number, total: number) => `Ce mois-ci, l’évaluation porte sur ${rated} compétence${rated > 1 ? 's' : ''} sur ${total}.`,
    mastered: (topic: string) => `Votre enfant maîtrise ${topic}.`,
    advanced: (topic: string) => `Votre enfant est à l’aise avec ${topic}.`,
    developing: (topic: string) => `Votre enfant consolide ${topic}.`,
    support: (topic: string) => `Votre enfant a besoin d’aide pour travailler ${topic}.`,
    allMastered: 'Votre enfant maîtrise toutes les compétences prévues pour ce mois.',
    extend: (topic: string) => `Pour aller plus loin, choisissez un autre exercice sur ${topic} et invitez votre enfant à expliquer sa réponse.`,
    practice: (topic: string) => `Pour travailler ${topic} à la maison, reprenez un exemple du cours, puis essayez ensemble un exercice similaire.`,
    need: "{Il|Elle} a besoin d'un accompagnement régulier dans {topic}.",
    unknown: (name: string) => `« ${name} »`,
  },
} as const;

/** Picks the pupil's form in `{masculine|feminine}`: feminine for a girl, masculine otherwise. */
export function agree(text: string, gender: RemarkGender) {
  return text.replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, masculine: string, feminine: string) => (gender === 'F' ? feminine : masculine));
}

type Rated = { name: string; rank: number; level: CompetencyLevel };

function entryFor(language: RemarkLanguage, name: string): Entry {
  const bank = language === 'ar' ? AR : FR;
  const key = name.trim();
  return Object.hasOwn(bank, key) ? bank[key] : { topic: PHRASES[language].unknown(key) };
}

/** A factual observation and one practice activity based on this pupil's rated skills for the month. */
export function proposeRemark({ domains, levelOf, gender, language }: {
  domains: readonly CompetencyDomain[];
  levelOf: (competencyId: string) => CompetencyLevel | null | undefined;
  gender: RemarkGender;
  language: RemarkLanguage;
}): string | null {
  let total = 0;
  let assessed = 0;
  let strongest: Rated | undefined;
  let weakest: Rated | undefined;
  for (const domain of domains) {
    total += domain.competencies.length;
    for (const item of domain.competencies) {
      const level = levelOf(item.id);
      if (!level) continue;
      assessed++;
      const rank = LEVEL_RANK[level];
      // Keep catalog order when several skills have the same level.
      if (!strongest || rank > strongest.rank) strongest = { name: item.name, rank, level };
      if (!weakest || rank < weakest.rank) weakest = { name: item.name, rank, level };
    }
  }
  if (!strongest || !weakest) return null;

  const phrases = PHRASES[language];
  const lines = assessed < total ? [phrases.coverage(assessed, total)] : [];
  const strength = entryFor(language, strongest.name);
  if (assessed === total && total > 1 && weakest.rank === LEVEL_RANK.mastered) {
    lines.push(phrases.allMastered);
  } else if (strongest.rank >= LEVEL_RANK.advanced) {
    lines.push(strongest.rank === LEVEL_RANK.mastered ? phrases.mastered(strength.topic) : phrases.advanced(strength.topic));
  }

  const focus = entryFor(language, weakest.name);
  if (weakest.rank <= LEVEL_RANK.in_progress) {
    lines.push(weakest.rank === LEVEL_RANK.in_progress ? phrases.developing(focus.topic) : phrases.support(focus.topic));
    // A neutral activity also works when the pupil's gender is unavailable.
    const need = focus.need;
    lines.push(focus.practiceByLevel?.[weakest.level] ?? focus.activity ?? (need && (gender || !need.includes('{')) ? agree(need, gender) : phrases.practice(focus.topic)));
  } else {
    lines.push(focus.activity ?? phrases.extend(focus.topic));
  }
  return lines.join('\n');
}

/** The book has its own sentence for this skill, rather than the general one. */
export const hasOwnRemark = (language: RemarkLanguage, name: string) => Object.hasOwn(language === 'ar' ? AR : FR, name.trim());

/** What helps with one skill, as the book writes it: the skill's own sentence, else the general one. */
export function skillNeed(language: RemarkLanguage, name: string, gender: RemarkGender, level?: CompetencyLevel | null) {
  const entry = entryFor(language, name);
  const activity = level && entry.practiceByLevel?.[level];
  if (activity) return activity;
  if (!gender && entry.need?.includes('{')) return entry.activity ?? PHRASES[language].practice(entry.topic);
  return agree(entry.need ?? entry.activity ?? PHRASES[language].need.replace('{topic}', () => entry.topic), gender);
}
