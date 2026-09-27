import { Service } from '../../najm';
import { SectionRepository } from './SectionRepository';
import { SectionValidator } from './SectionValidator';
import type { CreateSectionDto, CreateSectionsBulkDto, UpdateSectionDto } from './SectionDto';
import { AcademicYearValidator, type ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';

@Service()
export class SectionService {
  constructor(
    private sectionRepository: SectionRepository,
    private sectionValidator: SectionValidator,
    private academicYears: AcademicYearValidator,
  ) { }

  async getAll(year: ResolvedAcademicYear) {
    return this.sectionRepository.getAll(year.label);
  }

  async getById(id: string, role?: string) {
    return (await this.getWithYear(id, role)).section;
  }

  // A section belongs to its class's year: that year decides whether the role
  // may read it and which placements its students and parents come from.
  private async getWithYear(id: string, role?: string) {
    const section = await this.sectionValidator.ensureExists(id);
    const year = await this.academicYears.resolve(section.class.academicYear, role);
    return { section, year };
  }

  async getStudents(sectionId: string, role?: string) {
    const { year } = await this.getWithYear(sectionId, role);
    return await this.sectionRepository.getStudents(sectionId, year.id);
  }

  async getAnalytics(sectionId: string, role?: string) {
    const { year } = await this.getWithYear(sectionId, role);
    return await this.sectionRepository.getAnalytics(sectionId, year.id);
  }

  async getClasses(sectionId: string, role?: string) {
    await this.getWithYear(sectionId, role);
    return await this.sectionRepository.getClasses(sectionId);
  }

  async getTeachers(sectionId: string, role?: string) {
    await this.getWithYear(sectionId, role);
    return await this.sectionRepository.getTeachers(sectionId);
  }

  async getParents(sectionId: string, role?: string) {
    const { year } = await this.getWithYear(sectionId, role);
    return await this.sectionRepository.getParents(sectionId, year.id);
  }

  async create(data: CreateSectionDto, role?: string) {
    const schoolClass = await this.sectionValidator.ensureClassExists(data.classId);
    await this.academicYears.resolve(schoolClass.academicYear, role);
    await this.sectionValidator.ensureNameUniqueInClass(
      data.classId,
      data.name
    );
    return await this.sectionRepository.create(data);
  }

  async update(id: string, data: UpdateSectionDto, role?: string) {
    const currentSection = await this.sectionValidator.ensureExists(id);

    if (data.classId && data.classId !== currentSection.classId) {
      const schoolClass = await this.sectionValidator.ensureClassExists(data.classId);
      await this.academicYears.resolve(schoolClass.academicYear, role);
      await this.sectionValidator.ensureHasNoStudents(id);
    }

    if (data.name || data.classId) {
      const classId = data.classId || currentSection.classId;
      const name = data.name || currentSection.name;
      await this.sectionValidator.ensureNameUniqueInClass(classId, name, id);
    }

    return await this.sectionRepository.update(id, data);
  }


  async delete(id: string) {
    await this.sectionValidator.ensureExists(id);
    await this.sectionValidator.ensureHasNoStudents(id);
    return await this.sectionRepository.delete(id);
  }

  async deleteAll() {
    return await this.sectionRepository.deleteAll();
  }

  async seedDemoSections(sectionsData: CreateSectionsBulkDto) {
    const createdSections = [];

    for (const sectionData of sectionsData) {
      try {
        const sectionEntity = await this.create(sectionData);
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
