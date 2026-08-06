import { Service } from '@server/najm';
import { SectionRepository } from './SectionRepository';
import { SectionValidator } from './SectionValidator';
import type { CreateSectionDto, CreateSectionsBulkDto, UpdateSectionDto } from './SectionDto';

@Service()
export class SectionService {
  constructor(
    private sectionRepository: SectionRepository,
    private sectionValidator: SectionValidator
  ) { }

  async getAll() {
    return await this.sectionRepository.getAll();
  }

  async getById(id: string) {
    return await this.sectionValidator.ensureExists(id);
  }

  async getStudents(sectionId: string) {
    await this.sectionValidator.ensureExists(sectionId);
    return await this.sectionRepository.getStudents(sectionId);
  }

  async getAnalytics(sectionId: string) {
    await this.sectionValidator.ensureExists(sectionId);
    return await this.sectionRepository.getAnalytics(sectionId);
  }

  async getClasses(sectionId: string) {
    await this.sectionValidator.ensureExists(sectionId);
    return await this.sectionRepository.getClasses(sectionId);
  }

  async getTeachers(sectionId: string) {
    await this.sectionValidator.ensureExists(sectionId);
    return await this.sectionRepository.getTeachers(sectionId);
  }

  async getParents(sectionId: string) {
    await this.sectionValidator.ensureExists(sectionId);
    return await this.sectionRepository.getParents(sectionId);
  }

  async create(data: CreateSectionDto) {
    await this.sectionValidator.ensureClassExists(data.classId);
    await this.sectionValidator.ensureNameUniqueInClass(
      data.classId,
      data.name
    );
    return await this.sectionRepository.create(data);
  }

  async update(id: string, data: UpdateSectionDto) {
    await this.sectionValidator.ensureExists(id);

    if (data.name || data.classId) {
      const currentSection = await this.sectionRepository.getById(id);
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
      } catch {
        continue;
      }
    }

    return createdSections;
  }
}
