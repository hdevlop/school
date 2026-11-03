import { describe, expect, it } from 'bun:test';
import { schoolI18n } from '@sms/contracts/locales';
import { DISCIPLINE_LOCATION_VALUES } from '@sms/contracts';

import {
  OTHER_LOCATION,
  buildDisciplineLocationOptions,
  disciplineLocationLabel,
  isListedDisciplineLocation,
} from '@/features/Discipline/config/disciplineOptions';

const translator = (language: string) => (key: string) => schoolI18n.translate(language as never, key as never);
const english = translator('en');

describe('discipline location options', () => {
  it('offers every listed place, then a way to name another', () => {
    const options = buildDisciplineLocationOptions(english);
    expect(options.map(option => option.value)).toEqual([...DISCIPLINE_LOCATION_VALUES, OTHER_LOCATION]);
    expect(options.at(-1)?.label).toBe('Other place');
  });

  it.each(['en', 'fr', 'ar', 'es'])('names every place in %s, not by its key', (language) => {
    for (const { value, label } of buildDisciplineLocationOptions(translator(language))) {
      expect(label, value).not.toContain('discipline.form');
      expect(label.trim().length, value).toBeGreaterThan(0);
    }
  });

  it('never treats the "other" choice as a place that can be stored', () => {
    expect(isListedDisciplineLocation(OTHER_LOCATION)).toBe(false);
  });

  it('shows a listed place in the viewer\'s language', () => {
    expect(disciplineLocationLabel(english, 'schoolyard')).toBe('Schoolyard');
    expect(disciplineLocationLabel(translator('fr'), 'schoolyard')).toBe('Cour de récréation');
  });

  it('shows a place typed by hand exactly as it was typed', () => {
    expect(disciplineLocationLabel(english, 'Derrière le gymnase')).toBe('Derrière le gymnase');
    expect(isListedDisciplineLocation('Derrière le gymnase')).toBe(false);
  });

  it('leaves a missing place empty for the caller to mark', () => {
    expect(disciplineLocationLabel(english, null)).toBeNull();
    expect(disciplineLocationLabel(english, undefined)).toBeUndefined();
    expect(disciplineLocationLabel(english, '')).toBe('');
  });
});
