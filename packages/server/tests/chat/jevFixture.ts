import 'reflect-metadata';
import { ChatAgent, ChatController, AiSettingsService, CHATBOT_CONFIG, type ChatbotConfig } from 'najm-chatbot';
import { scriptedModel } from 'najm-chatbot/testing';
import { AuthGuard, PermissionService, RoleService } from 'najm-auth';
import { guards, getGuardMetadata } from 'najm-guard';
import { mcp, McpTool, ToolGroup, TOOL_PROVIDER, MCP_REGISTRY } from 'najm-mcp';
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
import { schoolFilteredReplyKind } from '../../src/modules/chat/schoolFilteredReplies';
import { jevPreparationPolicy } from '../../src/modules/chat/jevPreparationPolicy';
import { JevIntentClassifier } from '../../src/modules/chat/JevIntentClassifier';
import { JevBenchmarkController } from '../../src/modules/chat/JevBenchmarkController';
import { JevBenchmarkService } from '../../src/modules/chat/JevBenchmarkService';
import { JevBenchmarkRepository } from '../../src/modules/chat/JevBenchmarkRepository';
import { jevSyntheticCases } from '../../src/modules/chat/jevSyntheticCases';
import { jevDarijaCases } from '../../src/modules/chat/jevDarijaCases';
import { INTENT_NAMES, JEV_MODEL } from '../../src/modules/chat/jevIntents';
import type { ChatDiagnostics } from 'najm-chatbot';

class FixtureData { constructor(readonly qualified = false, readonly identities = false) {} }

@Controller('/fixture-students') @ToolGroup('students')
class StudentCounts {
  constructor(private data: FixtureData) {}
  @Year() private year!: ResolvedAcademicYear;
  @Get('/count') @isAdministrator() @McpTool({ description: 'Fixture student count', readOnly: true })
  get_student_count() { return { count: this.year.label === '2025-2026' ? 7 : 9 }; }
  @Get('/') @isAdministrator() @McpTool({ description: 'Fixture scoped students', readOnly: true })
  get_students() {
    if (this.data.identities) return [{ id: 'girl-a', classId: 'fifth', sectionId: 'A', gender: 'female' },
      { id: 'boy-a', classId: 'fifth', sectionId: 'B', gender: 'male' }, { id: 'other', classId: 'other', gender: 'female' }];
    if (this.data.qualified) return [...Array.from({ length: this.year.label === '2025-2026' ? 30 : 31 }, (_, i) => ({ id: `student-${i}`, classId: 'fourth', gender: 'female' })),
      ...Array.from({length:this.year.label === '2025-2026' ? 2 : 3},(_,i)=>({id:`sixth-${i}`,classId:'sixth',gender:'male'}))];
    return [{ id: 'girl-a', gender: 'female' }, { id: 'boy-a', gender: 'male' },
    ...(this.year.label === '2026-2027' ? [{ id: 'girl-b', gender: 'female' }] : [])]; }
}
@Controller('/fixture-teachers') @ToolGroup('teachers')
class TeacherCounts {
  @Year() private year!: ResolvedAcademicYear;
  @Get('/count') @isAdministrator() @McpTool({ description: 'Fixture teacher count', readOnly: true })
  get_teacher_count() { return { count: this.year.label === '2025-2026' ? 2 : 3 }; }
  @Get('/') @isAdministrator() @McpTool({ description: 'Fixture scoped teacher assignments', readOnly: true })
  get_teachers() { return [{ id: 'math-teacher', name: `Math Teacher ${this.year.label}`, assignments: [
    { subjectIds: ['math-id'], classId: 'class-a', sectionIds: ['section-a'] },
    { subjectIds: ['math-id'], classId: 'class-b', sectionIds: ['section-b'] }] },
    { id: 'physics-teacher', name: 'Physics Teacher', specialization: 'Maths', assignments: [{ subjectIds: ['physics-id'] }] }]; }
}
@Controller('/fixture-subjects') @ToolGroup('subjects')
class SubjectLists {
  @Get('/') @isAdministrator() @McpTool({ description: 'Fixture subjects', readOnly: true })
  get_subjects() { return [{ id: 'math-id', name: 'Mathématiques', code: 'MATH' }, { id: 'physics-id', name: 'Physique', code: 'PHYS' }]; }
}
@Controller('/fixture-classes') @ToolGroup('classes')
class ClassLists {
  constructor(private data: FixtureData) {}
  @Year() private year!: ResolvedAcademicYear;
  @Get('/') @isAdministrator() @McpTool({ description: 'Fixture classes', readOnly: true })
  get_classes() { return this.data.identities ? [{ id: 'fifth', name: `CM2 ${this.year.label}`, level: '5', sections: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] },
    { id: 'other', name: 'CE2', level: '3', sections: [] }] : this.data.qualified ? [{ id: 'fourth', name: `Fourth ${this.year.label}`, level: '4', sections: [{ id: 'a', name: 'A' }] },
    {id:'sixth',name:`Sixth ${this.year.label}`,level:'6 AEP',sections:[{id:'sixth-a',name:'A'}]}] : []; }
}
@Controller('/fixture-attendance') @ToolGroup('attendance')
class AttendanceLists {
  @Year() private year!: ResolvedAcademicYear;
  @Get('/') @isAdministrator() @McpTool({ description: 'Fixture attendance', readOnly: true })
  get_today_students() { return []; }
  @Get('/all') @isAdministrator() @McpTool({ description: 'Fixture year student attendance', readOnly: true })
  get_all() { return [{ id: 'absence', type: 'student', status: 'absent', date: `${this.year.label.slice(0,4)}-09-15`, student: { name: 'Salma' } },
    { id: 'present', type: 'student', status: 'present', date: `${this.year.label.slice(0,4)}-09-15`, student: { name: 'Present Student' } }]; }
}
@Controller('/fixture-exams') @ToolGroup('exams')
class ExamLists {
  @Year() private year!: ResolvedAcademicYear;
  @Get('/') @isAdministrator() @McpTool({ description: 'Fixture upcoming exams', readOnly: true })
  get_upcoming_exams() {
    return [{ title: `Exam ${this.year.label}`, class: { name: 'Class A' }, section: { name: 'A' },
      date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), startTime: '08:00', endTime: '09:00' }];
  }
  @Get('/all') @isAdministrator() @McpTool({ description: 'Fixture all year exams', readOnly: true })
  get_all() {
    const start = this.year.label.slice(0, 4);
    return [{ id: 'past', date: `${start}-10-01` }, { id: 'future', date: `${start}-10-31` },
      { id: 'next-month', date: `${start}-11-01` }, ...(this.year.label === '2026-2027' ? [{ id: 'extra', date: `${start}-10-15` }] : [])];
  }
}

@Controller('/fixture-grades') @ToolGroup('grades')
class GradeLists {
  constructor(private data: FixtureData) {}
  @Year() private year!: ResolvedAcademicYear;
  @Get('/') @isAdministrator() @McpTool({ description: 'Fixture selected-year grades', readOnly: true })
  get_all() { return this.data.qualified ? [{ id: 'grade-m', class: { id: 'fourth' }, subject: { id: 'math-id' },
    student: { name: 'Salma' }, marksObtained: this.year.label === '2025-2026' ? '12.00' : '16.00',
    assessment: { id: 'assessment', title: `Maths ${this.year.label}`, date: `${this.year.label.slice(0, 4)}-10-02`, totalMarks: '20.00' }, exam: null },
    { id: 'grade-p', class: { id: 'fourth' }, subject: { id: 'physics-id' }, student: { name: 'Wrong Subject' } }] : []; }
}

/** Fully local: fake settings/classifier/model and synthetic repositories, real guards/MCP/year scope. */
export async function createJevFixture(options: { qualifiedData?: boolean; identityData?: boolean; timeZone?: string;
  extraControllers?: Record<string, new (...args: any[]) => any> } = {}) {
  let markedFixture = true;
  const permissions: Array<{ id: string; name: string; resource: string; action: string }> = [];
  const grantIds = new Set<string>();
  const events: ChatDiagnostics[] = [];
  const settings = { getInternal: async () => ({ provider: 'openrouter', apiKey: 'fixture-unused-key',
    isEnabled: true, model: 'openai/gpt-oss-120b', useMemory: false }) };
  const classifier = new JevIntentClassifier(settings as any);
  let decisions = 0, generations = 0, routingCalls = 0;
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
      ...schoolMcpYearHooks(['students', 'teachers', 'classes', 'attendance', 'exams', 'grades']) }))
    .load({ AuthGuard, ChatController, JevBenchmarkController, JevBenchmarkService,
      AcademicYearValidator, AcademicYearRepository, SchoolChatContextProvider,
      StudentCounts, TeacherCounts, SubjectLists, ClassLists, AttendanceLists, ExamLists, GradeLists, ...options.extraControllers });
  const roleGuard = getGuardMetadata(JevBenchmarkController, 'status').find(guard => guard.guardClass.name === 'RoleGuard')!.guardClass;
  server.load(roleGuard);
  const container = server.container;
  container.set(FixtureData, new FixtureData(options.qualifiedData, options.identityData));
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
  container.set(SettingsRepository, { getPublicSettings: async () => ({ timeZone: options.timeZone ?? 'UTC' }) } as any);
  for (const token of [ParentRepository, TeacherRepository, StudentRepository]) container.set(token, { getByUserId: async () => null } as any);
  container.set(ParentChildrenRepository, { getChildren: async () => [] } as any);
  container.set(TOOL_PROVIDER, { findRelevantTools: async (query: string) => {
    routingCalls++;
    await new Promise(resolve => setTimeout(resolve, 20));
    const kind = schoolFilteredReplyKind(query);
    const names = kind === 'girls' ? ['students_get_students'] : kind === 'maths-teachers' ? ['teachers_get_teachers','subjects_get_subjects']
      : kind === 'teacher-count' ? ['teachers_get_teacher_count']
      : kind === 'combined-total' || kind === 'separate-counts' ? ['students_get_student_count','teachers_get_teacher_count']
        : kind === 'upcoming-exams' ? ['exams_get_upcoming_exams']
          : kind === 'previous-month-absences' ? ['attendance_get_all']
            : kind === 'monthly-exams' ? ['exams_get_all'] : kind === 'large-classes' || kind === 'sixth-primary-count' ? ['classes_get_classes','students_get_students']
            : kind === 'all-classes' ? ['classes_get_classes'] : kind === 'fourth-maths-grades' ? ['classes_get_classes','subjects_get_subjects','grades_get_all'] : [];
    const registry = container.get(MCP_REGISTRY) as { tools: Array<{ name: string }> };
    return { status: 'routed', tools: registry.tools.filter(tool => names.includes(tool.name)) };
  } } as any);
  const config: ChatbotConfig = {
    reply: { detectLanguage: schoolReplyLanguage, template: request => schoolReplyTemplate(request, schoolChatYearContext.getStore()?.academicYear, schoolChatYearContext.getStore()?.role,
      schoolChatYearContext.getStore()?.schoolDate, schoolChatYearContext.getStore()?.teacherId, schoolChatYearContext.getStore()?.studentId,
      schoolChatYearContext.getStore()?.children, schoolChatYearContext.getStore()?.studentName),
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
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'X-Academic-Year': year, 'x-request-id': correlation,
        ...(role ? { 'x-test-role': role } : {}), ...(actorId ? { 'x-test-actor-id': actorId } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
  }
  return { server, classifier, events, call, counts: () => ({ decisions, generations }),
    routingCalls: () => routingCalls,
    setMarkedFixture: (value: boolean) => { markedFixture = value; },
    readGrants: () => permissions.filter(item => grantIds.has(item.id)).map(item => ({ ...item })) };
}
