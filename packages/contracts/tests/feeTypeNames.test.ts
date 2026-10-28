import { describe, expect, it } from 'bun:test';
import { findFeeTypesByName } from '../src/feeTypeNames';

describe('fee type name matching', () => {
  it('recognizes translations of older defaults with no saved labels', () => {
    const types = [{ id: 'FT00', name: 'Tuition Fee', labels: null }, { id: 'FT01', name: 'Registration Fee' }];
    expect(findFeeTypesByName(types, 'Frais de scolarité')).toEqual([types[0]]);
    expect(findFeeTypesByName(types, 'Frais Inscription')).toEqual([types[1]]);
    expect(findFeeTypesByName(types, 'الرسوم الدراسية')).toEqual([types[0]]);
    expect(findFeeTypesByName(types, 'Cuota de inscripción')).toEqual([types[1]]);
  });

  it('matches custom labels in every language and preserves the records', () => {
    const type = { id: 'custom', name: 'Saved meal', labels: { en: 'Daily Meal', fr: 'Repas à la journée', ar: 'وجبة اليوم', es: 'Comida del día' } };
    const before = structuredClone(type);
    for (const name of [type.name, ...Object.values(type.labels)]) {
      expect(findFeeTypesByName([type], ` ${name.toUpperCase().normalize('NFD')} `)[0]).toBe(type);
    }
    expect(type).toEqual(before);
  });

  it('does not infer default translations for custom or renamed templates', () => {
    const types = [{ id: 'custom', name: 'Tuition Fee' }, { id: 'FT00', name: 'Robotics', labels: { fr: 'Robotique' } }];
    expect(findFeeTypesByName(types, 'Frais de scolarité')).toEqual([]);
    expect(findFeeTypesByName(types, 'Robotique')).toEqual([types[1]]);
    expect(findFeeTypesByName(types, '')).toEqual([]);
  });

  it('returns every match so an importer can reject ambiguous names', () => {
    const types = [{ id: 'one', name: 'Meal', labels: { fr: 'Repas' } }, { id: 'two', name: 'Repas' }];
    expect(findFeeTypesByName(types, 'Repas')).toEqual(types);
  });
});
