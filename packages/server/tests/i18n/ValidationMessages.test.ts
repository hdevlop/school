import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { z } from 'zod';
import { Server } from 'najm-core';
import { translate } from 'najm-i18n';
import { LANGUAGE_HEADER, translations } from '@sms/contracts/locales';
import { Body, Controller, Post, Validate } from '../../src/najm';
import { i18nConfig, validationConfig } from '../../src/config/coreConfig';
import { installZodDefaultMessages, translateIssueMessage } from '../../src/config/validationMessages';
import { applyCreditDto } from '../../src/modules/financial/credits/CreditDto';
import { num } from '../../src/shared/fields';

// PB1020 (2026-10-17): a French request refused with "Amount must be greater
// than 0". DTO schemas carry English literals; the catalog's
// `validationMessages` section translates them by their English text.

const SRC = join(import.meta.dir, '../../src');
const LANGUAGES = ['en', 'fr', 'ar', 'es'] as const;
type Catalog = Record<string, Record<string, string>>;
const section = (language: string) => (translations as unknown as Record<string, Catalog>)[language].validationMessages;

function schemaSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return schemaSources(path);
    return /Dto\.ts$/.test(name) || name === 'fields.ts' ? [path] : [];
  });
}

const MESSAGE_METHODS = new Set(['min', 'max', 'positive', 'nonnegative', 'negative', 'nonpositive', 'int',
  'regex', 'refine', 'superRefine', 'length', 'email', 'url', 'gt', 'gte', 'lt', 'lte', 'nonempty',
  'startsWith', 'endsWith', 'includes', 'multipleOf', 'finite', 'datetime', 'never', 'date', 'time', 'uuid', 'iso']);

/** Single-quoted messages handed to a zod check or a `message:` option. */
function schemaMessages(): Map<string, string> {
  const found = new Map<string, string>();
  for (const path of schemaSources(SRC)) {
    const text = readFileSync(path, 'utf8');
    for (const match of text.matchAll(/'((?:\\.|[^'\\\n])*)'/g)) {
      const before = text.slice(Math.max(0, match.index! - 200), match.index);
      let isMessage = /\b(message|error|required_error|invalid_type_error):\s*$/.test(before);
      if (!isMessage && /[(,]\s*$/.test(before)) {
        let depth = 0;
        let index = before.length - 1;
        for (; index >= 0; index--) {
          if (before[index] === ')') depth++;
          else if (before[index] === '(') { if (depth === 0) break; depth--; }
        }
        isMessage = MESSAGE_METHODS.has(before.slice(0, index).match(/\.(\w+)\s*$/)?.[1] ?? '');
      }
      if (isMessage) found.set(match[1]!, relative(SRC, path).replaceAll('\\', '/'));
    }
  }
  return found;
}

const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort().join();
const translator = (language: string) => (key: string, params?: Record<string, unknown>) =>
  translate(translations, language, key, params as never);

describe('server validation catalog', () => {
  it('has every DTO message as an English value', () => {
    const english = new Set(Object.values(section('en')));
    const keyLike = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/;
    const missing = [...schemaMessages()]
      .filter(([message]) => !keyLike.test(message) && !english.has(message))
      .map(([message, path]) => `${path}: ${message}`);
    expect(schemaMessages().size).toBeGreaterThan(200);
    expect(missing).toEqual([]);
  });

  it('has every key in every language, with the same placeholders', () => {
    const problems: string[] = [];
    for (const [key, text] of Object.entries(section('en'))) {
      for (const language of LANGUAGES.slice(1)) {
        const other = section(language)[key];
        if (typeof other !== 'string' || !other) problems.push(`${key}: missing in ${language}`);
        else if (placeholders(other) !== placeholders(text)) problems.push(`${key}: ${language} placeholders differ`);
      }
    }
    expect(problems).toEqual([]);
    expect(LANGUAGES.map((language) => section(language).locale)).toEqual([...LANGUAGES]);
  });
});

describe('translated validation issues', () => {
  const issuesOf = (schema: z.ZodTypeAny, value: unknown) => {
    const result = schema.safeParse(value);
    if (result.success) throw new Error('expected a refusal');
    return result.error.issues as never[];
  };
  const first = (schema: z.ZodTypeAny, value: unknown, language: string) =>
    translateIssueMessage(issuesOf(schema, value)[0], language, translator(language));

  it('answers a DTO message in the request language', () => {
    const zero = { studentId: 'S1', amount: 0 };
    expect(first(applyCreditDto, zero, 'en')).toBe('Amount must be greater than 0');
    expect(first(applyCreditDto, zero, 'fr')).toBe('Le montant doit être supérieur à 0');
    expect(first(applyCreditDto, zero, 'ar')).toBe('يجب أن يكون المبلغ أكبر من 0');
    expect(first(applyCreditDto, zero, 'es')).toBe('El importe debe ser mayor que 0');
  });

  it('fills a helper message that carries a value', () => {
    expect(first(num().min(5), 2, 'fr')).toBe('Doit être au moins 5');
    expect(first(num().max(9), 12, 'es')).toBe('No puede superar 9');
  });

  it('falls back to zod\'s own locale for a default message', () => {
    const message = first(z.object({ title: z.string() }), {}, 'fr');
    expect(message).not.toMatch(/Invalid input/);
    expect(message).toMatch(/invalide|attendu/i);
  });

  // The production bundle drops zod's own `config(en())` (its package is
  // marked side-effect free), and an invalid payment type reached French
  // users as "Invalid input". The server installs the English defaults itself.
  it('translates a default message even when the bundle dropped zod\'s English locale', () => {
    const paymentType = z.object({ paymentType: z.enum(['recurring', 'oneTime']) });
    try {
      z.config({ localeError: undefined });
      expect(issuesOf(paymentType, { paymentType: 'weekly' })[0]).toMatchObject({ message: 'Invalid input' });
      installZodDefaultMessages();
      expect(first(paymentType, { paymentType: 'weekly' }, 'fr')).toBe('Option invalide : une valeur parmi "recurring"|"oneTime" attendue');
    } finally {
      installZodDefaultMessages();
    }
  });

  it('translates a message that is already a catalog key', () => {
    const schema = z.string().refine(() => false, 'payments.validation.amountPositive');
    expect(first(schema, 'x', 'fr')).toBe(translator('fr')('payments.validation.amountPositive'));
  });

  it('leaves an unknown literal unchanged', () => {
    expect(first(z.string().min(3, 'Something nobody wrote down'), 'x', 'fr')).toBe('Something nobody wrote down');
  });
});

@Controller('/validation-probe')
class ValidationProbeController {
  @Post('/')
  @Validate(applyCreditDto)
  accept(@Body() body: unknown) {
    return body;
  }
}

describe('refused request language', () => {
  const PORT = 4792;
  let server: Server;

  beforeAll(async () => {
    server = new Server({ isolated: true, silent: true }).use(i18nConfig()).use(validationConfig())
      .load(ValidationProbeController);
    await server.listen(PORT);
  });

  afterAll(async () => {
    await server?.stop();
  });

  const refuse = async (language?: string) => {
    const response = await fetch(`http://localhost:${PORT}/validation-probe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(language ? { [LANGUAGE_HEADER]: language } : {}) },
      body: JSON.stringify({ studentId: 'S1', amount: -5 }),
    });
    return { status: response.status, body: await response.json() as { message: string; issues: Array<{ message: string; path: string[] }> } };
  };

  it('answers in the dashboard language and keeps English by default', async () => {
    const french = await refuse('fr');
    expect(french.status).toBe(400);
    expect(french.body.message).toBe('Le montant doit être supérieur à 0');
    expect(french.body.issues[0]).toMatchObject({ path: ['amount'], message: 'Le montant doit être supérieur à 0' });
    expect((await refuse()).body.message).toBe('Amount must be greater than 0');
  });
});
