import { describe, expect, it } from 'bun:test';
import { detectReplyLanguage } from '../chatbot-language.mjs';

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
