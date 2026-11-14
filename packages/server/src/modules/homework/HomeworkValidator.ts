import { HOMEWORK_LIMITS as limits } from '@sms/contracts';
import { Err, I18n, Service } from '../../najm';
import { SCHOOL_WIDE_ROLES } from '../../auth';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { Year } from '../academicYears/requestYear';
import { SectionValidator } from '../sections/SectionValidator';
import { HomeworkRepository, type HomeworkReader } from './HomeworkRepository';
import { matchPart } from './homeworkParts';

export type HomeworkActor = { id: string; role?: string | null };

const isSchoolWide = (actor: HomeworkActor) => SCHOOL_WIDE_ROLES.includes(actor.role ?? '');

@Service()
export class HomeworkValidator {
  @Year() private readonly year!: ResolvedAcademicYear;
  @I18n('homework.errors') private ht!: (key: string, params?: Record<string, unknown>) => string;

  constructor(
    private repository: HomeworkRepository,
    private sectionValidator: SectionValidator,
  ) {}

  /** The homework as this reader may see it; another class's or year's reads as not found. */
  async ensureExists(id: string, reader?: HomeworkReader) {
    const row = await this.repository.getById(id, reader);
    if (!row) Err(404, this.ht('notFound'));
    return row;
  }

  async ensureSectionExists(sectionId: string) {
    return this.sectionValidator.ensureExists(sectionId);
  }

  /**
   * Who may post or change homework once the route's permission let them in:
   * a teacher, for their own classes, and the school-wide roles. A monitor or
   * supervisor reads the homework of their classes and writes none.
   */
  ensureMayWrite(actor: HomeworkActor) {
    if (actor.role !== 'teacher' && !isSchoolWide(actor)) Err(403, this.ht('writeNotAllowed'));
  }

  /** The teacher the homework is posted as: a teacher is always themselves. */
  async resolveTeacherId(actor: HomeworkActor, requested?: string | null) {
    this.ensureMayWrite(actor);
    if (actor.role === 'teacher') {
      const own = await this.repository.teacherIdOfUser(actor.id);
      if (!own) Err(403, this.ht('noTeacherRecord'));
      return own!;
    }
    if (!requested) Err(400, this.ht('teacherRequired'));
    return requested!;
  }

  /** The teacher's assignment in every target section; the first one carries the homework. */
  async ensureAssignments(teacherId: string, subjectId: string, sectionIds: string[]) {
    const ids = await Promise.all(sectionIds.map((sectionId) =>
      this.repository.findAssignment(teacherId, subjectId, sectionId)));
    if (ids.some((id) => !id)) Err(409, this.ht('notAssigned'));
    return ids as string[];
  }

  /** Homework is written in the year the request selected: its sections' year must be that one. */
  ensureSelectedYear(yearId: string) {
    if (yearId !== this.year.id) Err(409, this.ht('outsideSelectedYear'));
  }

  ensureSameYear(currentYearId: string | null, yearId: string) {
    if (currentYearId && currentYearId !== yearId) Err(409, this.ht('yearCannotChange'));
  }

  ensureDueAfterGiven(date: string, dueOn?: string | null) {
    if (dueOn && dueOn < date) Err(400, this.ht('dueBeforeGiven'));
  }

  /** The part as the class is taught it, or null when the subject is not taught with that part there. */
  async findPart(name: string, subjectId: string, sectionIds: string[]) {
    return matchPart(await this.repository.partsFor(subjectId, { sectionIds }), name);
  }

  async ensurePart(name: string, subjectId: string, sectionIds: string[]) {
    const part = await this.findPart(name, subjectId, sectionIds);
    if (!part) Err(400, this.ht('subSubjectMismatch'));
    return part as string;
  }

  async ensureAssessmentMatches(assessmentId: string, teacherId: string, subjectId: string) {
    if (!await this.repository.assessmentMatches(assessmentId, teacherId, subjectId)) {
      Err(409, this.ht('assessmentMismatch'));
    }
  }

  /** Only a parent marks homework seen, and only for a child it was given to. */
  async ensureParentOfChild(homeworkId: string, studentId: string, actor: HomeworkActor) {
    if (actor.role !== 'parent') Err(403, this.ht('parentOnly'));
    if (!await this.repository.isChildOfParentInHomework(homeworkId, studentId, actor.id)) {
      Err(403, this.ht('notYourChild'));
    }
  }

  // Attachments. The limits are the shared ones the form shows.

  ensureFilesProvided(count: number) {
    if (!count) Err(400, this.ht('noFile'));
  }

  ensureAttachmentRoom(existing: number, added: number) {
    if (existing + added > limits.attachments) Err(400, this.ht('tooManyFiles', { max: limits.attachments }));
  }

  ensureImageUploadSize(bytes: number) {
    if (bytes > limits.imageUploadBytes) Err(413, this.ht('imageTooLarge', { max: megabytes(limits.imageUploadBytes) }));
  }

  ensurePdfSize(bytes: number) {
    if (bytes > limits.pdfBytes) Err(413, this.ht('pdfTooLarge', { max: megabytes(limits.pdfBytes) }));
  }

  ensureStoredImageSize(bytes: number) {
    if (bytes > limits.storedImageBytes) Err(413, this.ht('storedImageTooLarge', { max: megabytes(limits.storedImageBytes) }));
  }

  refuseUnsupportedFile(): never {
    return Err(415, this.ht('unsupportedFile')) as never;
  }

  ensureWithinQuota(liveBytes: number, addedBytes: number, quotaMb: number) {
    if (liveBytes + addedBytes > quotaMb * 1024 * 1024) Err(409, this.ht('quotaExceeded', { max: quotaMb }));
  }

  ensureAttachmentExists<T>(attachment: T | undefined): T {
    if (!attachment) Err(404, this.ht('attachmentNotFound'));
    return attachment!;
  }

  ensureAttachmentLive(attachment: { purgedAt: string | null }) {
    if (attachment.purgedAt) Err(410, this.ht('attachmentPurged'));
  }

  ensureFileStored<T>(bytes: T | null | undefined): T {
    if (!bytes) Err(404, this.ht('attachmentMissing'));
    return bytes!;
  }
}

const megabytes = (bytes: number) => Math.round(bytes / (1024 * 1024));
