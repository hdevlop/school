import { Service, Transaction } from '../../najm';
import { SectionRepository } from './SectionRepository';
import { SectionValidator } from './SectionValidator';
import type { CreateSectionDto, CreateSectionsBulkDto, UpdateSectionDto } from './SectionDto';
import { StudentEnrollmentService } from '../studentEnrollments/StudentEnrollmentService';

@Service()
export class SectionService {
  constructor(
    private sectionRepository: SectionRepository,
    private sectionValidator: SectionValidator,
    private enrollments: StudentEnrollmentService,
  ) { }

  // The selected year's sections. A section belongs to its class's year, so
  // its students and parents come from that year's placements.
  async getAll() {
    return this.sectionRepository.getAll();
  }

  async getById(id: string) {
    return this.sectionValidator.ensureInSelectedYear(id);
  }

  async getStudents(sectionId: string) {
    await this.sectionValidator.ensureInSelectedYear(sectionId);
    return await this.sectionRepository.getStudents(sectionId);
  }

  async getAnalytics(sectionId: string) {
    await this.sectionValidator.ensureInSelectedYear(sectionId);
    return await this.sectionRepository.getAnalytics(sectionId);
  }

  async getClasses(sectionId: string) {
    await this.sectionValidator.ensureInSelectedYear(sectionId);
    return await this.sectionRepository.getClasses(sectionId);
  }

  async getTeachers(sectionId: string) {
    await this.sectionValidator.ensureInSelectedYear(sectionId);
    return await this.sectionRepository.getTeachers(sectionId);
  }

  async getParents(sectionId: string) {
    await this.sectionValidator.ensureInSelectedYear(sectionId);
    return await this.sectionRepository.getParents(sectionId);
  }

  // A new section joins a class of the selected year.
  async create(data: CreateSectionDto) {
    await this.sectionValidator.ensureClassInSelectedYear(data.classId);
    await this.sectionValidator.ensureNameUniqueInClass(
      data.classId,
      data.name
    );
    return await this.sectionRepository.create(data);
  }

  // Only the selected year's sections change, and only within that year.
  @Transaction()
  async update(id: string, data: UpdateSectionDto) {
    const currentSection = await this.sectionValidator.ensureInSelectedYear(id);
    await this.sectionRepository.lockForMutation(id);
    if (data.maxStudents !== undefined) {
      await this.enrollments.ensureSectionCapacity(id, null, null, { capacity: data.maxStudents, additionalStudents: 0 });
    }

    if (data.classId && data.classId !== currentSection.classId) {
      await this.sectionValidator.ensureClassInSelectedYear(data.classId);
      await this.sectionValidator.ensureHasNoStudents(id);
      await this.sectionValidator.ensureHasNoAssignments(id);
    }

    if (data.name || data.classId) {
      const classId = data.classId || currentSection.classId;
      const name = data.name || currentSection.name;
      await this.sectionValidator.ensureNameUniqueInClass(classId, name, id);
    }

    return await this.sectionRepository.update(id, data);
  }


  @Transaction()
  async delete(id: string) {
    await this.sectionValidator.ensureInSelectedYear(id);
    await this.sectionRepository.lockForMutation(id);
    await this.sectionValidator.ensureHasNoStudents(id);
    await this.sectionValidator.ensureHasNoAssignments(id);
    return await this.sectionRepository.delete(id);
  }

  // The selected year's sections only.
  @Transaction()
  async deleteAll() {
    const rows = await this.sectionRepository.getAll();
    for (const row of [...rows].sort((a, b) => a.id.localeCompare(b.id))) await this.delete(row.id);
    return { deletedCount: rows.length, deletedSections: rows };
  }

  async clearForSeedReset() {
    await this.sectionRepository.clearForSeedReset();
  }

  // Trusted seed data: each section joins its class in that class's year.
  async seedDemoSections(sectionsData: CreateSectionsBulkDto) {
    const createdSections = [];

    for (const sectionData of sectionsData) {
      try {
        await this.sectionValidator.ensureClassExists(sectionData.classId);
        await this.sectionValidator.ensureNameUniqueInClass(sectionData.classId, sectionData.name);
        const sectionEntity = await this.sectionRepository.create(sectionData);
        createdSections.push(sectionEntity);
      } catch (error: any) {
        if (error?.status === 409) continue;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to seed section ${sectionData.name}: ${message}`);
      }
    }

    return createdSections;
  }
}
