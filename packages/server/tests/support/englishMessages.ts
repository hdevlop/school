import { getI18nInjections, translate } from 'najm-i18n';
import { translations } from '@sms/contracts/locales';

/**
 * `@I18n` translators are injected by the container, so a validator a unit
 * test builds with `new` has none, and a refusal would throw a TypeError
 * instead of the error under test. This gives each of them the English
 * catalog, so a test asserting on a message also proves the catalog has it.
 */
export function withEnglishMessages<T extends object>(instance: T): T {
  for (const { propertyKey, options } of getI18nInjections(instance.constructor)) {
    const prefix = options?.prefix;
    (instance as Record<PropertyKey, unknown>)[propertyKey] = (key: string, params?: Record<string, unknown>) =>
      translate(translations, 'en', prefix ? `${prefix}.${key}` : key, params as never);
  }
  return instance;
}
