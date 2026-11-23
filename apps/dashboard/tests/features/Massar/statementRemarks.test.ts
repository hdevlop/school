import { describe, expect, it } from 'bun:test';
import { FEMININE_REMARKS, REMARKS, remarkFor, studentRemark } from '@/features/Massar/config/statementRemarks';

describe('statement remarks follow the student\'s gender', () => {
  it('gives a girl her own form, and a boy or an unknown gender the usual one', () => {
    expect(remarkFor('fr', 'Excellent', 'F')).toBe('Excellente');
    expect(remarkFor('fr', 'Excellent', 'M')).toBe('Excellent');
    expect(remarkFor('fr', 'Excellent', null)).toBe('Excellent');
    expect(remarkFor('ar', 'ممتاز، تلميذ مجتهد', 'F')).toBe('ممتازة، تلميذة مجتهدة');
    // A wording about the work reads the same for everyone.
    expect(remarkFor('fr', 'Excellent travail', 'F')).toBe('Excellent travail');
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
