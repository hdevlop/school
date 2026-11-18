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
type Entry = { topic: string; need?: string; activity?: string };

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
  'الأعداد الصحيحة الطبيعية': {
    topic: 'قراءة الأعداد الصحيحة الطبيعية وكتابتها ومقارنتها',
    need: '{يحتاج|تحتاج} إلى التمرن على قراءة الأعداد الكبيرة وكتابتها وتفكيكها.',
  },
  'الأعداد العشرية والكسور': {
    topic: 'التعامل مع الأعداد العشرية والكسور',
    need: '{يحتاج|تحتاج} إلى مراجعة الأعداد العشرية والكسور بأنشطة متدرجة.',
  },
  'العمليات الأربع': {
    topic: 'إنجاز العمليات الأربع',
    need: '{يحتاج|تحتاج} إلى مراجعة تقنيات العمليات الأربع والتمرن عليها بانتظام.',
  },
  'الحساب الذهني': {
    topic: 'الحساب الذهني',
    need: '{يحتاج|تحتاج} إلى حفظ جداول الضرب والتمرن على الحساب الذهني يوميا.',
  },
  'حل المسائل': {
    topic: 'حل المسائل',
    need: '{يحتاج|تحتاج} إلى مزيد من التمرن على قراءة المسائل وفهمها قبل حلها.',
  },
  'التوازي والتعامد': { topic: 'رسم المستقيمات المتوازية والمتعامدة' },
  'الأشكال الهندسية': { topic: 'التعرف على الأشكال الهندسية وخاصياتها' },
  'الإنشاءات الهندسية': {
    topic: 'الإنشاءات الهندسية',
    need: '{يحتاج|تحتاج} إلى العناية بالرسم واستعمال الأدوات الهندسية بشكل صحيح.',
  },
  'قياس الأطوال والكتل والسعات': {
    topic: 'قياس الأطوال والكتل والسعات والتحويل بين وحداتها',
    need: '{يحتاج|تحتاج} إلى مراجعة وحدات القياس والتحويل بينها.',
  },
  'المحيط والمساحة': { topic: 'حساب المحيط والمساحة' },
  'المدة والزمن': { topic: 'حساب المدد وقراءة الزمن' },
  'قراءة الجداول والمبيانات': { topic: 'قراءة الجداول والمبيانات واستثمارها' },
  'التناسبية والنسبة المئوية': { topic: 'التناسبية والنسبة المئوية' },
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
  'Écouter et comprendre': { topic: 'la compréhension orale', need: 'Lisez une courte consigne à voix haute et invitez votre enfant à la reformuler.' },
  'Comprendre un message oral': { topic: 'la compréhension orale', need: 'Écoutez un court message et invitez votre enfant à en redire les deux idées principales.' },
  'Comprendre un discours oral': { topic: 'la compréhension des discours oraux' },
  "S'exprimer oralement": { topic: "l'expression orale", need: "{Il|Elle} doit prendre la parole plus souvent en classe et s'exprimer par des phrases complètes." },
  "S'exprimer à l'oral (raconter, décrire)": { topic: "l'expression orale", need: "{Il|Elle} doit prendre la parole plus souvent en classe et s'exprimer par des phrases complètes." },
  'Prendre la parole': { topic: 'la prise de parole', need: '{Il|Elle} doit participer davantage et oser prendre la parole en classe.' },
  'Débattre et argumenter': { topic: "l'argumentation à l'oral" },
  'Réciter une comptine ou un poème': { topic: 'la récitation', need: '{Il|Elle} doit apprendre ses comptines et ses poèmes à la maison.' },
  'Réciter un poème': { topic: 'la récitation', need: '{Il|Elle} doit apprendre ses poèmes à la maison et les réciter avec le ton.' },
  'Dire un poème': { topic: 'la récitation', need: '{Il|Elle} doit apprendre ses poèmes à la maison et les réciter avec le ton.' },
  // Français — lecture
  'Reconnaître les sons et les lettres': {
    topic: 'la reconnaissance des sons et des lettres',
    need: "{Il|Elle} a besoin d'un accompagnement régulier pour associer chaque lettre à son son.",
  },
  'Lire des syllabes et des mots': { topic: 'la lecture des syllabes et des mots', need: "{Il|Elle} doit s'entraîner chaque jour à lire des syllabes et des mots simples." },
  'Lire une phrase': { topic: 'la lecture de phrases', need: '{Il|Elle} doit lire chaque jour à voix haute pour gagner en aisance.' },
  'Lire avec fluidité': { topic: 'la lecture fluide', need: '{Il|Elle} doit lire chaque jour à voix haute pour gagner en fluidité.' },
  'Lire de façon expressive': { topic: 'la lecture expressive', need: '{Il|Elle} doit lire à voix haute en respectant la ponctuation et le ton.' },
  'Comprendre un texte lu': { topic: 'la compréhension des textes', need: "{Il|Elle} doit s'entraîner à relire le texte et à répondre aux questions avec précision." },
  'Comprendre un texte': { topic: 'la compréhension des textes', need: "{Il|Elle} doit s'entraîner à relire le texte et à repérer les informations importantes." },
  'Exploiter un texte': { topic: "l'exploitation des textes" },
  'Lire et comprendre une œuvre': { topic: 'la lecture et la compréhension des œuvres', need: '{Il|Elle} doit lire davantage et régulièrement les œuvres au programme.' },
  'Identifier le genre et la structure du texte': { topic: "l'identification du genre et de la structure des textes" },
  'Interpréter et donner son avis': { topic: "l'interprétation des textes et l'expression d'un avis personnel" },
  // Français — écriture
  'Graphisme et tracé des lettres': {
    topic: 'le tracé des lettres',
    need: '{Il|Elle} doit améliorer la tenue du crayon et respecter le sens du tracé des lettres.',
  },
  'Copie': { topic: 'la copie', need: "{Il|Elle} doit copier sans se presser, en respectant les lignes et l'espace entre les mots." },
  'Écriture et copie': { topic: "l'écriture et la copie", need: '{Il|Elle} doit soigner son écriture et copier sans erreurs.' },
  'Dictée': { topic: 'la dictée', need: '{Il|Elle} doit mémoriser les mots étudiés et relire sa dictée avant de la rendre.' },
  'Production écrite': { topic: 'la production écrite', need: "{Il|Elle} a besoin d'écrire régulièrement de courts textes en suivant la consigne." },
  'Planifier son texte': { topic: "l'organisation de ses idées à l'écrit" },
  'Rédiger selon la consigne': { topic: 'la rédaction selon la consigne', need: '{Il|Elle} doit lire attentivement la consigne avant de rédiger.' },
  'Réviser et corriger son texte': { topic: 'la relecture de ses écrits', need: "{Il|Elle} doit prendre l'habitude de relire et de corriger ses écrits." },
  'Respecter la consigne': { topic: 'le respect de la consigne', need: '{Il|Elle} doit lire attentivement la consigne avant de rédiger.' },
  'Organiser son texte': { topic: "l'organisation de ses textes" },
  'Correction de la langue': { topic: 'la correction de la langue écrite', need: "{Il|Elle} doit relire ses écrits pour corriger l'orthographe et les accords." },
  // Français — étude de la langue
  'La phrase': { topic: 'la construction de la phrase' },
  'Les déterminants': { topic: "l'emploi des déterminants" },
  'Grammaire': { topic: 'la grammaire', need: "{Il|Elle} a besoin de revoir ses leçons de grammaire et de s'exercer régulièrement." },
  'Conjugaison': { topic: 'la conjugaison', need: "{Il|Elle} doit apprendre ses conjugaisons et s'exercer régulièrement." },
  'Orthographe': { topic: "l'orthographe", need: "{Il|Elle} doit apprendre l'orthographe des mots étudiés et relire ses écrits." },
  'Vocabulaire': { topic: 'le vocabulaire', need: '{Il|Elle} est {invité|invitée} à lire davantage pour enrichir son vocabulaire.' },
  'Lexique': { topic: 'le vocabulaire', need: '{Il|Elle} est {invité|invitée} à lire davantage pour enrichir son vocabulaire.' },
  // Mathématiques — nombres et calcul
  'Compter et dénombrer': { topic: 'le dénombrement', need: '{Il|Elle} a besoin de manipuler et de compter des objets pour consolider la notion de nombre.' },
  'Lire et écrire les nombres': { topic: "la lecture et l'écriture des nombres", need: "{Il|Elle} doit s'entraîner à lire et à écrire les nombres en chiffres et en lettres." },
  'Lire, écrire et décomposer les nombres': { topic: "la lecture, l'écriture et la décomposition des nombres", need: "{Il|Elle} doit s'entraîner à lire, écrire et décomposer les nombres." },
  'Comparer et ranger les nombres': { topic: 'la comparaison et le rangement des nombres' },
  'Comparer, ranger et encadrer': { topic: 'la comparaison et le rangement des nombres' },
  'Additionner et soustraire': { topic: "l'addition et la soustraction", need: "{Il|Elle} doit s'entraîner régulièrement à l'addition et à la soustraction." },
  'Calcul mental': { topic: 'le calcul mental', need: '{Il|Elle} doit apprendre ses tables et pratiquer le calcul mental chaque jour.' },
  'Techniques opératoires': { topic: 'les techniques opératoires', need: '{Il|Elle} doit revoir les techniques opératoires et poser ses opérations avec soin.' },
  'Fractions et nombres décimaux': { topic: 'les fractions et les nombres décimaux', need: '{Il|Elle} doit revoir les fractions et les nombres décimaux par des exercices progressifs.' },
  'Résoudre un petit problème': { topic: 'la résolution de problèmes', need: "{Il|Elle} doit s'entraîner à lire l'énoncé et à chercher la bonne opération." },
  'Résoudre des problèmes': {
    topic: 'la résolution de problèmes',
    need: "{Il|Elle} doit s'entraîner à bien lire et comprendre l'énoncé avant de résoudre un problème.",
  },
  'Problèmes à étapes': { topic: 'la résolution de problèmes à étapes', need: '{Il|Elle} doit apprendre à organiser sa démarche étape par étape.' },
  // Mathématiques — géométrie, mesure, données
  'Reconnaître les figures planes': { topic: 'la reconnaissance des figures' },
  'Reconnaître et tracer les figures': { topic: 'le tracé des figures', need: '{Il|Elle} doit soigner ses tracés et bien utiliser ses instruments de géométrie.' },
  'Droites parallèles et perpendiculaires': { topic: 'le tracé des droites parallèles et perpendiculaires', need: "{Il|Elle} doit soigner ses tracés et bien utiliser l'équerre et la règle." },
  'Symétrie': { topic: 'la symétrie' },
  'Se repérer dans l’espace': { topic: "le repérage dans l'espace" },
  'Comparer et mesurer des longueurs': { topic: 'la mesure des longueurs' },
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

type Rated = { name: string; rank: number };

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
      if (!strongest || rank > strongest.rank) strongest = { name: item.name, rank };
      if (!weakest || rank < weakest.rank) weakest = { name: item.name, rank };
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
    lines.push(focus.activity ?? (need && (gender || !need.includes('{')) ? agree(need, gender) : phrases.practice(focus.topic)));
  } else {
    lines.push(focus.activity ?? phrases.extend(focus.topic));
  }
  return lines.join('\n');
}

/** The book has its own sentence for this skill, rather than the general one. */
export const hasOwnRemark = (language: RemarkLanguage, name: string) => Object.hasOwn(language === 'ar' ? AR : FR, name.trim());

/** What helps with one skill, as the book writes it: the skill's own sentence, else the general one. */
export function skillNeed(language: RemarkLanguage, name: string, gender: RemarkGender) {
  const entry = entryFor(language, name);
  return agree(entry.need ?? entry.activity ?? PHRASES[language].need.replace('{topic}', () => entry.topic), gender);
}
