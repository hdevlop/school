import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { Server } from 'najm-core';
import { LANGUAGE_HEADER } from '@sms/contracts/locales';
import { Controller, Err, Get, I18n } from '../../src/najm';
import { i18nConfig } from '../../src/config/coreConfig';

// The language a server refusal arrives in, through School's real i18n
// configuration. ServerMessages.test.ts checks the catalog; this checks which
// language a request gets.

const NOT_FOUND = {
  en: 'Student not found',
  fr: 'Élève introuvable',
  ar: 'التلميذ غير موجود',
  es: 'Estudiante no encontrado',
} as const;

@Controller('/language-probe')
class RefusalProbeController {
  @I18n('students.errors') private st!: (key: string) => string;

  @Get('/')
  refuse() {
    Err(404, this.st('notFound'));
  }
}

const PORT = 4791;
let server: Server;

beforeAll(async () => {
  server = new Server({ isolated: true, silent: true }).use(i18nConfig()).load(RefusalProbeController);
  await server.listen(PORT);
});

afterAll(async () => {
  await server?.stop();
});

async function refusal({ header, cookie, query }: { header?: string; cookie?: string; query?: string } = {}) {
  const headers: Record<string, string> = {};
  if (header !== undefined) headers[LANGUAGE_HEADER] = header;
  if (cookie !== undefined) headers.Cookie = `language=${cookie}`;
  const response = await fetch(`http://localhost:${PORT}/language-probe${query ? `?lang=${query}` : ''}`, { headers });
  const body = (await response.json()) as { message: string };
  return { status: response.status, message: body.message, setCookie: response.headers.get('set-cookie') };
}

describe('refusal language', () => {
  it('follows the dashboard language header over a conflicting cookie and query', async () => {
    expect(await refusal({ header: 'fr', cookie: 'en', query: 'en' })).toMatchObject({ status: 404, message: NOT_FOUND.fr });
    expect((await refusal({ header: 'ar', cookie: 'en', query: 'es' })).message).toBe(NOT_FOUND.ar);
  });

  it('without the header uses the cookie, then the query, then the default language', async () => {
    expect((await refusal({ cookie: 'es', query: 'fr' })).message).toBe(NOT_FOUND.es);
    expect((await refusal({ query: 'fr' })).message).toBe(NOT_FOUND.fr);
    expect((await refusal()).message).toBe(NOT_FOUND.en);
  });

  it('an unsupported header falls back to the next source, never to a raw key', async () => {
    expect((await refusal({ header: 'de', cookie: 'fr' })).message).toBe(NOT_FOUND.fr);
    expect((await refusal({ header: 'de' })).message).toBe(NOT_FOUND.en);
  });

  it('changes language with the header on every request of one cookie jar and writes no language cookie', async () => {
    const languages = ['fr', 'en', 'ar', 'es', 'fr'] as const;
    for (const language of languages) {
      const result = await refusal({ header: language, cookie: 'en' });
      expect(result.message).toBe(NOT_FOUND[language]);
      expect(result.setCookie ?? '').not.toContain('language=');
    }
  });
});
