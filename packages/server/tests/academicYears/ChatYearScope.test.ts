import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'bun:test';
import { ChatAgent, ChatController, type ChatAgentInput } from 'najm-chatbot';
import { AuthGuard } from 'najm-auth';
import { KnowledgeContextProvider } from 'najm-rag';
import { guards } from 'najm-guard';
import { i18n } from 'najm-i18n';
import { schoolI18n } from '@sms/contracts/locales';
import { INJECTION_TYPES, Server, Service, USER } from '../../src/najm';
import { AcademicYearRepository } from '../../src/modules/academicYears/AcademicYearRepository';
import { AcademicYearValidator, type ResolvedAcademicYear } from '../../src/modules/academicYears/AcademicYearValidator';
import { registerYearPropertyInjector, registerYearRequestScope, Year } from '../../src/modules/academicYears/requestYear';
import { SchoolChatContextProvider } from '../../src/modules/chat/SchoolChatContextProvider';
import { SettingsRepository } from '../../src/modules/settings/SettingsRepository';
import { ParentRepository } from '../../src/modules/parents/ParentRepository';
import { ParentChildrenRepository } from '../../src/modules/parents/ParentChildrenRepository';
import { TeacherRepository } from '../../src/modules/teachers/TeacherRepository';
import { StudentRepository } from '../../src/modules/students/StudentRepository';
import { registerChatYearContext } from '../../src/modules/chat/chatYearContext';

@Service()
class ChatYearProbe {
  @Year() private readonly year!: ResolvedAcademicYear;
  read() { return this.year.label; }
}

let server: Server | undefined;
let providerCalls = 0;
let registryReads = 0;
afterEach(async () => {
  await server?.stop();
  server = undefined;
  providerCalls = 0;
  registryReads = 0;
});

async function boot() {
  const instance = new Server({ isolated: true, silent: true })
    .use(i18n(schoolI18n.options)).use(guards()).base('/api')
    .load({ AuthGuard, ChatController, ChatYearProbe, AcademicYearValidator, AcademicYearRepository, SchoolChatContextProvider });
  server = instance;
  instance.container.set(KnowledgeContextProvider, {
    getContext: async () => 'Existing knowledge context',
    getContextTrace: async () => ({ used: false, chunks: [] }),
  });
  instance.container.set(SettingsRepository, { getPublicSettings: async () => ({ timeZone: 'Africa/Casablanca' }) });
  instance.container.set(ParentRepository, { getByUserId: async (userId: string) => (userId === 'u-parent' ? { id: 'P1' } : undefined) });
  instance.container.set(ParentChildrenRepository, {
    getChildren: async () => [
      { id: 'S1', name: 'Salma Idrissi', class: { name: 'CE2' }, section: { name: 'A' } },
      { id: 'S2', name: 'Omar Idrissi', class: null, section: null },
    ],
  });
  instance.container.set(TeacherRepository, {
    getByUserId: async (userId: string) => {
      if (userId === 'u-broken') throw new Error('database unavailable');
      return userId === 'u-teacher' ? { id: 'T1' } : undefined;
    },
  });
  instance.container.set(StudentRepository, { getByUserId: async (userId: string) => (userId === 'u-student' ? { id: 'S1', name: 'Salma Idrissi' } : undefined) });
  instance.container.set(ChatAgent, {
    stream: async (input: ChatAgentInput) => {
      providerCalls++;
      const probe = await instance.container.resolve(ChatYearProbe);
      const context = await instance.container.resolve(SchoolChatContextProvider);
      return Response.json({ year: probe.read(), messages: input.messages, context: await context.getContext('Hello') });
    },
  });
  registerYearPropertyInjector(instance.container);
  registerYearRequestScope(instance.container, [ChatController]);
  registerChatYearContext(instance.container);
  instance.container.setInjection({
    type: INJECTION_TYPES.MIDDLEWARE, target: ChatController, order: 1,
    handler: async (context: { req: { header(name: string): string | undefined } }, next: () => Promise<void>) => {
      const actor = context.req.header('x-test-user');
      if (actor) instance.container.set(USER, JSON.parse(actor));
      await next();
    },
  });
  await instance.init();
  const repository = await instance.container.resolve(AcademicYearRepository);
  Object.assign(repository, {
    findWithActivePointer: async (match?: { label?: string }) => {
      registryReads++;
      const label = match?.label ?? '2026-2027';
      return {
        activeAcademicYearId: 'active', currentAcademicYear: '2026-2027',
        year: label === '2026-2027' ? { id: 'active', label, status: 'active' }
          : label === '2025-2026' ? { id: 'old', label, status: 'closed' } : null,
      };
    },
  });
  return instance;
}

async function chat(instance: Server, role?: string, year?: string, query = '') {
  const response = await instance.fetch(new Request(`http://school.local/api/chat${query}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(role ? { 'x-test-user': JSON.stringify({ id: role, role, status: 'active' }) } : {}),
      ...(year ? { 'X-Academic-Year': year } : {}),
    },
    body: JSON.stringify({ messages: [{ id: 'hello', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }] }),
  }));
  if (response.status === 500) throw new Error(await response.text());
  return response;
}

describe('published chat controller year boundary', () => {
  it('requires authentication before resolving the year or starting the provider', async () => {
    const response = await chat(await boot(), undefined, '2025-2026');
    expect(response.status).toBe(401);
    expect(registryReads).toBe(0);
    expect(providerCalls).toBe(0);
  });

  it.each(['teacher', 'parent', 'student'])('refuses a historical chat for %s before provider work', async (role) => {
    const response = await chat(await boot(), role, '2025-2026');
    expect(response.status).toBe(403);
    expect(providerCalls).toBe(0);
  });

  it.each(['admin', 'principal', 'accounting'])('allows %s to chat in a selected historical year', async (role) => {
    const response = await chat(await boot(), role, '2025-2026');
    expect(response.status).toBe(200);
    expect((await response.json() as { year: string }).year).toBe('2025-2026');
    expect(providerCalls).toBe(1);
  });

  it('defaults an ordinary signed-in chat to the active year', async () => {
    const response = await chat(await boot(), 'parent');
    expect(response.status).toBe(200);
    const body = await response.json() as { year: string; context: string };
    expect(body.year).toBe('2026-2027');
    expect(body.context).toContain('selected academic year is 2026-2027');
    expect(body.context).toContain('This account can access only the active academic year');
    expect(body.context).toContain('Existing knowledge context');
    expect(body.context).toMatch(/Today is [a-z]+day \d{4}-\d{2}-\d{2} \(YYYY-MM-DD\) in the school's time zone, Africa\/Casablanca\./);
  });

  it("dates today on the school's clock, not the server's UTC date", async () => {
    const provider = await (await boot()).container.resolve(SchoolChatContextProvider);
    // 23:30 UTC on 1 October is already 2 October in Casablanca (UTC+1).
    expect(await provider.describeToday(new Date('2026-10-01T23:30:00Z')))
      .toBe("Today is friday 2026-10-02 (YYYY-MM-DD) in the school's time zone, Africa/Casablanca.");
  });

  it("names the signed-in parent, teacher or student so profile tools get the person's own id", async () => {
    const provider = await (await boot()).container.resolve(SchoolChatContextProvider);
    expect(await provider.describeActor({ id: 'u-parent', role: 'parent' })).toBe(
      'The signed-in user is a parent, parentId P1. Their children this year: Salma Idrissi (studentId S1, CE2 A); '
      + 'Omar Idrissi (studentId S2). "My child" means one of these children; for their grades, attendance or '
      + 'overview use the student-profile tools with that studentId.',
    );
    expect(await provider.describeActor({ id: 'u-teacher', role: 'teacher' })).toContain('teacherId T1');
    expect(await provider.describeActor({ id: 'u-student', role: 'student' }))
      .toContain('the student Salma Idrissi, studentId S1');
    // Administrators, unknown accounts, a missing id and a failed lookup add nothing.
    for (const actor of [{ id: 'u-admin', role: 'admin' }, { id: 'u-nobody', role: 'parent' }, { role: 'teacher' }, { id: 'u-broken', role: 'teacher' }]) {
      expect(await provider.describeActor(actor)).toBeNull();
    }
  });

  it('keeps overlapping chat prompts on their validated year and does not affect other knowledge consumers', async () => {
    const instance = await boot();
    const responses = await Promise.all([
      chat(instance, 'admin', '2025-2026'), chat(instance, 'teacher', '2026-2027'),
    ]);
    const [old, active] = await Promise.all(responses.map((response) => response.json())) as { context: string }[];
    expect(old.context).toContain('selected academic year is 2025-2026');
    expect(old.context).toContain('select that year in the dashboard');
    expect(old.context).not.toContain('only the active academic year');
    expect(active.context).toContain('selected academic year is 2026-2027');
    expect(active.context).toContain('only the active academic year');
    const provider = await instance.container.resolve(SchoolChatContextProvider);
    expect(await provider.getContext('Outside chat')).toBe('Existing knowledge context');
    expect(await provider.getContextTrace('Outside chat')).toEqual({ used: false, chunks: [] });
  });

  it('rejects conflicting, malformed and missing years before the provider', async () => {
    const instance = await boot();
    for (const [year, query, status] of [
      ['2026-2027', '?academicYear=2025-2026', 400],
      ['all', '', 400],
      ['2023-2024', '', 404],
    ] as const) {
      expect((await chat(instance, 'admin', year, query)).status).toBe(status);
    }
    expect(providerCalls).toBe(0);
  });
});
