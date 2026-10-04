import { canUseOtherAcademicYears } from '@sms/contracts/academic-years';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { ChatbotContextProvider } from 'najm-chatbot';
import { KnowledgeContextProvider } from 'najm-rag';
import { Service } from '../../najm';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { SettingsRepository } from '../settings/SettingsRepository';
import { schoolClock } from '../dashboard/teacher/teacherDashboardMetrics';
import { getBusinessDateOverride } from '../../shared/businessDate';
import { ParentRepository } from '../parents/ParentRepository';
import { ParentChildrenRepository } from '../parents/ParentChildrenRepository';
import { TeacherRepository } from '../teachers/TeacherRepository';
import { StudentRepository } from '../students/StudentRepository';
import { schoolReplyContext } from './schoolReplyContext';

// A snapshot of the validated year for prompt text and MCP arguments; the
// shared year boundary remains the only resolver and authorization owner.
export const schoolChatYearContext = new AsyncLocalStorage<{ prompt: string; academicYear: string }>();

export interface ChatActor { id?: string; role?: string }

/** Adds validated School context while preserving the existing knowledge provider. */
@Service()
export class SchoolChatContextProvider implements ChatbotContextProvider {
  @Year() private readonly year!: ResolvedAcademicYear;

  constructor(
    private knowledge: KnowledgeContextProvider,
    private settings: SettingsRepository,
    private parents: ParentRepository,
    private parentChildren: ParentChildrenRepository,
    private teachers: TeacherRepository,
    private students: StudentRepository,
  ) {}

  /** Read per request: a date fixed at startup goes stale overnight and ignores the school's zone. */
  async describeToday(now = new Date()) {
    const timeZone = (await this.settings.getPublicSettings())?.timeZone || 'UTC';
    const today = schoolClock(timeZone, now, getBusinessDateOverride());
    return `Today is ${today.weekday} ${today.date} (YYYY-MM-DD) in the school's time zone, ${timeZone}.`;
  }

  async describe(actor: ChatActor = {}, now = new Date()) {
    return [await this.describeToday(now), this.describeYear(actor.role), await this.describeActor(actor)]
      .filter(Boolean).join('\n');
  }

  async snapshot(actor: ChatActor = {}) {
    return { prompt: await this.describe(actor), academicYear: this.year.label };
  }

  /**
   * The signed-in person's own record. Profile tools take a parentId,
   * teacherId or studentId that the model cannot otherwise know, so "my
   * children" or "my grades" failed. The repositories read through each
   * role's ownership rules, and the tools still check every id they receive.
   * A failed lookup leaves the line out rather than failing the chat.
   */
  async describeActor({ id, role }: ChatActor): Promise<string | null> {
    if (!id) return null;
    try {
      if (role === 'parent') {
        const parent = await this.parents.getByUserId(id);
        if (!parent) return null;
        const children = await this.parentChildren.getChildren(parent.id);
        const listed = children.map((child) => {
          const place = [child.class?.name, child.section?.name].filter(Boolean).join(' ');
          return `${child.name} (studentId ${child.id}${place ? `, ${place}` : ''})`;
        });
        return [
          `The signed-in user is a parent, parentId ${parent.id}.`,
          listed.length ? `Their children this year: ${listed.join('; ')}.` : 'No child is linked to them this year.',
          '"My child" means one of these children; for their grades, attendance or overview use the student-profile tools with that studentId.',
        ].join(' ');
      }
      if (role === 'teacher') {
        const teacher = await this.teachers.getByUserId(id);
        return teacher ? `The signed-in user is a teacher, teacherId ${teacher.id}. For their own classes, students, schedule or pending grading use the teacher-profile tools with this teacherId.` : null;
      }
      if (role === 'student') {
        const student = await this.students.getByUserId(id);
        return student ? `The signed-in user is the student ${student.name}, studentId ${student.id}. "My" grades, attendance or overview mean this student: use the student-profile tools with this studentId.` : null;
      }
    } catch {
      return null;
    }
    return null;
  }

  describeYear(role?: string) {
    return [
      `The dashboard's selected academic year is ${this.year.label}.`,
      'Year-scoped tools return records for this selected year. Describe their results as belonging to this year only.',
      'A student admission/enrollmentDate or shared identity is not proof of membership in another academic year.',
      'For the total number of students, use students_get_student_count and report its exact count. Do not estimate totals by counting a long list yourself.',
      canUseOtherAcademicYears(role)
        ? 'If the user asks for another year, ask them to select that year in the dashboard before continuing.'
        : 'This account can access only the active academic year. If the user asks for another year, explain the access restriction and do not query historical records. Never describe this restriction as an empty historical result.',
    ].join('\n');
  }

  async getContext(userText: string, request?: { latestUserText: string; channel: string }) {
    const knowledge = await this.knowledge.getContext(userText);
    return [schoolChatYearContext.getStore()?.prompt, knowledge, schoolReplyContext(request?.latestUserText ?? userText)]
      .filter(Boolean).join('\n\n') || null;
  }

  getContextTrace(userText: string) {
    return this.knowledge.getContextTrace(userText);
  }
}
