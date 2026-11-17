/**
 * The competency lists a class and subject starts from, so a teacher edits a
 * list instead of typing one: a first help, changed freely afterwards.
 *
 * Sources, in order of authority:
 *  - the school's own paper grids (شبكة تتبع تطور مهارات): Arabic CP and CE2,
 *    copied as they are;
 *  - Massar's components per level (1APG … 6APG), the ministry's own split of
 *    each subject (Arabic, French);
 *  - the school's exam planning, which names the components examined in each
 *    class and the language each subject is taught in (mathematics in French,
 *    in Arabic in CE6; social studies in Arabic in primary, French in collège);
 *  - the Moroccan curriculum, for the skills under each component.
 *
 * Keyed by the school's subject codes and class names (CP … CE6, 1AC … 3AC).
 * A list written in Arabic only reads right to left on the sheets.
 */
export type DefaultCompetencyDomain = readonly [name: string, competencies: readonly string[]];
export type DefaultCompetencyList = {
  readonly subject: string;
  readonly classes: readonly string[];
  readonly domains: readonly DefaultCompetencyDomain[];
};

const PRIMARY = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', 'CE6'] as const;
const COLLEGE = ['1AC', '2AC', '3AC'] as const;

export const DEFAULT_COMPETENCY_LISTS: readonly DefaultCompetencyList[] = [
  // ── اللغة العربية ──────────────────────────────────────────────
  {
    subject: 'AR', classes: ['CP'], // The school's grid, level 1.
    domains: [
      ['القراءة', ['القراءة السليمة', 'فهم المسموع', 'فهم المقروء', 'التجزيء المقطعي', 'المرونة']],
      ['الكتابة', ['الخط', 'النقل', 'الإملاء', 'التعبير الكتابي']],
    ],
  },
  {
    subject: 'AR', classes: ['CE1'],
    domains: [
      ['القراءة', ['القراءة السليمة', 'فهم المسموع', 'فهم المقروء', 'المرونة']],
      ['الكتابة', ['الخط', 'النقل', 'الإملاء', 'التعبير الكتابي']],
      ['الظواهر اللغوية', ['التراكيب', 'الصرف والتحويل', 'الأساليب']],
    ],
  },
  {
    subject: 'AR', classes: ['CE2'], // The school's grid, level 3.
    domains: [
      ['القراءة', ['القراءة السليمة', 'فهم المقروء', 'فهم أسئلة النص', 'قيمة النص']],
      ['الكتابة', ['الخط', 'النقل', 'الإملاء', 'التعبير الكتابي']],
      ['الظواهر اللغوية', ['التراكيب', 'الصرف والتحويل']],
    ],
  },
  {
    subject: 'AR', classes: ['CM1'],
    domains: [
      ['القراءة', ['القراءة السليمة', 'فهم المقروء', 'فهم أسئلة النص', 'قيمة النص']],
      ['الكتابة', ['الخط', 'الإملاء', 'التعبير الكتابي']],
      ['الظواهر اللغوية', ['التراكيب', 'الصرف والتحويل']],
      ['التواصل الشفهي', ['الاستماع والفهم', 'التعبير الشفهي']],
    ],
  },
  {
    subject: 'AR', classes: ['CM2', 'CE6'],
    domains: [
      ['القراءة', ['القراءة السليمة المعبرة', 'فهم المقروء', 'تحليل النص واستثماره', 'قيمة النص']],
      ['الظواهر اللغوية', ['التراكيب', 'الصرف والتحويل', 'الإملاء', 'الشكل']],
      ['الإنشاء', ['توليد الأفكار وتنظيمها', 'احترام نمط النص', 'سلامة اللغة والأسلوب']],
      ['التواصل الشفهي', ['الاستماع والفهم', 'التعبير الشفهي']],
    ],
  },
  {
    subject: 'AR', classes: COLLEGE,
    domains: [
      ['النصوص القرائية', ['القراءة المعبرة', 'فهم النص', 'تحليل النص', 'تقويم النص وإبداء الرأي']],
      ['الدرس اللغوي', ['النحو والتركيب', 'الصرف والتحويل', 'الإملاء', 'البلاغة']],
      ['التعبير والإنشاء', ['اكتساب المهارة', 'تطبيق المهارة', 'إنتاج نص متكامل']],
    ],
  },

  // ── Français ──────────────────────────────────────────────────
  {
    subject: 'FR', classes: ['CP'],
    domains: [
      ['Oral', ['Écouter et comprendre', "S'exprimer oralement", 'Réciter une comptine ou un poème']],
      ['Lecture', ['Reconnaître les sons et les lettres', 'Lire des syllabes et des mots', 'Lire une phrase', 'Comprendre un texte lu']],
      ['Écriture', ['Graphisme et tracé des lettres', 'Copie', 'Dictée']],
      ['Étude de la langue', ['La phrase', 'Les déterminants']],
    ],
  },
  {
    subject: 'FR', classes: ['CE1', 'CE2'],
    domains: [
      ['Oral', ['Écouter et comprendre', "S'exprimer oralement", 'Réciter un poème']],
      ['Lecture', ['Lire avec fluidité', 'Comprendre un texte']],
      ['Étude de la langue', ['Grammaire', 'Conjugaison', 'Orthographe', 'Vocabulaire']],
      ['Écriture', ['Écriture et copie', 'Dictée', 'Production écrite']],
    ],
  },
  {
    subject: 'FR', classes: ['CM1', 'CM2', 'CE6'],
    domains: [
      ['Communication orale', ['Comprendre un message oral', "S'exprimer à l'oral (raconter, décrire)", 'Dire un poème']],
      ['Lecture', ['Lire de façon expressive', 'Comprendre un texte', 'Exploiter un texte']],
      ['Étude de la langue', ['Grammaire', 'Conjugaison', 'Orthographe', 'Lexique']],
      ['Production écrite', ['Planifier son texte', 'Rédiger selon la consigne', 'Réviser et corriger son texte']],
    ],
  },
  {
    subject: 'FR', classes: COLLEGE,
    domains: [
      ["Compréhension de l'écrit", ['Lire et comprendre une œuvre', 'Identifier le genre et la structure du texte', 'Interpréter et donner son avis']],
      ['Langue', ['Grammaire', 'Conjugaison', 'Orthographe', 'Lexique']],
      ['Production écrite', ['Respecter la consigne', 'Organiser son texte', 'Correction de la langue']],
      ['Communication orale', ['Comprendre un discours oral', 'Prendre la parole', 'Débattre et argumenter']],
    ],
  },

  // ── English ───────────────────────────────────────────────────
  {
    subject: 'ENG', classes: ['CP', 'CE1', 'CE2'],
    domains: [
      ['Listening and speaking', ['Understanding simple instructions', 'Naming familiar things', 'Songs and rhymes']],
      ['Vocabulary', ['Learning new words', 'Using words in context']],
      ['Reading and writing', ['Recognizing letters and words', 'Copying words']],
    ],
  },
  {
    subject: 'ENG', classes: ['CM1', 'CM2', 'CE6'],
    domains: [
      ['Listening and speaking', ['Understanding spoken English', 'Speaking with confidence']],
      ['Reading', ['Reading aloud', 'Understanding a text']],
      ['Writing', ['Spelling', 'Writing sentences']],
      ['Language', ['Grammar', 'Vocabulary']],
    ],
  },
  {
    subject: 'ENG', classes: COLLEGE,
    domains: [
      ['Listening and speaking', ['Listening comprehension', 'Oral expression']],
      ['Reading', ['Reading comprehension']],
      ['Writing', ['Guided writing', 'Free writing']],
      ['Language', ['Grammar', 'Vocabulary', 'Pronunciation']],
    ],
  },

  // ── Mathématiques ─────────────────────────────────────────────
  {
    subject: 'MATH', classes: ['CP', 'CE1'],
    domains: [
      ['Nombres et calcul', ['Compter et dénombrer', 'Lire et écrire les nombres', 'Comparer et ranger les nombres', 'Additionner et soustraire', 'Résoudre un petit problème']],
      ['Géométrie', ['Reconnaître les figures planes', 'Se repérer dans l’espace']],
      ['Mesure', ['Comparer et mesurer des longueurs', 'Reconnaître la monnaie']],
      ['Organisation et gestion de données', ['Lire un tableau simple']],
    ],
  },
  {
    subject: 'MATH', classes: ['CE2', 'CM1', 'CM2'],
    domains: [
      ['Nombres et calcul', ['Lire, écrire et décomposer les nombres', 'Comparer, ranger et encadrer', 'Calcul mental', 'Techniques opératoires', 'Fractions et nombres décimaux', 'Résoudre des problèmes']],
      ['Géométrie', ['Reconnaître et tracer les figures', 'Droites parallèles et perpendiculaires', 'Symétrie']],
      ['Mesure', ['Longueurs, masses et capacités', 'Durées et monnaie', 'Périmètre et aire']],
      ['Organisation et gestion de données', ['Lire un tableau ou un diagramme', 'Problèmes à étapes']],
    ],
  },
  {
    subject: 'MATH', classes: ['CE6'], // Taught in Arabic in CE6, as the planning shows.
    domains: [
      ['الأعداد والحساب', ['الأعداد الصحيحة الطبيعية', 'الأعداد العشرية والكسور', 'العمليات الأربع', 'الحساب الذهني', 'حل المسائل']],
      ['الهندسة', ['التوازي والتعامد', 'الأشكال الهندسية', 'الإنشاءات الهندسية']],
      ['القياس', ['قياس الأطوال والكتل والسعات', 'المحيط والمساحة', 'المدة والزمن']],
      ['تنظيم ومعالجة البيانات', ['قراءة الجداول والمبيانات', 'التناسبية والنسبة المئوية']],
    ],
  },
  {
    subject: 'MATH', classes: COLLEGE,
    domains: [
      ['Nombres et calcul', ['Nombres décimaux et fractions', 'Nombres relatifs', 'Puissances', 'Calcul littéral et équations']],
      ['Géométrie', ['Figures et constructions', 'Symétries', 'Théorèmes (Thalès, Pythagore)']],
      ['Fonctions et proportionnalité', ['Proportionnalité', 'Fonctions']],
      ['Statistiques', ['Organiser des données', 'Moyenne et représentations']],
      ['Raisonnement', ['Résoudre des problèmes', 'Rédiger une démonstration']],
    ],
  },

  // ── التربية الإسلامية ─────────────────────────────────────────
  {
    subject: 'EI', classes: [...PRIMARY, ...COLLEGE], // The curriculum's six entries, at every level.
    domains: [
      ['القرآن الكريم', ['الحفظ', 'التلاوة السليمة', 'فهم المعاني']],
      ['التزكية', ['الفهم', 'التمثل']],
      ['الاقتداء', ['معرفة الأحداث', 'استخلاص القيم']],
      ['الاستجابة', ['معرفة الأحكام', 'التطبيق العملي']],
      ['القسط', ['معرفة الحقوق والواجبات', 'التمثل في السلوك']],
      ['الحكمة', ['الفهم', 'التمثل في السلوك']],
    ],
  },

  // ── Activité scientifique ─────────────────────────────────────
  {
    subject: 'SCI', classes: PRIMARY,
    domains: [
      ['Démarche scientifique', ['Observer et questionner', 'Formuler une hypothèse', 'Expérimenter', 'Conclure']],
      ['Connaissances', ['Le corps humain et la santé', 'Les animaux et les végétaux', 'La matière et l’énergie', 'La Terre et l’environnement']],
      ['Communication', ['Utiliser le vocabulaire scientifique', 'Schématiser et présenter ses résultats']],
    ],
  },

  // ── التربية الفنية ────────────────────────────────────────────
  {
    subject: 'ART', classes: PRIMARY,
    domains: [
      ['الفنون التشكيلية', ['الرسم', 'التلوين', 'التشكيل والتركيب']],
      ['التربية الموسيقية', ['الأناشيد والغناء', 'الإيقاع']],
      ['المسرح', ['التعبير الجسدي', 'الأداء المسرحي']],
      ['الإبداع', ['الخيال والإبداع', 'العناية بالعمل وإتمامه']],
    ],
  },

  // ── Informatique ──────────────────────────────────────────────
  {
    subject: 'INFO', classes: PRIMARY,
    domains: [
      ["Utilisation de l'ordinateur", ['Manipuler la souris et le clavier', 'Ouvrir et enregistrer un fichier']],
      ['Outils numériques', ['Traitement de texte', 'Dessin numérique']],
      ['Programmation', ['Algorithmique simple', 'Programmation par blocs']],
      ['Citoyenneté numérique', ['Usage responsable et sécurité']],
    ],
  },

  // ── الاجتماعيات / Histoire-géographie ─────────────────────────
  {
    subject: 'HG', classes: ['CM1', 'CM2', 'CE6'], // Taught in Arabic in primary.
    domains: [
      ['التاريخ', ['فهم الأحداث التاريخية', 'التموقع في الزمن', 'استثمار الوثائق']],
      ['الجغرافيا', ['قراءة الخريطة', 'وصف المجال الجغرافي', 'التموقع في المجال']],
      ['التربية المدنية', ['معرفة الحقوق والواجبات', 'المشاركة والسلوك المدني']],
    ],
  },
  {
    subject: 'HG', classes: COLLEGE,
    domains: [
      ['Histoire', ['Comprendre les faits historiques', 'Se situer dans le temps', 'Exploiter des documents']],
      ['Géographie', ['Lire et réaliser une carte', 'Analyser un espace', "Se situer dans l'espace"]],
      ['Éducation à la citoyenneté', ['Connaître les droits et les devoirs', 'Participer à la vie collective']],
    ],
  },

  // ── Collège: sciences and sport ───────────────────────────────
  {
    subject: 'PHY', classes: COLLEGE,
    domains: [
      ['Chimie', ['La matière et ses états', 'Les transformations chimiques']],
      ['Physique', ['Électricité', 'Mouvement et forces', 'Optique']],
      ['Démarche expérimentale', ['Formuler une hypothèse', 'Réaliser une expérience', 'Mesurer et exploiter des résultats', 'Respecter les règles de sécurité']],
      ['Communication', ['Utiliser le vocabulaire scientifique', 'Schématiser']],
    ],
  },
  {
    subject: 'SVT', classes: COLLEGE,
    domains: [
      ['Le vivant et son environnement', ['Écosystèmes et relations alimentaires', 'Fonctions vitales']],
      ['La Terre', ['Phénomènes géologiques', 'Ressources naturelles']],
      ['Démarche scientifique', ['Observer et questionner', 'Formuler une hypothèse', 'Expérimenter', 'Interpréter des résultats']],
      ['Communication', ['Schématiser et légender', 'Rédiger une conclusion']],
      ['Santé et environnement', ['Adopter un comportement responsable']],
    ],
  },
  {
    subject: 'PE', classes: COLLEGE,
    domains: [
      ['Activités athlétiques', ['Course de vitesse', 'Endurance', 'Sauts']],
      ['Sports collectifs', ['Maîtrise technique', 'Jeu collectif et tactique']],
      ['Gymnastique', ['Enchaînement gymnique']],
      ['Attitudes', ['Respect des règles', 'Esprit d’équipe et fair-play', 'Effort et assiduité']],
    ],
  },
];

/** The list a class and subject starts from, if there is one. */
export function defaultCompetencyList(subjectCode: string | null | undefined, className: string | null | undefined) {
  if (!subjectCode || !className) return null;
  return DEFAULT_COMPETENCY_LISTS.find((list) => list.subject === subjectCode && list.classes.includes(className)) ?? null;
}
