import { Service } from '../../najm';
import { ClassRepository } from './ClassRepository';
import { ClassValidator } from './ClassValidator';
import type { CreateClassDto, CreateClassesBulkDto, UpdateClassDto } from './ClassDto';
import { SettingsRepository } from '../settings/SettingsRepository';
import { getCurrentAcademicYear } from '../financial/utils';

@Service()
export class ClassService {

  constructor(
    private classRepository: ClassRepository,
    private classValidator: ClassValidator,
    private settingsRepository: SettingsRepository,
  ) { }

  // The selected year's classes. A class belongs to the year it was
  // registered for, so its students, parents and counts come from that year.
  async getAll() {
    return this.classRepository.getAll();
  }

  async getCount() {
    return await this.classRepository.getCount();
  }

  async getById(id: string) {
    return this.classValidator.ensureInSelectedYear(id);
  }

  async getSections(classId: string) {
    await this.classValidator.ensureInSelectedYear(classId);
    return await this.classRepository.getClassSections(classId);
  }

  async getStudents(classId: string) {
    await this.classValidator.ensureInSelectedYear(classId);
    return await this.classRepository.getClassStudents(classId);
  }

  async getStudentCount(classId: string) {
    const students = await this.getStudents(classId);
    return { count: students.length };
  }

  async getTeachers(classId: string) {
    await this.classValidator.ensureInSelectedYear(classId);
    return await this.classRepository.getTeachers(classId);
  }

  async getSubjects(classId: string) {
    await this.classValidator.ensureInSelectedYear(classId);
    return await this.classRepository.getClassSubjects(classId);
  }

  async getParents(classId: string) {
    await this.classValidator.ensureInSelectedYear(classId);
    return await this.classRepository.getParents(classId);
  }

  async getAnalytics(classId: string) {
    await this.classValidator.ensureInSelectedYear(classId);
    return await this.classRepository.getAnalytics(classId);
  }

  async getStudentsByName(className: string, sectionName: string | null = null) {
    await this.classValidator.ensureExistsByName(className);
    const settings = await this.settingsRepository.getPublicSettings();
    return await this.classRepository.getStudentsByClassName(
      className, sectionName, settings?.currentAcademicYear || getCurrentAcademicYear(),
    );
  }

  // A new class takes the selected year; the repository stamps it.
  async create(data: CreateClassDto) {
    await this.classValidator.ensureNameUnique(data.name);
    return await this.classRepository.create(data);
  }

  // A class keeps its year: only the selected year's classes can be edited.
  async update(id: string, data: UpdateClassDto) {
    await this.classValidator.ensureInSelectedYear(id);
    if (data.name) {
      await this.classValidator.ensureNameUnique(data.name, undefined, id);
    }
    return await this.classRepository.update(id, data);
  }

  async delete(id: string) {
    await this.classValidator.ensureInSelectedYear(id);
    await this.classValidator.ensureHasNoSections(id);
    return await this.classRepository.delete(id);
  }

  // The selected year's classes only.
  async deleteAll() {
    return await this.classRepository.deleteAll();
  }

  async clearForSeedReset() {
    await this.classRepository.clearForSeedReset();
  }

  // Trusted seed data: each class names its own year.
  async seedDemoClasses(classesData: CreateClassesBulkDto) {
    const createdClasses = [];
    for (const classData of classesData) {
      try {
        await this.classValidator.ensureNameUnique(classData.name, classData.academicYear);
        const classEntity = await this.classRepository.createForSeed(classData);
        createdClasses.push(classEntity);
      } catch (error: any) {
        if (error?.status === 409) continue;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to seed class ${classData.name}: ${message}`);
      }
    }

    return createdClasses;
  }
}
