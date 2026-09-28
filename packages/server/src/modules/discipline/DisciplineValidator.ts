import { Err, I18n, Service } from '../../najm';
import { DisciplineRepository } from './DisciplineRepository';

export type DisciplineUser = { id: string; role?: string };

@Service()
export class DisciplineValidator {
  @I18n('discipline.errors') private t!: (key: string) => string;

  constructor(private repository: DisciplineRepository) {}

  async ensureExists(id: string) {
    const record = await this.repository.getById(id);
    if (!record) Err(404, this.t('notFound'));
    return record!;
  }

  /**
   * The class and section the student was placed in on the incident's day,
   * which must fall in the selected year. A past-dated incident takes the class
   * of that day, not the student's current one.
   */
  async ensureStudentPlacedOn(studentId: string, incidentAt: string) {
    const student = await this.repository.getStudentPlacementOn(studentId, incidentAt);
    if (!student) Err(404, this.t('studentNotFound'));
    if (!student!.inSelectedYear) Err(409, this.t('outsideSelectedYear'));
    if (!student!.classId || !student!.sectionId) Err(409, this.t('notPlacedOnDate'));
    return { classId: student!.classId!, sectionId: student!.sectionId! };
  }

  async ensureTeacherMayReport(user: DisciplineUser, sectionId: string) {
    if (user.role !== 'teacher') return;
    if (!(await this.repository.isTeacherAssignedToSection(user.id, sectionId))) {
      Err(403, this.t('teacherStudentForbidden'));
    }
  }

  ensureOpen(record: { status: string }) {
    if (record.status !== 'open') Err(409, this.t('recordNotOpen'));
  }

  ensureResolved(record: { status: string }) {
    if (record.status !== 'resolved') Err(409, this.t('recordNotResolved'));
  }

  ensureEditable(record: { reportedBy: string; status: string }, user: DisciplineUser) {
    this.ensureOpen(record);
    if (user.role === 'teacher' && record.reportedBy !== user.id) Err(403, this.t('recordForbidden'));
  }

  ensureAdministrator(user: DisciplineUser) {
    if (user.role !== 'admin') Err(403, this.t('adminRequired'));
  }

  ensureIncidentDate(value: string) {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) Err(400, this.t('invalidIncidentDate'));
    if (timestamp > Date.now() + 5 * 60 * 1000) Err(400, this.t('futureIncidentDate'));
  }
}
