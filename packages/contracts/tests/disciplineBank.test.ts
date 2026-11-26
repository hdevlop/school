import { describe, expect, it } from 'bun:test';
import { DISCIPLINE_CATEGORY_VALUES, DISCIPLINE_LOCATION_VALUES, DISCIPLINE_SEVERITY_VALUES } from '../src/enums';
import { DISCIPLINE_BANK, DISCIPLINE_BANK_LANGUAGES, disciplineBankFor, nextDisciplineDescription } from '../src/disciplineBank';

describe("School's built-in incident descriptions", () => {
  it('describe every category eight ways, each with a severity and written in every language', () => {
    for (const category of DISCIPLINE_CATEGORY_VALUES) {
      expect(DISCIPLINE_BANK.filter(entry => entry.category === category), category).toHaveLength(8);
    }
    for (const entry of DISCIPLINE_BANK) {
      expect(DISCIPLINE_SEVERITY_VALUES, entry.id).toContain(entry.severity);
      for (const place of entry.places) expect(DISCIPLINE_LOCATION_VALUES, entry.id).toContain(place);
      for (const language of DISCIPLINE_BANK_LANGUAGES) {
        expect(entry.description[language]?.trim().length, `${entry.id} ${language}`).toBeGreaterThan(15);
        expect(entry.description[language].length, `${entry.id} ${language}`).toBeLessThanOrEqual(200);
      }
    }
    expect(new Set(DISCIPLINE_BANK.map(entry => entry.id)).size).toBe(DISCIPLINE_BANK.length);
  });

  it('offer the chosen severity first, then the nearest, in the interface language', () => {
    const low = disciplineBankFor('fighting', 'low', null, 'fr');
    expect(low).toHaveLength(8);
    expect(low[0].severity).toBe('low');
    const ranks = low.map(item => DISCIPLINE_SEVERITY_VALUES.indexOf(item.severity));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(disciplineBankFor('fighting', 'critical', null, 'fr')[0].severity).toBe('critical');
    expect(disciplineBankFor('cheating', 'medium', null, 'ar')[0].description).toMatch(/[؀-ۿ]/);
    expect(disciplineBankFor('cheating', 'medium', null, 'de')[0].description).not.toMatch(/[؀-ۿ]/);
    expect(disciplineBankFor('', 'medium', null, 'fr')).toEqual([]);
  });

  it('cycle on each click, starting after the text already in the field', () => {
    const items = disciplineBankFor('vandalism', 'medium', null, 'fr');
    expect(nextDisciplineDescription(items, null)?.id).toBe(items[0].id);
    expect(nextDisciplineDescription(items, items[0].id)?.id).toBe(items[1].id);
    expect(nextDisciplineDescription(items, items.at(-1)!.id)?.id).toBe(items[0].id);
    expect(nextDisciplineDescription(items, null, items[2].description)?.id).toBe(items[3].id);
    expect(nextDisciplineDescription([], null)).toBeUndefined();
  });

  // A fight in class is never described at the school gate or in the playground.
  it("keep to the incident's place: the wordings that name it or none, every one when it is unlisted", () => {
    const inClass = disciplineBankFor('fighting', 'medium', 'classroom', 'fr');
    expect(inClass.map(item => item.id).sort()).toEqual(['bank:fighting.2', 'bank:fighting.3', 'bank:fighting.7']);
    expect(inClass.some(item => /sortie|cour|couloir/.test(item.description))).toBe(false);
    // Among the same severity, the wording that names the place comes first.
    expect(inClass[0].id).toBe('bank:fighting.7');
    expect(disciplineBankFor('fighting', 'medium', 'school_entrance', 'fr').map(item => item.id)).toContain('bank:fighting.4');
    expect(disciplineBankFor('fighting', 'medium', 'Parking des parents', 'fr')).toHaveLength(8);
    expect(disciplineBankFor('fighting', 'medium', '', 'fr')).toHaveLength(8);
    // Every category still has wordings for a classroom.
    for (const category of DISCIPLINE_CATEGORY_VALUES) expect(disciplineBankFor(category, 'medium', 'classroom', 'fr').length, category).toBeGreaterThanOrEqual(3);
  });
});
