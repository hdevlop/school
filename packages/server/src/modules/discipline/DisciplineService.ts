import { Service } from '@server/najm';
import { DisciplineRepository } from './DisciplineRepository';
import { DisciplineValidator, type DisciplineUser } from './DisciplineValidator';
import type { CreateDisciplineDto, ResolveDisciplineDto, UpdateDisciplineDto } from './DisciplineDto';

@Service()
export class DisciplineService {
  constructor(
    private repository: DisciplineRepository,
    private validator: DisciplineValidator,
  ) {}

  async list(user: DisciplineUser) {
    return this.repository.list(user.role === 'teacher' ? user.id : undefined);
  }

  async getById(id: string, user: DisciplineUser) {
    const record = await this.validator.ensureExists(id);
    this.validator.ensureReadable(record, user);
    return record;
  }

  async create(input: CreateDisciplineDto, user: DisciplineUser) {
    this.validator.ensureIncidentDate(input.incidentAt);
    const student = await this.validator.ensureStudentReady(input.studentId);
    await this.validator.ensureTeacherMayReport(user, student.sectionId);

    return this.repository.create({
      studentId: input.studentId,
      classId: student.classId,
      sectionId: student.sectionId,
      reportedBy: user.id,
      incidentAt: input.incidentAt,
      category: input.category,
      severity: input.severity,
      location: input.location || null,
      description: input.description,
      status: 'open',
      actionType: null,
      actionNote: null,
      resolutionNote: null,
      resolvedBy: null,
      resolvedAt: null,
    });
  }

  async update(id: string, input: UpdateDisciplineDto, user: DisciplineUser) {
    const record = await this.validator.ensureExists(id);
    this.validator.ensureEditable(record, user);

    const changes: Record<string, unknown> = {};
    if (input.studentId !== undefined) {
      const student = await this.validator.ensureStudentReady(input.studentId);
      await this.validator.ensureTeacherMayReport(user, student.sectionId);
      changes.studentId = input.studentId;
      changes.classId = student.classId;
      changes.sectionId = student.sectionId;
    }
    if (input.incidentAt !== undefined) {
      this.validator.ensureIncidentDate(input.incidentAt);
      changes.incidentAt = input.incidentAt;
    }
    if (input.category !== undefined) changes.category = input.category;
    if (input.severity !== undefined) changes.severity = input.severity;
    if (input.location !== undefined) changes.location = input.location || null;
    if (input.description !== undefined) changes.description = input.description;

    return this.repository.update(id, changes);
  }

  async resolve(id: string, input: ResolveDisciplineDto, user: DisciplineUser) {
    const record = await this.validator.ensureExists(id);
    this.validator.ensureOpen(record);
    return this.repository.update(id, {
      status: 'resolved',
      actionType: input.actionType,
      actionNote: input.actionNote || null,
      resolutionNote: input.resolutionNote,
      resolvedBy: user.id,
      resolvedAt: new Date().toISOString(),
    });
  }

  async reopen(id: string, user: DisciplineUser) {
    this.validator.ensureAdministrator(user);
    const record = await this.validator.ensureExists(id);
    this.validator.ensureResolved(record);
    return this.repository.update(id, {
      status: 'open',
      actionType: null,
      actionNote: null,
      resolutionNote: null,
      resolvedBy: null,
      resolvedAt: null,
    });
  }

  async delete(id: string, user: DisciplineUser) {
    this.validator.ensureAdministrator(user);
    await this.validator.ensureExists(id);
    return this.repository.delete(id);
  }

  async deleteAll() {
    return this.repository.deleteAll();
  }
}
