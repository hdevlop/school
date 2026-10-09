import 'reflect-metadata';
import { afterEach, expect, test } from 'bun:test';
import { AuthGuard, PermissionGuard } from 'najm-auth';
import { guards } from 'najm-guard';
import { mcp, McpBuilderService, MCP_REGISTRY } from 'najm-mcp';
import { i18n } from 'najm-i18n';
import { schoolI18n } from '@sms/contracts/locales';
import { INJECTION_TYPES, Server, USER } from '../../src/najm';
import { StudentController } from '../../src/modules/students/StudentController';
import { StudentService } from '../../src/modules/students/StudentService';
import { ParentController } from '../../src/modules/parents/ParentController';
import { ParentService } from '../../src/modules/parents/ParentService';
import { TeacherController } from '../../src/modules/teachers/TeacherController';
import { TeacherService } from '../../src/modules/teachers/TeacherService';
import { AcademicYearValidator } from '../../src/modules/academicYears/AcademicYearValidator';
import { registerYearRequestScope, schoolMcpYearHooks } from '../../src/modules/academicYears/requestYear';
import { schoolReplyTemplate } from '../../src/modules/chat/replies/schoolReplyTemplates';
import { jevReplyPlan } from '../../src/modules/chat/jev/jevReplyPlan';

const modules = [
  { group: 'students', controller: StudentController, service: StudentService, property: 'studentRepository' },
  { group: 'parents', controller: ParentController, service: ParentService, property: 'parentRepository' },
  { group: 'teachers', controller: TeacherController, service: TeacherService, property: 'teacherRepository' },
] as const;
let server: Server | undefined;
afterEach(async () => { await server?.stop(); server = undefined; });

async function boot(item: typeof modules[number]) {
  const reads: string[] = [];
  let failure = false;
  let empty = false;
  const service = Object.create(item.service.prototype);
  service[item.property] = { getByUserId: async (id: string) => {
    reads.push(id);
    if (failure) throw new Error('Identity lookup failed');
    return empty ? null : { id: 'record-' + id, name: 'Salma', phone: 'private-phone', medicalConditions: 'private-medical' };
  } };
  const instance = new Server({ isolated: true, silent: true }).base('/api')
    .use(i18n(schoolI18n.options)).use(guards())
    .use(mcp({ name: 'identity-test', version: '1', transports: ['http'],
      ...schoolMcpYearHooks([item.group]) }))
    .load(item.controller, AuthGuard, PermissionGuard);
  server = instance;
  instance.container.set(item.service as any, service);
  instance.container.set(AcademicYearValidator, { resolveSelection: async () => ({ id: 'year', label: '2026-2027', status: 'active' }) } as any);
  registerYearRequestScope(instance.container, [item.controller]);
  instance.container.setInjection({ type: INJECTION_TYPES.MIDDLEWARE, target: item.controller, order: 1,
    handler: async (context: any, next: () => Promise<void>) => {
      const actor = context.req.header('x-test-user');
      if (actor) instance.container.set(USER, JSON.parse(actor));
      await next();
    } });
  await instance.init();
  const actor = { id: 'trusted', role: item.group === 'teachers' ? 'teacher' : item.group === 'parents' ? 'parent' : 'student',
    status: 'active', permissions: ['read:' + item.group] };
  const builder = await instance.container.resolve(McpBuilderService);
  const invoke = (principal: typeof actor | null, input: Record<string, unknown> = {}) =>
    instance.container.run({ [USER.key]: principal }, () => builder.invokeTool(item.group + '_get_my_identity', input));
  const get = (principal: typeof actor | null, query = '') => instance.fetch(new Request(`http://school.local/api/${item.group}/my-identity${query}`,
    { headers: principal ? { 'x-test-user': JSON.stringify(principal) } : {} }));
  return { instance, actor, reads, get, invoke, fail: () => { failure = true; }, empty: () => { empty = true; } };
}

test.each(modules)('$group self identity uses the authenticated ID through REST and MCP and returns minimal data', async item => {
  const f = await boot(item);
  const response = await f.get(f.actor, '?userId=other&id=other');
  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).toContain('record-trusted');
  expect(body).not.toContain('private-');
  const result = await f.invoke(f.actor, { userId: 'other', id: 'other', academicYear: '2026-2027' });
  expect(result.isError).not.toBe(true);
  expect(JSON.stringify(result)).toContain('record-trusted');
  expect(JSON.stringify(result)).not.toContain('private-');
  expect(f.reads).toEqual(['trusted', 'trusted']);
  const registry = f.instance.container.get(MCP_REGISTRY) as { tools: Array<any> };
  const tool = registry.tools.find(tool => tool.name === item.group + '_get_my_identity');
  expect(tool.annotations?.readOnlyHint).toBe(true);
  expect(tool.validation).toBeUndefined();
  expect(Object.keys(tool.invocationInput)).toEqual(['academicYear']);
});

test.each(modules)('$group self identity enforces existing module permissions before any repository read', async item => {
  const f = await boot(item);
  for (const actor of [null, { ...f.actor, permissions: [] }, { ...f.actor, status: 'inactive' }]) {
    expect((await f.get(actor)).status).toBeOneOf([401, 403]);
    expect((await f.invoke(actor)).isError).toBe(true);
  }
  expect(f.reads).toEqual([]);
});

test.each(modules)('$group missing identity is distinct from a failed identity read', async item => {
  const f = await boot(item);
  f.empty();
  const empty = await f.invoke(f.actor);
  expect(empty.isError).not.toBe(true);
  expect(JSON.stringify(empty)).toContain('null');
  f.fail();
  expect((await f.invoke(f.actor)).isError).toBe(true);
});

test('local and Jev counts state the accessible scope instead of implying a school-wide total', () => {
  const plans = [
    schoolReplyTemplate({ userText: 'Combien d’élèves cette année ?', language: 'fr', channel: 'web' }, '2026-2027'),
    jevReplyPlan('student_count', 'fr', '2026-2027'),
  ];
  for (const plan of plans) {
    if (!plan || !('calls' in plan)) throw new Error('Expected a count read');
    const text = plan.render([{ count: 1 }]);
    expect(text).toContain('données accessibles à votre compte');
    expect(text).toContain('1 élèves');
    expect(text).not.toContain('dans l’école');
    expect(() => plan.render(['Error: FORBIDDEN'])).toThrow();
  }
});
