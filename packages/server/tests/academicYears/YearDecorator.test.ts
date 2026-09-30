import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { guards, createGuard } from 'najm-guard';
import { validation } from 'najm-validation';
import { mcp, McpBuilderService, McpTool } from 'najm-mcp';
import { Controller, Get, INJECTION_TYPES, Server, Service, User, USER, Validate } from '../../src/najm';
import { AcademicYearRepository } from '../../src/modules/academicYears/AcademicYearRepository';
import { AcademicYearValidator, type ResolvedAcademicYear } from '../../src/modules/academicYears/AcademicYearValidator';
import { Year } from '../../src/modules/academicYears/requestYear';
import { i18n } from 'najm-i18n';
import { schoolI18n } from '@sms/contracts/locales';

// The @Year() gate: a real Najm server with authentication-style USER, route
// guards, query validation and MCP, the real validator and the published
// createParamDecorator. Only the registry query is in memory.

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const YEARS = {
  '2025-2026': { id: 'y-2025', label: '2025-2026', status: 'closed' },
  '2026-2027': { id: 'y-2026', label: '2026-2027', status: 'active' },
  '2027-2028': { id: 'y-2027', label: '2027-2028', status: 'draft' },
} as const;
const POINTER = { activeAcademicYearId: 'y-2026', currentAcademicYear: '2026-2027' };

let registryReads = 0;
async function findWithActivePointer(match?: { label?: string }) {
  registryReads += 1;
  const label = match?.label ?? POINTER.currentAcademicYear;
  // The older year answers last, so overlapping requests finish out of order.
  await sleep(label === '2025-2026' ? 25 : 1);
  return { ...POINTER, year: (YEARS as Record<string, unknown>)[label] ?? null };
}

const events: string[] = [];

@Service()
class SignedInGuard {
  canActivate() {
    events.push('guard');
    return true;
  }
}
const signedIn = createGuard(SignedInGuard);

const yearQuery = z.object({ academicYear: z.string().optional() });

@Controller('/years-probe')
class YearProbeController {
  @Get()
  @signedIn()
  @Validate({ query: yearQuery })
  @McpTool('Echo the resolved academic year')
  async read(@Year() year: ResolvedAcademicYear, @User() user: { id: string; role?: string } | undefined) {
    events.push(`handler:${year.label}`);
    await sleep(5);
    return { label: year.label, id: year.id, userId: user?.id ?? null };
  }
}

let server: Server | undefined;
let port = 5470;

afterEach(async () => {
  await server?.stop();
  server = undefined;
  events.length = 0;
  registryReads = 0;
});

async function boot(listen = false) {
  const instance = new Server({ isolated: true, silent: true })
    .use(i18n(schoolI18n.options))
    .use(guards())
    .use(validation())
    .use(mcp({ name: 'year-gate', version: '1.0.0', path: '/mcp', transports: ['http'] }))
    .base('/api')
    .load({ SignedInGuard, YearProbeController, AcademicYearValidator, AcademicYearRepository });
  // Stands in for the auth plugin: USER in the request's own store, before guards.
  instance.container.setInjection({
    type: INJECTION_TYPES.MIDDLEWARE,
    target: YearProbeController,
    methodName: 'read',
    order: 1,
    handler: async (context: { req: { header(name: string): string | undefined } }, next: () => Promise<void>) => {
      const raw = context.req.header('x-test-user');
      if (raw) instance.container.set(USER, JSON.parse(raw));
      events.push('auth');
      await next();
    },
  });
  if (listen) await instance.listen(port);
  else await instance.init();
  const repository = await instance.container.resolve(AcademicYearRepository);
  Object.assign(repository, { findWithActivePointer });
  server = instance;
  return instance;
}

async function get(instance: Server, path: string, user?: object, headers: Record<string, string> = {}) {
  const response = await instance.fetch(new Request(`http://school.local/api${path}`, {
    headers: { ...headers, ...(user ? { 'x-test-user': JSON.stringify(user) } : {}) },
  }));
  return { status: response.status, body: await response.json() as any };
}

const admin = { id: 'admin-1', role: 'admin' };
const teacher = { id: 'teacher-1', role: 'teacher' };

describe('@Year() over REST', () => {
  it('defaults to the active year and keeps a later @User() argument', async () => {
    const instance = await boot();
    const { status, body } = await get(instance, '/years-probe', teacher);
    expect(status).toBe(200);
    expect(body).toEqual({ label: '2026-2027', id: 'y-2026', userId: 'teacher-1' });
    expect(YearProbeController.prototype.read.length).toBe(2);
  });

  it('resolves after authentication and guards, before the handler', async () => {
    const instance = await boot();
    await get(instance, '/years-probe', admin, { 'X-Academic-Year': '2025-2026' });
    expect(events).toEqual(['auth', 'guard', 'handler:2025-2026']);
  });

  it('reads the header or the validated query value, and refuses a conflict', async () => {
    const instance = await boot();
    expect((await get(instance, '/years-probe', admin, { 'X-Academic-Year': '2025-2026' })).body.label).toBe('2025-2026');
    expect((await get(instance, '/years-probe?academicYear=2025-2026', admin)).body.label).toBe('2025-2026');
    expect((await get(instance, '/years-probe?academicYear=2025-2026', admin, { 'X-Academic-Year': '2025-2026' })).status).toBe(200);
    const conflict = await get(instance, '/years-probe?academicYear=2025-2026', admin, { 'X-Academic-Year': '2026-2027' });
    expect(conflict.status).toBe(400);
  });

  it('fails before the handler with the validator statuses', async () => {
    const instance = await boot();
    expect((await get(instance, '/years-probe', admin, { 'X-Academic-Year': 'all' })).status).toBe(400);
    expect((await get(instance, '/years-probe', admin, { 'X-Academic-Year': '2030-2031' })).status).toBe(404);
    expect((await get(instance, '/years-probe', teacher, { 'X-Academic-Year': '2025-2026' })).status).toBe(403);
    expect((await get(instance, '/years-probe', teacher, { 'X-Academic-Year': '2027-2028' })).status).toBe(404);
    expect((await get(instance, '/years-probe', admin, { 'X-Academic-Year': '2027-2028' })).status).toBe(200);
    expect(events.filter((event) => event.startsWith('handler:'))).toEqual(['handler:2027-2028']);
  });

  it('keeps overlapping requests of different users and years apart', async () => {
    const instance = await boot();
    const [older, active] = await Promise.all([
      get(instance, '/years-probe', admin, { 'X-Academic-Year': '2025-2026' }),
      get(instance, '/years-probe', teacher),
    ]);
    expect(older.body).toEqual({ label: '2025-2026', id: 'y-2025', userId: 'admin-1' });
    expect(active.body).toEqual({ label: '2026-2027', id: 'y-2026', userId: 'teacher-1' });
    expect(registryReads).toBe(2);
  });
});

describe('@Year() in MCP tool calls', () => {
  it('reads the academicYear tool argument under the caller\'s role', async () => {
    const instance = await boot();
    const builder = await instance.container.resolve(McpBuilderService);
    const call = (user: object, args: object) =>
      instance.container.run({ [USER.key]: user }, () => builder.invokeTool('read', args));

    const older = await call(admin, { academicYear: '2025-2026' });
    expect(JSON.parse(older.content[0].text)).toEqual({ label: '2025-2026', id: 'y-2025', userId: 'admin-1' });
    expect(JSON.parse((await call(teacher, {})).content[0].text).label).toBe('2026-2027');
    expect((await call(teacher, { academicYear: '2025-2026' })).isError).toBe(true);
    expect((await call(admin, { academicYear: 'all' })).isError).toBe(true);
  });

  it('gives each tool call of one message its own year', async () => {
    const instance = await boot();
    const builder = await instance.container.resolve(McpBuilderService);
    const [older, active] = await instance.container.run({ [USER.key]: admin }, () => Promise.all([
      builder.invokeTool('read', { academicYear: '2025-2026' }),
      builder.invokeTool('read', { academicYear: '2026-2027' }),
    ]));
    expect(JSON.parse(older.content[0].text).label).toBe('2025-2026');
    expect(JSON.parse(active.content[0].text).label).toBe('2026-2027');
  });

  it('resolves in a real Streamable HTTP call, from the argument or the header', async () => {
    await boot(true);
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const call = async (headers: Record<string, string>, args: Record<string, unknown>) => {
      const client = new Client({ name: 'year-gate-client', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), { requestInit: { headers } });
      await client.connect(transport);
      try {
        return await client.callTool({ name: 'read', arguments: args }) as { isError?: boolean; content: Array<{ text: string }> };
      } finally {
        await transport.close();
      }
    };

    // No signed-in user here, so only the active year is open.
    expect(JSON.parse((await call({}, {})).content[0].text).label).toBe('2026-2027');
    expect(JSON.parse((await call({ 'X-Academic-Year': '2026-2027' }, {})).content[0].text).label).toBe('2026-2027');
    expect((await call({}, { academicYear: '2025-2026' })).isError).toBe(true);
    port += 1;
  });
});
