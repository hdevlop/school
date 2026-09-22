import { describe, expect, it } from 'bun:test';

import ar from '../src/locales/ar.json';
import en from '../src/locales/en.json';
import es from '../src/locales/es.json';
import fr from '../src/locales/fr.json';
import translations, { schoolI18n, translations as namedTranslations } from '../src/locales';

type Catalog = { [key: string]: Catalog | string };

const leaves = (catalog: Catalog, prefix = ''): [string, unknown][] =>
  Object.entries(catalog).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? leaves(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value]],
  );

/**
 * One catalog serves the Next client, server components, the Najm i18n
 * plugin and the seed runner. These pin that every consumer reads the same
 * four JSON files through the same definition, with English as the fallback
 * for a key a translation has not caught up with yet.
 */
describe('schoolI18n', () => {
  it('is built from the four catalogs in this package', () => {
    expect(schoolI18n.translations.en).toBe(en);
    expect(schoolI18n.translations.fr).toBe(fr);
    expect(schoolI18n.translations.ar).toBe(ar);
    expect(schoolI18n.translations.es).toBe(es);
    expect(translations).toBe(schoolI18n.translations);
    expect(namedTranslations).toBe(schoolI18n.translations);
  });

  it('keeps the supported languages, default and fallback', () => {
    expect([...schoolI18n.supportedLanguages]).toEqual(['en', 'fr', 'ar', 'es']);
    expect(schoolI18n.defaultLanguage).toBe('en');
    expect(schoolI18n.fallbackToDefaultLanguage).toBe(true);
  });

  it('keeps the Moroccan formatting locales and Arabic right-to-left', () => {
    expect(schoolI18n.locale('en')).toBe('en-MA');
    expect(schoolI18n.locale('fr')).toBe('fr-MA');
    expect(schoolI18n.locale('ar')).toBe('ar-MA');
    expect(schoolI18n.locale('es')).toBe('es-MA');
    expect(schoolI18n.direction('ar')).toBe('rtl');
    expect(schoolI18n.direction('en')).toBe('ltr');
    expect(schoolI18n.direction('fr')).toBe('ltr');
    expect(schoolI18n.direction('es')).toBe('ltr');
  });

  it('holds only string leaves in every catalog', () => {
    for (const catalog of [en, fr, ar, es]) {
      const nonStrings = leaves(catalog as Catalog).filter(([, value]) => typeof value !== 'string');
      expect(nonStrings).toEqual([]);
    }
  });

  it('falls back to English for a key a translation does not define', () => {
    const french = new Set(leaves(fr as Catalog).map(([key]) => key));
    const missing = leaves(en as Catalog).find(([key]) => !french.has(key));
    expect(missing).toBeDefined();

    const [key, english] = missing!;
    expect(schoolI18n.translate('fr', key as never)).toBe(english as string);
  });

  it('translates a key every language defines in that language', () => {
    const key = 'common.save';
    const values = (['en', 'fr', 'ar', 'es'] as const).map((language) =>
      schoolI18n.translate(language, key as never),
    );
    expect(new Set(values).size).toBe(4);
  });
});
