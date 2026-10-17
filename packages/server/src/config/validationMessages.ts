import { z } from 'zod';
import { t } from 'najm-i18n';
import { translations } from '@sms/contracts/locales';
import type { ErrorFormatter, ValidationTarget } from 'najm-validation';

/**
 * Request validation answers in the request's language.
 *
 * DTO schemas are built once at module load, so their messages are English
 * literals ("Amount must be greater than 0") and zod's own defaults are
 * English too. The catalog's `validationMessages` section holds every DTO
 * message: its English value is the exact text a schema uses, with `{{name}}`
 * for a value a helper inserts. A refused request has each issue looked up by
 * that English text and answered from the same key in the request language; a
 * message that is already a catalog key is translated directly, and a zod
 * default falls back to zod's own locale. `test:server-i18n` fails on a DTO
 * message missing from the section.
 */

const SECTION = 'validationMessages';
type Translate = (key: string, params?: Record<string, unknown>) => string;
type Issue = { path: PropertyKey[]; message: string; code: string } & Record<string, unknown>;

const english = translations.en[SECTION] as Record<string, string>;
const exact = new Map<string, string>();
const templates: Array<{ key: string; pattern: RegExp; params: string[] }> = [];
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const [key, text] of Object.entries(english)) {
  if (key === 'locale') continue;
  if (!text.includes('{{')) {
    exact.set(text, key);
    continue;
  }
  const params: string[] = [];
  const source = text.split(/(\{\{\w+\}\})/).map((part) => {
    const name = part.match(/^\{\{(\w+)\}\}$/)?.[1];
    if (!name) return escape(part);
    params.push(name);
    return '(.+?)';
  }).join('');
  templates.push({ key, pattern: new RegExp(`^${source}$`), params });
}

const ZOD_LOCALES = { en: z.locales.en(), fr: z.locales.fr(), ar: z.locales.ar(), es: z.locales.es() } as const;
type ZodLocale = keyof typeof ZOD_LOCALES;

function zodMessage(locale: ZodLocale, issue: Issue): string | undefined {
  const result = ZOD_LOCALES[locale].localeError(issue as never);
  return typeof result === 'string' ? result : result?.message;
}

const CATALOG_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/;

/** One issue's message in the request language, or the original. */
export function translateIssueMessage(issue: Issue, locale: string, translate: Translate): string {
  const { message } = issue;
  if (CATALOG_KEY.test(message)) {
    const text = translate(message);
    return text && text !== message ? text : message;
  }
  if (locale === 'en') return message;

  const key = exact.get(message);
  if (key) return translate(`${SECTION}.${key}`);
  for (const template of templates) {
    const match = message.match(template.pattern);
    if (match) {
      return translate(`${SECTION}.${template.key}`,
        Object.fromEntries(template.params.map((name, index) => [name, match[index + 1]])));
    }
  }
  if (locale in ZOD_LOCALES && message === zodMessage('en', issue)) {
    return zodMessage(locale as ZodLocale, issue) ?? message;
  }
  return message;
}

/** The body najm-core sends for a refused request, with translated messages. */
export function createValidationErrorFormatter(translate: Translate = t): ErrorFormatter {
  return (error, target: ValidationTarget) => {
    const locale = translate(`${SECTION}.locale`);
    const issues = error.issues.map((issue) => ({
      path: Array.isArray(issue.path) ? issue.path : [],
      message: translateIssueMessage(issue as Issue, locale, translate),
      code: issue.code,
    }));
    return {
      error: 'Validation Error',
      code: `VALIDATION_${String(target).toUpperCase()}`,
      message: issues[0]?.message ?? `Validation failed for ${target}`,
      target,
      issues,
    };
  };
}
