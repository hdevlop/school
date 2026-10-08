import 'reflect-metadata';
import { ChatAgent, ChatController, AiSettingsService, CHATBOT_CONFIG, type ChatbotConfig } from 'najm-chatbot';
import { scriptedModel } from 'najm-chatbot/testing';
import { AuthGuard, PermissionService, RoleService } from 'najm-auth';
import { guards, getGuardMetadata } from 'najm-guard';
import { mcp, McpTool, ToolGroup, TOOL_PROVIDER } from 'najm-mcp';
import { i18n } from 'najm-i18n';
import { validation } from 'najm-validation';
import { schoolI18n } from '@sms/contracts/locales';
import { KnowledgeContextProvider } from 'najm-rag';
import { CORRELATION_ID, Controller, Get, INJECTION_TYPES, Server, USER, ROLE } from '../../src/najm';
import { isAdministrator } from '../../src/auth';
import { AcademicYearRepository } from '../../src/modules/academicYears/AcademicYearRepository';
import { AcademicYearValidator, type ResolvedAcademicYear } from '../../src/modules/academicYears/AcademicYearValidator';
import { registerYearPropertyInjector, registerYearRequestScope, schoolMcpYearHooks, Year } from '../../src/modules/academicYears/requestYear';
import { SettingsRepository } from '../../src/modules/settings/SettingsRepository';
import { ParentRepository } from '../../src/modules/parents/ParentRepository';
import { ParentChildrenRepository } from '../../src/modules/parents/ParentChildrenRepository';
import { TeacherRepository } from '../../src/modules/teachers/TeacherRepository';
import { StudentRepository } from '../../src/modules/students/StudentRepository';
import { SchoolChatContextProvider, schoolChatYearContext } from '../../src/modules/chat/SchoolChatContextProvider';
import { registerChatYearContext } from '../../src/modules/chat/chatYearContext';
import { schoolReplyLanguage } from '../../src/modules/chat/schoolReplyLanguage';
import { schoolReplyTemplate } from '../../src/modules/chat/schoolReplyTemplates';
import { jevPreparationPolicy } from '../../src/modules/chat/jevPreparationPolicy';
import { JevIntentClassifier } from '../../src/modules/chat/JevIntentClassifier';
import { JevBenchmarkController } from '../../src/modules/chat/JevBenchmarkController';
import { JevBenchmarkService } from '../../src/modules/chat/JevBenchmarkService';
import { JevBenchmarkRepository } from '../../src/modules/chat/JevBenchmarkRepository';
import { jevSyntheticCases } from '../../src/modules/chat/jevSyntheticCases';
import { jevDarijaCases } from '../../src/modules/chat/jevDarijaCases';
import { INTENT_NAMES, JEV_MODEL } from '../../src/modules/chat/jevIntents';
import type { ChatDiagnostics } from 'najm-chatbot';

@Controller('/fixture-students') @ToolGroup('students')
class StudentCounts {
  @Year() private year!: ResolvedAcademicYear;
  @Get('/count') @isAdministrator() @McpTool({ description: 'Fixture student count', readOnly: true })
  get_student_count() { return { count: this.year.label === '2025-2026' ? 7 : 9 }; }
}
@Controller('/fixture-teachers') @ToolGroup('teachers')
class TeacherCounts {
  @Year() private year!: ResolvedAcademicYear;
  @Get('/count') @isAdministrator() @McpTool({ description: 'Fixture teacher count', readOnly: true })
  get_teacher_count() { return { count: this.year.label === '2025-2026' ? 2 : 3 }; }
}
@Controller('/fixture-classes') @ToolGroup('classes')
class ClassLists {
  @Get('/') @isAdministrator() @McpTool({ description: 'Fixture classes', readOnly: true })
  get_classes() { return []; }
}
@Controller('/fixture-attendance') @ToolGroup('attendance')
class AttendanceLists {
  @Get('/') @isAdministrator() @McpTool({ description: 'Fixture attendance', readOnly: true })
  get_today_students() { return []; }
}
@Controller('/fixture-exams') @ToolGroup('exams')
class ExamLists {
  @Year() private year!: ResolvedAcademicYear;
  @Get('/') @isAdministrator() @McpTool({ description: 'Fixture upcoming exams', readOnly: true })
  get_upcoming_exams() {
    return [{ title: `Exam ${this.year.label}`, class: { name: 'Class A' }, section: { name: 'A' },
      date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), startTime: '08:00', endTime: '09:00' }];
  }
}

/** Fully local: fake settings/classifier/model and synthetic repositories, real guards/MCP/year scope. */
export async function createJevFixture() {
  let markedFixture = true;
  const permissions: Array<{ id: string; name: string; resource: string; action: string }> = [];
  const grantIds = new Set<string>();
  const events: ChatDiagnostics[] = [];
  const settings = { getInternal: async () => ({ provider: 'openrouter', apiKey: 'fixture-unused-key',
    isEnabled: true, model: 'openai/gpt-oss-120b', useMemory: false }) };
  const classifier = new JevIntentClassifier(settings as any);
  let decisions = 0, generations = 0;
  classifier.transport = async (_url, init) => {
    decisions++;
    const query = JSON.parse(String(init!.body)).state;
    const item = [...jevSyntheticCases, ...jevDarijaCases].find(item => item.query === query)!;
    return Response.json({ id: `mock-${decisions}`, model: JEV_MODEL, usage: { input_tokens: 1, cost: 0 }, answers: {
      intent: { type: 'choice', choice: item.intent, confidence: 0.93, probabilities: Object.fromEntries(INTENT_NAMES.map(name =>
        [name, name === item.intent ? 0.93 : name === (item.intent === 'needs_llm' ? 'student_count' : 'needs_llm') ? 0.07 : 0])) },
      is_write: { type: 'noul', noul: item.intent === 'write_request' ? 0.99 : 0.01 },
    } });
  };
  const server = new Server({ isolated: true, silent: true }).base('/api')
    .use(i18n(schoolI18n.options)).use(guards()).use(validation())
    .use(mcp({ name: 'jev-fixture', version: '1', transports: ['http'], path: '/mcp',
      ...schoolMcpYearHooks(['students', 'teachers', 'classes', 'attendance', 'exams']) }))
    .load({ AuthGuard, ChatController, JevBenchmarkController, JevBenchmarkService,
      AcademicYearValidator, AcademicYearRepository, SchoolChatContextProvider,
      StudentCounts, TeacherCounts, ClassLists, AttendanceLists, ExamLists });
  const roleGuard = getGuardMetadata(JevBenchmarkController, 'status').find(guard => guard.guardClass.name === 'RoleGuard')!.guardClass;
  server.load(roleGuard);
  const container = server.container;
  container.set(AiSettingsService, settings as any);
  container.set(JevIntentClassifier, classifier);
  container.set(JevBenchmarkRepository, { isMarkedFixture: async () => markedFixture } as any);
  container.set(RoleService, { getByName: async () => ({ id: 'history-role-admin', name: 'admin' }) } as any);
  container.set(PermissionService, {
    getPermissionsByRole: async () => permissions.filter(item => grantIds.has(item.id)),
    getByName: async (name: string) => permissions.find(item => item.name === name),
    create: async (data: { name: string; resource: string; action: string }) => {
      const permission = { ...data, id: `mock-${permissions.length}` }; permissions.push(permission); return permission;
    },
    assignPermissionToRole: async (_roleId: string, id: string) => { grantIds.add(id); },
  } as any);
  container.set(KnowledgeContextProvider, { getContext: async () => null } as any);
  container.set(SettingsRepository, { getPublicSettings: async () => ({ timeZone: 'UTC' }) } as any);
  for (const token of [ParentRepository, TeacherRepository, StudentRepository]) container.set(token, { getByUserId: async () => null } as any);
  container.set(ParentChildrenRepository, { getChildren: async () => [] } as any);
  container.set(TOOL_PROVIDER, { findRelevantTools: async () => {
    await new Promise(resolve => setTimeout(resolve, 20)); return { status: 'routed', tools: [] };
  } } as any);
  const config: ChatbotConfig = {
    reply: { detectLanguage: schoolReplyLanguage, template: request => schoolReplyTemplate(request, schoolChatYearContext.getStore()?.academicYear),
      preparation: jevPreparationPolicy() }, chatLogging: { enabled: false, onDiagnostics: (event: ChatDiagnostics) => { events.push(event); } },
  };
  container.set(CHATBOT_CONFIG, config);
  const agent = new ChatAgent(settings as any, {} as any, {} as any, config, {} as any);
  (agent as any).container = container;
  const model = scriptedModel('Fixture model fallback');
  const generate = model.doGenerate.bind(model), stream = model.doStream.bind(model);
  model.doGenerate = async options => { generations++; return generate(options); };
  model.doStream = async options => { generations++; return stream(options); };
  (agent as any).buildModel = () => model;
  container.set(ChatAgent, agent);
  registerYearPropertyInjector(container);
  registerYearRequestScope(container, [ChatController, JevBenchmarkController]);
  registerChatYearContext(container);
  for (const target of [ChatController, JevBenchmarkController]) container.setInjection({
    type: INJECTION_TYPES.MIDDLEWARE, target, order: 1,
    handler: async (context: any, next: () => Promise<void>) => {
      const actor = context.req.header('x-test-role');
      if (actor) { container.set(USER, { id: context.req.header('x-test-actor-id') ?? actor, role: actor, status: 'active' } as any); container.set(ROLE, actor); }
      const correlation = context.req.header('x-request-id'); if (correlation) container.set(CORRELATION_ID, correlation);
      return next();
    },
  });
  await server.init();
  Object.assign(await container.resolve(AcademicYearRepository), {
    findWithActivePointer: async (match?: { label?: string }) => {
      const label = match?.label ?? '2026-2027';
      return { activeAcademicYearId: 'active', currentAcademicYear: '2026-2027',
        year: ['2025-2026', '2026-2027'].includes(label) ? { id: label === '2026-2027' ? 'active' : 'old', label,
          status: label === '2026-2027' ? 'active' : 'closed' } : null };
    },
  });
  async function call(path: string, body?: unknown, role: string | null = 'admin', year = '2026-2027', correlation = crypto.randomUUID(), actorId?: string) {
    return server.fetch(new Request(`http://fixture.local/api${path}`, { method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', 'X-Academic-Year': year, 'x-request-id': correlation,
        ...(role ? { 'x-test-role': role } : {}), ...(actorId ? { 'x-test-actor-id': actorId } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
  }
  return { server, classifier, events, call, counts: () => ({ decisions, generations }),
    setMarkedFixture: (value: boolean) => { markedFixture = value; },
    readGrants: () => permissions.filter(item => grantIds.has(item.id)).map(item => ({ ...item })) };
}
