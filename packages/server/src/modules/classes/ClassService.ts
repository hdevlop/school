import { Service } from '../../najm';
import { ClassRepository } from './ClassRepository';
import { ClassValidator } from './ClassValidator';
import type { CreateClassDto, CreateClassesBulkDto, UpdateClassDto } from './ClassDto';
import { SettingsRepository } from '../settings/SettingsRepository';
import { getCurrentAcademicYear } from '../financial/utils';
import { AcademicYearValidator, type ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';

@Service()
export class ClassService {

  constructor(
    private classRepository: ClassRepository,
    private classValidator: ClassValidator,
    private settingsRepository: SettingsRepository,
    private academicYears: AcademicYearValidator,
  ) { }

  async getAll(year: ResolvedAcademicYear) {
    return this.classRepository.getAll(year.label);
  }

  async getCount() {
    return await this.classRepository.getCount();
  }

  async getById(id: string, role?: string) {
    return (await this.getWithYear(id, role)).schoolClass;
  }

  // A class belongs to the year it was registered for: that year, not the
  // selected one, decides whether the role may read it and what its students,
  // parents and counts are.
  private async getWithYear(id: string, role?: string) {
    const schoolClass = await this.classValidator.ensureExists(id);
    const year = await this.academicYears.resolve(schoolClass.academicYear, role);
    return { schoolClass, year };
  }

  async getByAcademicYear(academicYear: string) {
    return await this.classRepository.getByAcademicYear(academicYear);
  }

  async getSections(classId: string, role?: string) {
    await this.getWithYear(classId, role);
    return await this.classRepository.getClassSections(classId);
  }

  async getStudents(classId: string, role?: string) {
    const { year } = await this.getWithYear(classId, role);
    return await this.classRepository.getClassStudents(classId, year.id);
  }

  async getTeachers(classId: string, role?: string) {
    await this.getWithYear(classId, role);
    return await this.classRepository.getTeachers(classId);
  }

  async getSubjects(classId: string, role?: string) {
    await this.getWithYear(classId, role);
    return await this.classRepository.getClassSubjects(classId);
  }

  async getParents(classId: string, role?: string) {
    const { year } = await this.getWithYear(classId, role);
    return await this.classRepository.getParents(classId, year.id);
  }

  async getAnalytics(classId: string, role?: string) {
    const { year } = await this.getWithYear(classId, role);
    return await this.classRepository.getAnalytics(classId, year.id);
  }

  async getStudentsByName(className: string, sectionName: string | null = null) {
    await this.classValidator.ensureExistsByName(className);
    const settings = await this.settingsRepository.getPublicSettings();
    return await this.classRepository.getStudentsByClassName(
      className, sectionName, settings?.currentAcademicYear || getCurrentAcademicYear(),
    );
  }

  async create(data: CreateClassDto, role?: string) {
    await this.academicYears.resolve(data.academicYear, role);
    await this.classValidator.ensureNameUnique(data.name, data.academicYear);
    return await this.classRepository.create(data);
  }

  async update(id: string, data: UpdateClassDto, role?: string) {
    const currentClass = await this.classValidator.ensureExists(id);

    if (data.academicYear && data.academicYear !== currentClass.academicYear) {
      await this.academicYears.resolve(data.academicYear, role);
      await this.classValidator.ensureHasNoSections(id);
    }

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
      } catch (error: any) {
        if (error?.status === 409) continue;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to seed class ${classData.name}: ${message}`);
      }
    }

    return createdClasses;
  }
}
