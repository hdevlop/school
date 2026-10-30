import { describe, expect, it } from 'bun:test';
import { birthplaceLabel, findBirthplaceById, findBirthplaces, MOROCCO_BIRTHPLACES, resolveBirthplace, searchBirthplaces } from '../src/birthplaces';

describe('bilingual birthplace catalog', () => {
  it('contains the 1503 HCP communes with unique geographic IDs and both scripts', () => {
    expect(MOROCCO_BIRTHPLACES).toHaveLength(1503);
    expect(new Set(MOROCCO_BIRTHPLACES.map(place => place.id)).size).toBe(1503);
    for (const place of MOROCCO_BIRTHPLACES) {
      expect(place.id).toMatch(/^MA-HCP-\d{8,9}$/);
      expect(place.nameLatin).not.toBe('');
      expect(place.nameArabic).toMatch(/\p{Script=Arabic}/u);
      expect(place.provinceLatin).not.toBe('');
    }
  });
  it('matches either script, accents and explicit spelling aliases', () => {
    for (const name of ['Casablanca', ' CASA ', 'الدار البيضاء']) {
      expect(resolveBirthplace({ birthplace: name })).toEqual({ birthplaceId: 'MA-HCP-06141010', birthplace: 'Casablanca', birthplaceArabic: 'الدار البيضاء' });
    }
    expect(findBirthplaces('Fes')[0]?.nameArabic).toBe('فاس');
    expect(findBirthplaces('Mohammedia')[0]?.nameArabic).toBe('المحمدية');
    expect(searchBirthplaces('الدار البيضاء')[0]?.id).toBe('MA-HCP-06141010');
    expect(searchBirthplaces('casa')[0]?.id).toBe('MA-HCP-06141010');
  });
  it('keeps ambiguous and unknown names manual instead of choosing another locality', () => {
    const duplicates = MOROCCO_BIRTHPLACES.filter(place => findBirthplaces(place.nameLatin).length > 1);
    expect(duplicates.length).toBeGreaterThan(0);
    const place = duplicates[0];
    expect(resolveBirthplace({ birthplace: place.nameLatin }).birthplaceId).toBeNull();
    expect(resolveBirthplace({ birthplaceId: place.id }).birthplaceId).toBe(place.id);
    expect(resolveBirthplace({ birthplace: 'Madrid', birthplaceArabic: 'مدريد' })).toEqual({ birthplaceId: null, birthplace: 'Madrid', birthplaceArabic: 'مدريد' });
    expect(resolveBirthplace({ birthplace: 'قرية غير مدرجة' })).toEqual({ birthplaceId: null, birthplace: null, birthplaceArabic: 'قرية غير مدرجة' });
    expect(findBirthplaces('constructor')).toEqual([]);
  });
  it('writes canonical names for an ID, rejects unknown IDs and supports clearing', () => {
    expect(resolveBirthplace({ birthplaceId: 'MA-HCP-06141010', birthplace: 'wrong' }).birthplaceArabic).toBe('الدار البيضاء');
    expect(() => resolveBirthplace({ birthplaceId: 'missing' })).toThrow('Unknown birthplace ID');
    expect(findBirthplaceById('missing')).toBeUndefined();
    expect(resolveBirthplace({})).toEqual({});
    expect(resolveBirthplace({ birthplace: '' })).toEqual({ birthplaceId: null, birthplace: null, birthplaceArabic: null });
    expect(resolveBirthplace({ birthplace: 'Unlisted village' }).birthplaceArabic).toBeNull();
  });
  it('prints the requested script and falls back to the available name', () => {
    const place = resolveBirthplace({ birthplace: 'Casa' });
    expect(birthplaceLabel(place, 'ar-MA')).toBe('الدار البيضاء');
    expect(birthplaceLabel(place, 'fr')).toBe('Casablanca');
    expect(birthplaceLabel({ birthplace: 'Madrid' }, 'ar')).toBe('Madrid');
    expect(birthplaceLabel({}, 'ar')).toBe('');
  });
});
