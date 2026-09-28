import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { createGuard, guards } from 'najm-guard';
import { validation } from 'najm-validation';
import { Controller, Get, INJECTION_TYPES, Server, Service, User, USER, Validate } from '../../src/najm';
import { AcademicYearRepository } from '../../src/modules/academicYears/AcademicYearRepository';
import { AcademicYearValidator, type ResolvedAcademicYear } from '../../src/modules/academicYears/AcademicYearValidator';
import { Year, registerYearPropertyInjector, registerYearRequestScope } from '../../src/modules/academicYears/requestYear';

const years = {
  '2025-2026': { id: 'year-2025', label: '2025-2026', status: 'closed' },
  '2026-2027': { id: 'year-2026', label: '2026-2027', status: 'active' },
} as const;
const events: string[] = [];
let resolutionCount = 0;

@Service()
class AllowGuard {
  canActivate() { events.push('guard'); return true; }
}
const allow = createGuard(AllowGuard);

@Service()
class ScopedRepository {
  @Year()
  private readonly year!: ResolvedAcademicYear;

  async read() {
    const before = this.year.label;
    await new Promise((resolve) => setTimeout(resolve, before === '2025-2026' ? 15 : 1));
    events.push(`repository:${before}`);
    return { before, after: this.year.label };
  }
}

@Service()
class ScopedService {
  constructor(private repository: ScopedRepository) {}
  async read() { return this.repository.read(); }
}

@Controller('/service-year-probe')
class ScopedController {
  constructor(private service: ScopedService) {}

  @Get()
  @allow()
  @Validate({ query: z.object({ academicYear: z.string().optional(), probe: z.string().min(1).optional() }) })
  async read(@User('id') actorId: string) {
    return { ...await this.service.read(), actorId };
  }
}

let server: Server | undefined;
afterEach(async () => {
  await server?.stop();
  server = undefined;
  events.length = 0;
  resolutionCount = 0;
});

async function boot() {
  server = new Server({ isolated: true, silent: true })
    .use(guards())
    .use(validation())
    .base('/api')
    .load({ AllowGuard, ScopedRepository, ScopedService, ScopedController, AcademicYearValidator, AcademicYearRepository });
  registerYearPropertyInjector(server.container);
  registerYearRequestScope(server.container, [ScopedController]);
  server.container.setInjection({
    type: INJECTION_TYPES.MIDDLEWARE,
    target: ScopedController,
    methodName: 'read',
    order: 1,
    handler: async (context: { req: { header(name: string): string | undefined } }, next: () => Promise<void>) => {
      const actor = context.req.header('x-test-user');
      if (actor) server!.container.set(USER, JSON.parse(actor));
      events.push('auth');
      await next();
    },
  });
  await server.init();
  const repository = await server.container.resolve(AcademicYearRepository);
  Object.assign(repository, {
    findWithActivePointer: async (match?: { label?: string }) => {
      resolutionCount++;
      return {
        activeAcademicYearId: 'year-2026',
        currentAcademicYear: '2026-2027',
        year: years[(match?.label ?? '2026-2027') as keyof typeof years] ?? null,
      };
    },
  });
  return server;
}

async function get(instance: Server, actor: { id: string; role: string }, year?: string, query?: string) {
  const response = await instance.fetch(new Request(`http://school.local/api/service-year-probe${query ?? ''}`, {
    headers: { 'x-test-user': JSON.stringify(actor), ...(year ? { 'X-Academic-Year': year } : {}) },
  }));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

describe('REST year boundary and repository @Year() getter', () => {
  it('resolves after guards and keeps concurrent actors and years separate', async () => {
    const instance = await boot();
    const admin = { id: 'admin-1', role: 'admin' };
    const principal = { id: 'principal-1', role: 'principal' };
    const [old, active, sameAdmin] = await Promise.all([
      get(instance, admin, '2025-2026'),
      get(instance, principal),
      get(instance, admin, '2026-2027'),
    ]);
    expect(old).toEqual({ status: 200, body: { before: '2025-2026', after: '2025-2026', actorId: 'admin-1' } });
    expect(active).toEqual({ status: 200, body: { before: '2026-2027', after: '2026-2027', actorId: 'principal-1' } });
    expect(sameAdmin).toEqual({ status: 200, body: { before: '2026-2027', after: '2026-2027', actorId: 'admin-1' } });
    expect(events.slice(0, 6).sort()).toEqual(['auth', 'auth', 'auth', 'guard', 'guard', 'guard']);
    expect(resolutionCount).toBe(3);
  });

  it('rejects a conflicting selection before the service body', async () => {
    const instance = await boot();
    const response = await get(instance, { id: 'admin-1', role: 'admin' }, '2026-2027', '?academicYear=2025-2026');
    expect(response.status).toBe(400);
    expect(events).toEqual(['auth', 'guard']);
  });

  it('does not resolve a year or enter the domain when request validation fails', async () => {
    const instance = await boot();
    const response = await get(instance, { id: 'admin-1', role: 'admin' }, '2025-2026', '?probe=');
    expect(response.status).toBe(400);
    expect(resolutionCount).toBe(0);
    expect(events).toEqual(['auth', 'guard']);
  });
});
