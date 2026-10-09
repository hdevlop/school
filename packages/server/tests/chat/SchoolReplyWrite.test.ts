import { describe, expect, it } from 'bun:test';
import { schoolWriteRefusalKind } from '../../src/modules/chat/replies/schoolReplyWrite';
import { schoolReplyLanguage } from '../../src/modules/chat/replies/schoolReplyLanguage';
import { schoolReplyTemplate } from '../../src/modules/chat/replies/schoolReplyTemplates';

describe('School deterministic write refusals', () => {
  it.each([
    'mse7 had lfard mn ljadwal.', '7iyed had lkhlas li tsejjel b lghalat.',
    'beddel nmra dyal tilifon dyal had wali l2amr.', 'zid ostad jdid dyal lfrancais.',
    'sifet i3lan lwalidin bli ghedda 3otla.', 'sejjel had tilmida 7adra lyoum.',
    'sejjel had tilmid ghayeb lyoum.', 'dir tlamid kamlin 7adrin llyoum.',
    'مسح هاد الفرض من الجدول.', 'حيد هاد الخلاص اللي تسجل بالغلط.',
    'زيد أستاذ جديد ديال الفرنسية.', 'بدل القسم ديال هاد التلميذ للخامس.',
    'صيفط إعلان للواليدين بلي غدا عطلة.', 'Efface la note du parent.',
  ])('refuses a clear mutation with no tool plan: %s', userText => {
    expect(schoolWriteRefusalKind(userText)).not.toBeNull();
    const reply = schoolReplyTemplate({ userText, language: schoolReplyLanguage(userText), channel: 'web' });
    expect(reply).toEqual({ text: expect.any(String) });
  });

  it.each([
    'kifach nmse7 had lfard bo7di?', 'كيفاش نمسح هاد الفرض بوحدي؟',
    'ما تمسحش هاد الفرض.', 'ma tmse7ch had lfard.',
    'How do I delete the exam myself?', 'Comment supprimer cet examen moi-même ?',
    'Translate "mse7 had lfard mn ljadwal".', '"mse7 had lfard mn ljadwal."',
    'وريني وصف الإعلان «حيد هاد الخلاص».', 'sifet l3adad dyal tlamd.',
    'dir mjmo3 dyal tlamid.', 'jme3 liya 3adad tlamd w lasatida.',
    'دير ليا مجموع التلاميذ.', 'دير لائحة التلاميذ الغايبين اليوم.',
    'dir lista dyal tlamid ghaybin lyoum.',
    'mse7ment had lfard', 'mse7', 'Créé un poème.',
  ])('preserves how-to, negation, quoting, reads and arithmetic: %s', userText => {
    expect(schoolWriteRefusalKind(userText)).toBeNull();
    expect(schoolReplyTemplate({ userText, language: schoolReplyLanguage(userText), channel: 'web' })).toBeNull();
  });

  it('selects the attendance refusal only for attendance mutations', () => {
    expect(schoolWriteRefusalKind('sejjel had tilmida 7adra lyoum.')).toBe('attendance');
    expect(schoolWriteRefusalKind('mse7 had lfard mn ljadwal.')).toBe('change');
  });
});
