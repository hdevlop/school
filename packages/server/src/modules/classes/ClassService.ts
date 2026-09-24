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

  async getAll() {
    return await this.classRepository.getAll();
  }

  async getCount() {
    return await this.classRepository.getCount();
  }

  async getById(id: string) {
    return await this.classValidator.ensureExists(id);
  }

  async getByAcademicYear(academicYear: string) {
    return await this.classRepository.getByAcademicYear(academicYear);
  }

  async getSections(classId: string) {
    await this.classValidator.ensureExists(classId);
    return await this.classRepository.getClassSections(classId);
  }

  async getStudents(classId: string) {
    await this.classValidator.ensureExists(classId);
    return await this.classRepository.getClassStudents(classId);
  }

  async getTeachers(classId: string) {
    await this.classValidator.ensureExists(classId);
    return await this.classRepository.getTeachers(classId);
  }

  async getSubjects(classId: string) {
    await this.classValidator.ensureExists(classId);
    return await this.classRepository.getClassSubjects(classId);
  }

  async getParents(classId: string) {
    await this.classValidator.ensureExists(classId);
    return await this.classRepository.getParents(classId);
  }

  async getAnalytics(classId: string) {
    await this.classValidator.ensureExists(classId);
    return await this.classRepository.getAnalytics(classId);
  }

  async getStudentsByName(className: string, sectionName: string | null = null) {
    await this.classValidator.ensureExistsByName(className);
    const settings = await this.settingsRepository.getPublicSettings();
    return await this.classRepository.getStudentsByClassName(
      className, sectionName, settings?.currentAcademicYear || getCurrentAcademicYear(),
    );
  }

  async create(data: CreateClassDto) {
    await this.classValidator.ensureNameUnique(data.name, data.academicYear);
    return await this.classRepository.create(data);
  }

  async update(id: string, data: UpdateClassDto) {
    const currentClass = await this.classValidator.ensureExists(id);

    if (data.name || data.academicYear) {
      await this.classValidator.ensureNameUnique(
        data.name || currentClass.name,
        data.academicYear || currentClass.academicYear,
        id,
      );
    }

    return await this.classRepository.update(id, data);
  }

  async delete(id: string) {
    await this.classValidator.ensureExists(id);
    await this.classValidator.ensureHasNoSections(id);
    return await this.classRepository.delete(id);
  }

  async deleteAll() {
    return await this.classRepository.deleteAll();
  }

  async seedDemoClasses(classesData: CreateClassesBulkDto) {
    const createdClasses = [];
    for (const classData of classesData) {
      try {
        const classEntity = await this.create(classData);
        createdClasses.push(classEntity);
      } catch {
        continue;
      }
    }

    return createdClasses;
  }
}
