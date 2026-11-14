import { Inject, Service, Transaction, TransactionService } from '../../najm';
import { AcademicSourceService } from '../academicSources/AcademicSourceService';
import { HomeworkAttachmentService } from './HomeworkAttachmentService';
import type { CreateHomeworkDto, HomeworkPartsQuery, UpdateHomeworkDto } from './HomeworkDto';
import { HomeworkRepository, type HomeworkListFilters, type HomeworkReader } from './HomeworkRepository';
import { HomeworkValidator, type HomeworkActor } from './HomeworkValidator';

const sameSet = (a: string[], b: string[]) => [...a].sort().join('\0') === [...b].sort().join('\0');

@Service()
export class HomeworkService {
  @Inject(TransactionService) private transactions!: TransactionService;

  constructor(
    private repository: HomeworkRepository,
    private validator: HomeworkValidator,
    private sources: AcademicSourceService,
    private attachments: HomeworkAttachmentService,
  ) {}

  // A parent reads which of their children each homework is for; staff read
  // how many families have seen it. A pupil reads the homework alone.
  private reader(actor: HomeworkActor): HomeworkReader {
    if (actor.role === 'parent') return { parentUserId: actor.id };
    if (actor.role === 'student') return {};
    return { counts: true };
  }

  async getAll(filters: HomeworkListFilters, actor: HomeworkActor) {
    if (filters.sectionId) await this.validator.ensureSectionExists(filters.sectionId);
    return this.repository.getAll(filters, this.reader(actor));
  }

  async getById(id: string, actor: HomeworkActor) {
    return this.validator.ensureExists(id, this.reader(actor));
  }

  /** The parts the form offers for a subject in a class or its sections. */
  async parts(query: HomeworkPartsQuery) {
    return this.repository.partsFor(query.subjectId, { sectionIds: query.sectionIds, classId: query.classId });
  }

  async create(data: CreateHomeworkDto, actor: HomeworkActor) {
    const teacherId = await this.validator.resolveTeacherId(actor, data.teacherId);
    const sectionIds = [...new Set(data.sectionIds)];
    const year = await this.sources.ensureTargetsValid(sectionIds, data.date);
    this.validator.ensureSelectedYear(year.id);
    const [teacherAssignmentId] = await this.validator.ensureAssignments(teacherId, data.subjectId, sectionIds);
    if (data.assessmentId) await this.validator.ensureAssessmentMatches(data.assessmentId, teacherId, data.subjectId);
    const subSubject = data.subSubject ? await this.validator.ensurePart(data.subSubject, data.subjectId, sectionIds) : null;

    const created = await this.repository.create({
      teacherAssignmentId,
      subSubject,
      sectionIds,
      date: data.date,
      dueOn: data.dueOn ?? null,
      title: data.title,
      content: data.content || null,
      assessmentId: data.assessmentId ?? null,
    });
    return this.validator.ensureExists(created.id, this.reader(actor));
  }

  async update(id: string, data: UpdateHomeworkDto, actor: HomeworkActor) {
    const current = await this.validator.ensureExists(id);
    const currentTargets = current.sectionIds?.length ? current.sectionIds : current.section?.id ? [current.section.id] : [];
    const currentTeacherId = current.teacher?.id ?? undefined;
    const teacherId = await this.validator.resolveTeacherId(actor, data.teacherId ?? currentTeacherId);
    const sectionIds = data.sectionIds ? [...new Set(data.sectionIds)] : currentTargets;
    const subjectId = data.subjectId ?? current.subject?.id ?? '';
    const date = data.date ?? current.date;
    const dueOn = data.dueOn !== undefined ? data.dueOn : current.dueOn;
    this.validator.ensureDueAfterGiven(date, dueOn);

    const changes: Parameters<HomeworkRepository['update']>[1] = {};
    if (data.title !== undefined) changes.title = data.title;
    if (data.content !== undefined) changes.content = data.content || null;
    if (data.dueOn !== undefined) changes.dueOn = data.dueOn ?? null;
    if (data.date !== undefined) changes.date = data.date;

    const assignmentChanged = !sameSet(sectionIds, currentTargets)
      || teacherId !== currentTeacherId || subjectId !== current.subject?.id;
    if (assignmentChanged || date !== current.date) {
      const year = await this.sources.ensureTargetsValid(sectionIds, date);
      this.validator.ensureSelectedYear(year.id);
      this.validator.ensureSameYear(current.academicYearId, year.id);
    }
    if (assignmentChanged) {
      const [teacherAssignmentId] = await this.validator.ensureAssignments(teacherId, subjectId, sectionIds);
      changes.teacherAssignmentId = teacherAssignmentId;
      changes.sectionIds = sectionIds;
    }
    if (data.assessmentId !== undefined) {
      if (data.assessmentId) await this.validator.ensureAssessmentMatches(data.assessmentId, teacherId, subjectId);
      changes.assessmentId = data.assessmentId ?? null;
    }

    // The part is of the subject as the class is taught it. A part named in the
    // edit must be one; a kept part that the new subject or class does not
    // have is dropped. An edit that changes neither leaves it as posted.
    const currentPart = current.subSubject ?? null;
    if (data.subSubject !== undefined) {
      const part = data.subSubject ? await this.validator.ensurePart(data.subSubject, subjectId, sectionIds) : null;
      if (part !== currentPart) changes.subSubject = part;
    } else if (currentPart && assignmentChanged) {
      const part = await this.validator.findPart(currentPart, subjectId, sectionIds);
      if (part !== currentPart) changes.subSubject = part;
    }

    if (Object.keys(changes).length) await this.repository.update(id, changes);
    return this.validator.ensureExists(id, this.reader(actor));
  }

  /** The text goes with its attachment rows; their files go once nothing else points at them. */
  @Transaction()
  async delete(id: string, actor: HomeworkActor) {
    this.validator.ensureMayWrite(actor);
    const current = await this.validator.ensureExists(id);
    const files = await this.attachments.filesOf(id);
    await this.repository.delete(id);
    await this.transactions.afterCommit(() => this.attachments.removeUnreferenced(files));
    return current;
  }

  async addAttachments(id: string, uploads: File[], actor: HomeworkActor) {
    this.validator.ensureMayWrite(actor);
    return this.attachments.add(await this.validator.ensureExists(id), uploads);
  }

  async removeAttachment(id: string, attachmentId: string, actor: HomeworkActor) {
    this.validator.ensureMayWrite(actor);
    await this.validator.ensureExists(id);
    return this.attachments.remove(id, attachmentId);
  }

  /** A file is read only through its homework, which the reader must be able to see. */
  async readAttachment(id: string, attachmentId: string) {
    await this.validator.ensureExists(id);
    return this.attachments.read(id, attachmentId);
  }

  /** "Vu par le parent": once per parent and child. */
  async acknowledge(id: string, studentId: string, actor: HomeworkActor) {
    await this.validator.ensureExists(id);
    await this.validator.ensureParentOfChild(id, studentId, actor);
    const seen = await this.repository.acknowledge(id, studentId, actor.id);
    return { homeworkId: id, studentId, seenAt: seen?.seenAt ?? null };
  }

  async clearForSeedReset() {
    return this.repository.clearForSeedReset();
  }
}
