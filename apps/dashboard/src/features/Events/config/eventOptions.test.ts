import { describe, expect, it } from 'bun:test';
import { EVENT_STATUS_VALUES, EVENT_TYPE_VALUES, EVENT_VISIBILITY_VALUES } from '@sms/contracts';
import ar from '@server/locales/ar.json';
import en from '@server/locales/en.json';
import es from '@server/locales/es.json';
import fr from '@server/locales/fr.json';

import {
  buildEventStatusOptions,
  buildEventTypeOptions,
  buildEventVisibilityOptions,
} from './eventOptions';

const echo = (key: string) => key;

const CATALOGS: Record<string, any> = { en, fr, ar, es };

/** Resolves a dotted key against a real catalog, the way `t()` does. */
const translatorFor = (language: string) => (key: string) =>
  key.split('.').reduce<any>((node, part) => node?.[part], CATALOGS[language]) ?? key;

const GROUPS = [
  ['type', EVENT_TYPE_VALUES, buildEventTypeOptions],
  ['status', EVENT_STATUS_VALUES, buildEventStatusOptions],
  ['visibility', EVENT_VISIBILITY_VALUES, buildEventVisibilityOptions],
] as const;

describe('event option builders', () => {
  it('offers exactly what the API accepts, in contract order', () => {
    for (const [group, values, build] of GROUPS) {
      expect(build(echo).map((option) => option.value), `events.${group}`).toEqual([...values]);
    }
  });

  it('asks for the translation key derived from each value', () => {
    for (const [group, values, build] of GROUPS) {
      for (const option of build(echo)) {
        expect(option.label).toBe(`events.${group}.${option.value}`);
      }
      expect(build(echo)).toHaveLength(values.length);
    }
  });
});

describe('labels follow the user’s language', () => {
  it('renders each value in whichever language the translator carries', () => {
    expect(buildEventTypeOptions(translatorFor('en'))[0].label).toBe('Academic');
    expect(buildEventTypeOptions(translatorFor('fr'))[0].label).toBe('Académique');
    expect(buildEventTypeOptions(translatorFor('ar'))[0].label).toBe('أكاديمي');
    expect(buildEventTypeOptions(translatorFor('es'))[0].label).toBe('Académico');
  });

  it('translates statuses and visibilities too, not only types', () => {
    const labelFor = (
      build: (typeof GROUPS)[number][2],
      language: string,
      value: string,
    ) => build(translatorFor(language)).find((option) => option.value === value)?.label;

    expect(labelFor(buildEventStatusOptions, 'fr', 'postponed')).toBe('Reporté');
    expect(labelFor(buildEventStatusOptions, 'es', 'postponed')).toBe('Pospuesto');
    expect(labelFor(buildEventVisibilityOptions, 'ar', 'staff')).toBe('الموظفون');
    expect(labelFor(buildEventVisibilityOptions, 'fr', 'staff')).toBe('Personnel');
  });

  /**
   * The failure this guards against is silent: a missing key renders as
   * `events.type.ceremony` in the select rather than throwing, and only in the
   * language nobody on the team reads.
   */
  it('has a real translation for every offered value in all four languages', () => {
    for (const [group, values, build] of GROUPS) {
      for (const language of Object.keys(CATALOGS)) {
        for (const option of build(translatorFor(language))) {
          expect(
            option.label,
            `${language} is missing events.${group}.${option.value}`,
          ).not.toBe(`events.${group}.${option.value}`);
          expect(option.label.trim()).not.toBe('');
        }
        expect(build(translatorFor(language))).toHaveLength(values.length);
      }
    }
  });

  /**
   * The three selects were pinned to English by hardcoded label maps until
   * these builders dropped them. Non-Latin script is the cheapest proof that
   * no such map has crept back in.
   */
  it('does not fall back to English once a language is chosen', () => {
    for (const [, , build] of GROUPS) {
      const english = build(translatorFor('en')).map((option) => option.label);
      const arabic = build(translatorFor('ar')).map((option) => option.label);

      expect(arabic).not.toEqual(english);
    }
  });
});
