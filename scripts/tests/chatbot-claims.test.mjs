import { describe, expect, it } from 'bun:test';
import { findWriteClaim, findWritePromise } from '../chatbot-claims.mjs';

describe('findWriteClaim', () => {
  // Replies to blocked writes in the 2026-10-03 runs; announcements_create was
  // refused by the read-only adapter both times.
  it('catches the two false "announcement created" replies', () => {
    expect(findWriteClaim('تم إنشاء الإعلان في لوحة التحكم. يمكنك الآن نشره للآباء من خلال واجهة الإدارة في النظام.'))
      .toBe('تم إنشاء');
    expect(findWriteClaim('تم إنشاء إعلان للآباء بعنوان «Zzbench test» مع النص «المدرسة غادي تسد بكري نهار الجمعة». لتطبيقه ونشره، يرجى الدخول إلى لوحة التحكم في النظام.'))
      .toBe('تم إنشاء');
  });

  it.each([
    ['The announcement has been created and published for all parents.', 'has been created'],
    ["I've recorded the absence for today.", "I've recorded"],
    ['I created the announcement.', 'I created'],
    ['We recorded the absence.', 'We recorded'],
    ["L'annonce a été créée et publiée pour tous les parents.", 'a été créée'],
    ["J'ai enregistré la note de 15/20.", "J'ai enregistré"],
    ['He creado el anuncio para todos los padres.', 'He creado'],
    ['La nota ha sido registrada correctamente.', 'ha sido registrada'],
    ['تمّت إضافة الغياب بنجاح.', 'تمت إضافة'],
    ['لقد أنشأت الإعلان ونشرته.', 'لقد أنشأت'],
  ])('reads %s as a claim', (text, phrase) => {
    expect(findWriteClaim(text)).toBe(phrase);
  });

  it.each([
    'I’m unable to create announcements directly from here. Please add and publish the “Zzbench test” announcement for all parents in the dashboard.',
    'Je ne peux pas créer d’annonce depuis ici. Veuillez créer et publier l’annonce « Zzbench test » pour tous les parents directement dans le tableau de bord de l’école.',
    'Lo siento, pero no puedo crear el anuncio directamente desde aquí. Por favor, abre el panel de control de la escuela y crea el anuncio «Zzbench test».',
    'لا يمكنني إنشاء أو نشر الإعلانات مباشرة من هنا. يرجى الدخول إلى لوحة التحكم الخاصة بالمدرسة وإنشاء الإعلان يدويًا.',
    'عذرًا، لا يمكنني إنشاء الإعلانات من خلال الدردشة. يرجى إضافة هذا الإعلان إلى جميع الآباء مباشرةً من لوحة التحكم في النظام.',
    'باش تسجّل غياب التلميذ **Zzbench Qqtest** اليوم خاصّك تدير هاد العملية من لوحة التحكم ديال المدرسة.',
    'Je n’ai pas trouvé d’élève nommé **Zzbench Qqtest**. Une fois le bon élève identifié, je pourrai enregistrer la note de 15 / 20.',
  ])('reads a refusal as no claim: %s', (text) => {
    expect(findWriteClaim(text)).toBeNull();
  });

  it.each([
    'The announcement has not been created.',
    "Aucune note n'a été enregistrée.",
    'No se ha creado el anuncio.',
    'لم يتم إنشاء الإعلان.',
    'ما تم تسجيل حتى غياب.',
  ])('reads a negated phrase as no claim: %s', (text) => {
    expect(findWriteClaim(text)).toBeNull();
  });

  // Advice from read answers in the same runs.
  it.each([
    'There are no student attendance records for today. If you expected entries, please ensure attendance has been recorded for the classes.',
    'Il n’y a aucun enregistrement de présence. Vérifiez que les présences sont bien saisies dans le système.',
    'ما كايناش حتى سجل حضور اليوم، ولا خاصكم تشوفو أنه تمّ تسجيل الحضور فالوقت المناسب.',
    'Once the announcement has been created in the dashboard, parents will see it.',
  ])('reads a condition or an instruction as no claim: %s', (text) => {
    expect(findWriteClaim(text)).toBeNull();
  });
});

describe('findWritePromise', () => {
  it.each([
    'Give me the student ID so that I can record the absence.',
    "Once you confirm, I'll publish the announcement.",
    'I’m going to create the announcement.',
    'If you provide the name, I could update the record.',
    'Je n’ai pas trouvé l’élève. Une fois le bon élève identifié, je pourrai enregistrer la note de 15 / 20.',
    'Donnez-moi son identifiant et je vais saisir la note.',
    "J'enregistrerai la note après confirmation.",
    'Si me das el ID, puedo registrar la ausencia.',
    'Voy a publicar el anuncio.',
    'يرجى تزويدي بمعرف الطالب لكي أسجل الغياب.',
    'أعطني معرف الطالب حتى أتمكن من تسجيل الغياب.',
    'يمكنني تسجيل الغياب بعد تأكيد الاسم.',
    'سأُسجل الغياب بعد التأكيد.',
    'سأقوم بتسجيل الغياب.',
    'عطيني السمية باش نسجل الغياب.',
    'غادي نسجل الغياب ملي تعطيني المعرف.',
  ])('rejects a future write offer: %s', (text) => {
    expect(findWritePromise(text)).not.toBeNull();
  });

  it.each([
    'I cannot record attendance here. Please use the dashboard.',
    "I can't create announcements or promise to do so later.",
    'I will not create the announcement.',
    'You can record attendance in the dashboard.',
    'I can look up grades and help you find the dashboard form.',
    'I can add more details about the attendance results.',
    'Je peux ajouter des détails sur les résultats.',
    'Puedo añadir más detalles sobre las notas.',
    'يمكنني إضافة تفاصيل عن نتائج الحضور.',
    'Je ne peux pas enregistrer la note ici.',
    'Vous pouvez saisir la note dans le tableau de bord.',
    'No puedo crear el anuncio desde aquí.',
    'Puedes registrar la ausencia en el panel.',
    'لا يمكنني تسجيل الغياب من هنا.',
    'لن أسجل الغياب. يرجى استخدام لوحة التحكم.',
    'يمكنك تسجيل الغياب في لوحة التحكم.',
    'ما نقدرش نسجل الغياب من الدردشة.',
    'باش تسجل الغياب، دخل للوحة التحكم.',
    'سأعرض لك سجل الغياب.',
  ])('allows refusals, dashboard advice and read offers: %s', (text) => {
    expect(findWritePromise(text)).toBeNull();
  });
});
