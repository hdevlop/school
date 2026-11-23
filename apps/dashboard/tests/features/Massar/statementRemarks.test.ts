import { describe, expect, it } from 'bun:test';
import { FEMININE_REMARKS, REMARKS, remarkFor, remarkLanguage, studentRemark } from '@/features/Massar/config/statementRemarks';

describe('statement remarks follow the student\'s gender', () => {
  it('gives a girl her own form, and a boy or an unknown gender the usual one', () => {
    expect(remarkFor('fr', 'Excellent', 'F')).toBe('Excellente');
    expect(remarkFor('fr', 'Excellent', 'M')).toBe('Excellent');
    expect(remarkFor('fr', 'Excellent', null)).toBe('Excellent');
    expect(remarkFor('ar', 'ممتاز، تلميذ مجتهد', 'F')).toBe('ممتازة، تلميذة مجتهدة');
    // A wording about the work reads the same for everyone.
    expect(remarkFor('fr', 'Excellent travail', 'F')).toBe('Excellent travail');
  });

  it('writes Mathematics remarks in French, except in CE6 where they are Arabic', () => {
    for (const subject of ['Mathématiques', 'Maths', 'الرياضيات', 'رياضيات']) {
      for (const className of ['1APG-1', '3APG-2', '5APG-1', '1ACG-3', '3ACG-1']) expect(remarkLanguage(subject, className)).toBe('fr');
      for (const className of ['6APG-1', '6APG-2', 'CE6', 'CE6-A']) expect(remarkLanguage(subject, className)).toBe('ar');
    }
  });

  it('never labels a student ضعيف, Faible, Weak or Poor, in either gender', () => {
    for (const language of ['ar', 'fr', 'en'] as const) {
      const all = [...REMARKS[language].flat(), ...Object.values(FEMININE_REMARKS[language])];
      for (const wording of all) expect(wording).not.toMatch(/ضعيف|faible|weak|poor/i);
    }
  });

  it('gives a girl her form of every Arabic wording that speaks to or of the student', () => {
    const speaks = /يحتاج|يستطيع|تلميذ|واصل|استمر|ضاعف|ابذل|راجع|تيأس|ستتحسن|أحسنت|أهنئك|عليك|يمكنك|بإمكانك|باستطاعتك/;
    for (const wording of REMARKS.ar.flat().filter((item) => speaks.test(item))) {
      expect(FEMININE_REMARKS.ar[wording]).toBeDefined();
      expect(FEMININE_REMARKS.ar[wording]).not.toMatch(/يحتاج/);
    }
  });

  it('only rewrites wordings the remark lists hold', () => {
    for (const language of ['ar', 'fr', 'en'] as const) {
      const all = new Set(REMARKS[language].flat());
      for (const wording of Object.keys(FEMININE_REMARKS[language])) expect(all.has(wording)).toBe(true);
    }
  });

  it('writes a girl\'s statement remark in her form, picking the same wording otherwise', () => {
    for (const id of ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10']) {
      const boy = studentRemark(19, 20, 'Français', id, undefined, '6APG-1', 'M');
      const girl = studentRemark(19, 20, 'Français', id, undefined, '6APG-1', 'F');
      expect(girl).toBe(remarkFor('fr', boy, 'F'));
      expect(Object.keys(FEMININE_REMARKS.fr)).not.toContain(girl);
    }
  });
});
