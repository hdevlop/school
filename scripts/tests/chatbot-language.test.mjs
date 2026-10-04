import { describe, expect, it } from 'bun:test';
import { analyzeReplyLanguage, detectReplyLanguage } from '../chatbot-language.mjs';
const classNames = ['Cours Préparatoire', 'Cours Élémentaire 1ère année', 'Cours Élémentaire 2ème année',
  'Cours Moyen 1ère année', 'Cours Moyen 2ème année', 'Sixième – Début du collège',
  '1ère année collège', 'Primaire', 'Collège', 'Primary', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', 'CE6', '1AC'];

describe('detectReplyLanguage', () => {
  // Replies the assistant gave in the 2026-10-03 model comparisons.
  it.each([
    ['There are **100 students** enrolled in the 2026‑2027 academic year.', 'en'],
    ['I couldn’t find a student named **Zzbench Qqtest** in the current academic year. Could you double‑check the spelling?', 'en'],
    ['Il y a **100 élèves** inscrits pour l’année scolaire 2026‑2027.', 'fr'],
    ['Aucun élève trouvé avec le nom « Zzbench Qqtest ». Voulez‑vous vérifier l\'orthographe ?', 'fr'],
    ['Bonjour ! Je peux consulter et résumer les données de l’école : nombre d’élèves, présences, notes.', 'fr'],
    ['Hay **100 alumnos** matriculados para el año académico 2026‑2027.', 'es'],
    ['¡Hola! Puedo ayudarte a consultar datos escolares: alumnos, asistencias, calificaciones, cobros.', 'es'],
    ['عدد التلاميذ المسجلين في السنة الدراسية 2026‑2027 هو 100 طالب.', 'ar'],
    ['مرحبًا! يمكنني الاطلاع على بيانات المدرسة مثل عدد الطلاب، الحضور، الدرجات، والرسوم.', 'ar'],
    ['ما لقيت حتى تلميذ بهاد السمية، واش تقدر تعاود تكتب الاسم؟', 'ar'],
  ])('reads %s as %s', (text, language) => {
    expect(detectReplyLanguage(text)).toBe(language);
  });

  it('catches the English replies Gemini gave to Arabic and French questions', () => {
    expect(detectReplyLanguage('There are 58 students enrolled this year.')).toBe('en');
    expect(detectReplyLanguage("I can't find a student named Zzbench Qqtest. Please check the name and try again.")).toBe('en');
  });

  it('reads a Spanish list of classes with French names in parentheses as Spanish', () => {
    const reply = [
      'Aquí tienes la lista de clases para el año académico 2026‑2027:',
      '- **CP** (Cours Préparatoire) – Secciones: A, B, C',
      '- **CE1** (Cours Élémentaire 1ère année) – Secciones: A, B, C',
      '- **CM2** (Cours Moyen 2ème année) – Secciones: A, B, C',
      '- **1AC** (1ère année collège) – Secciones: A, B, C',
      'Cada clase pertenece al año académico 2026‑2027 y tiene tres secciones (A, B y C).',
    ].join('\n');
    expect(detectReplyLanguage(reply, { storedNames: classNames })).toBe('es');
  });

  it('reads an English answer whose table lists French class names as English', () => {
    const reply = [
      'Here are the classes for the 2026‑2027 academic year, each with its sections:',
      '',
      '| Class | Description | Level | Sections |',
      '|-------|-------------|-------|----------|',
      '| **CP** | Cours Préparatoire | Primaire | A, B, C |',
      '| **CE1** | Cours Élémentaire 1ère année | Primaire | A, B, C |',
      '| **CM2** | Cours Moyen 2ème année | Primaire | A, B, C |',
      '| **CE6** | Sixième – Début du collège | Collège | A, B, C |',
      '| **1AC** | 1ère année collège | Collège | A, B, C |',
      '',
      'Let me know if you need details about a specific class, its sections, teachers, or students.',
    ].join('\n');
    expect(detectReplyLanguage(reply, { storedNames: classNames })).toBe('en');
  });

  it('reads a Spanish list whose items gloss classes in French after a dash as Spanish', () => {
    const reply = [
      'Aquí tienes la lista de clases para el año académico 2026‑2027:',
      '',
      '- **CP** – Cours Préparatoire (secciones A, B, C)',
      '- **CE1** – Cours Élémentaire 1ère année (secciones A, B, C)',
      '- **CE2** – Cours Élémentaire 2ème année (secciones A, B, C)',
      '- **CM1** – Cours Moyen 1ère année (secciones A, B, C)',
      '- **CM2** – Cours Moyen 2ème année (secciones A, B, C)',
      '- **1AC** – 1ère année collège (secciones A, B, C)',
      '',
      'Si necesitas más detalles sobre alguna clase, dímelo.',
    ].join('\n');
    expect(detectReplyLanguage(reply, { storedNames: classNames })).toBe('es');
  });

  it('keeps reading a French list of glossed items as French', () => {
    const reply = 'Voici les classes de l’année :\n\n- **CP** – Cours Préparatoire\n- **CE1** – Cours Élémentaire 1ère année\n\nVoulez‑vous les sections de chaque classe ?';
    expect(detectReplyLanguage(reply, { storedNames: classNames })).toBe('fr');
  });

  it('never calls a short French answer that is mostly a table another language', () => {
    const reply = 'Voici les classes :\n\n| Classe | Niveau | Sections |\n|---|---|---|\n| CP | Primary | A, B |\n| CE1 | Primary | A, B |';
    expect([null, 'fr']).toContain(detectReplyLanguage(reply, { storedNames: classNames }));
  });

  it('declines to call text that is too short or too mixed', () => {
    expect(detectReplyLanguage('100')).toBeNull();
    expect(detectReplyLanguage('**100**.')).toBeNull();
    expect(detectReplyLanguage('')).toBeNull();
    // Half Arabic, half French: no confident answer.
    expect(detectReplyLanguage('وريني les notes ديال سلمى dans la classe 2B')).toBeNull();
  });

  it('ignores names, numbers, code and links when they are all there is', () => {
    expect(detectReplyLanguage('Zzbench Qqtest — 2026-2027 `students_get_student_count` https://example.test/x')).toBeNull();
  });
});

describe('Moroccan reply language correctness', () => {
  it('recognizes attached Moroccan prefixes without matching inside unrelated words', () => {
    for (const text of ['عدد التلاميذ المسجلين فهاد العام هو 100.', 'عدد التلاميذ بهاد المدرسة هو 100.', 'وهاد العام الدراسي عدد التلاميذ هو 100.']) {
      expect(analyzeReplyLanguage(text, { expectedLanguage: 'ary' }).wrongRegister).toBe(false);
      expect(analyzeReplyLanguage(text, { expectedLanguage: 'ar' }).wrongRegister).toBe(true);
    }
    expect(analyzeReplyLanguage('عدد التلاميذ المسجلين في المعهد هو 100.', { expectedLanguage: 'ar' }).wrongRegister).toBe(false);
  });
  it('recognizes Moroccan possessive forms without requiring another dialect marker', () => {
    for (const suffix of ['ي', 'ك', 'و', 'ها', 'نا', 'هم', 'كم']) {
      const text = `عدد التلاميذ ديال${suffix} هو 100.`;
      expect(analyzeReplyLanguage(text, { expectedLanguage: 'ary' }).wrongRegister).toBe(false);
      expect(analyzeReplyLanguage(text, { expectedLanguage: 'ar' }).wrongRegister).toBe(true);
    }
  });
  it('recognizes short Darija negations from the live attendance recheck', () => {
    for (const text of ['ما كاينش سجلات حضور التلاميذ اليوم.',
      'ما نقدرش نسجل أو نبدل الحضور هنا. خاصك تستعمل صفحة الحضور فلوحة التحكم لتسجيل غياب التلميذ اليوم.']) {
      const result = analyzeReplyLanguage(text, { expectedLanguage: 'ary' });
      expect(result.register).toBe('ary');
      expect(result.wrongRegister).toBe(false);
      expect(analyzeReplyLanguage(text, { expectedLanguage: 'ar' }).wrongRegister).toBe(true);
    }
  });
  it('flags Darija replies to formal Arabic questions using distinctive Moroccan expressions', () => {
    for (const text of ['عدد التلاميذ هاد السنة هو 100.', 'ما كايناش سجلات حضور ديال التلاميذ اليوم.',
      'ما لقيتش أي تلميذ بالاسم المطلوب. إلا بغيتي عاود عطيني الاسم.',
      'ما نقدرش نسجل غياب التلميذ هنا. استعمل صفحة الحضور.']) {
      expect(analyzeReplyLanguage(text, { expectedLanguage: 'ar' }).wrongRegister).toBe(true);
    }
    expect(analyzeReplyLanguage('لا نقدر أن نغير السجلات هنا، يرجى استخدام لوحة التحكم.', { expectedLanguage: 'ar' }).wrongRegister).toBe(false);
    expect(analyzeReplyLanguage('عدد التلاميذ عندنا هو 100.', { expectedLanguage: 'ar' }).wrongRegister).toBe(false);
  });
  const storedNames = ['Language exam', 'Science exam', 'Mathématiques', 'Cours Préparatoire', 'Zzbench Qqtest'];
  const check = (text, expectedLanguage = 'ary') => analyzeReplyLanguage(text, { storedNames, expectedLanguage });
  it('allows exact stored French and English names in Darija and Arabic', () => {
    for (const [text, expected] of [
      ['هادو الامتحانات اللي جايين: Language exam، Science exam، Mathématiques. إلا بغيتي نوريك الباقي.', 'ary'],
      ['الامتحانات القادمة هي Language exam وScience exam لمادة Mathématiques.', 'ar'],
      ['هادي لائحة الأقسام ديال المدرسة: Cours Préparatoire (CP).', 'ary'],
    ]) {
      const result = check(text, expected);
      expect(result.language).toBe('ar');
      expect(result.mixedLanguage).toBe(false);
      expect(result.wrongRegister).toBe(false);
    }
  });
  it('allows stored Arabic names in a French reply', () => {
    const result = analyzeReplyLanguage('Voici les prochains examens : امتحان الرياضيات. Voulez-vous afficher les détails ?',
      { expectedLanguage: 'fr', storedNames: ['امتحان الرياضيات'] });
    expect(result.language).toBe('fr');
    expect(result.mixedLanguage).toBe(false);
  });
  it.each([
    'ما لقيت حتى تلميذ بهاد السمية. Please check the spelling and try again.',
    'هادي لائحة الأقسام ديال المدرسة (Please check the name).',
    'هادي اللائحة ديال الأقسام:\n| CP | Please check the name |',
    'هادي اللائحة ديال الأقسام:\n- **CP** – Please check the name',
    'هادي اللائحة ديال الأقسام ديال المدرسة. 共计 27.',
    'Voici les classes de l’école. Let me know si vous voulez les détails.',
  ])('catches mixed prose even inside parentheses/tables/glosses: %s', (text) => {
    expect(check(text, text.startsWith('Voici') ? 'fr' : 'ary').mixedLanguage).toBe(true);
  });
  it('does not mistake formal Arabic for Darija', () => {
    expect(check('إليك قائمة الامتحانات القادمة. يمكنك طلب المزيد من المعلومات.').wrongRegister).toBe(true);
    expect(check('هادو الامتحانات اللي جايين، إلا بغيتي نوريك المزيد.').register).toBe('ary');
    expect(check('هادوما الامتحانات الجايين (أول 5):').register).toBe('ary');
    expect(check('Voici les cinq prochains examens : Language exam.', 'fr').language).toBe('fr');
  });
  it('leaves names-only answers inconclusive and masks only exact names', () => {
    expect(check('Language exam / Science exam').language).toBeNull();
    expect(check('هادي اللائحة ديال الأقسام. Language exam students are enrolled.').mixedLanguage).toBe(true);
    expect(check('كاينين الامتحانات الجايين: Language\u202fexam.').mixedLanguage).toBe(false);
  });
});
