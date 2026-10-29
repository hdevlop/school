import { Service, Transaction } from '../../najm';
import { schoolCycleForLevel } from '@sms/contracts';
import { ClassRepository } from './ClassRepository';
import { ClassValidator } from './ClassValidator';
import type { CreateClassDto, CreateClassesBulkDto, UpdateClassDto } from './ClassDto';
import { SettingsRepository } from '../settings/SettingsRepository';
import { SectionService } from '../sections/SectionService';
import { getCurrentAcademicYear } from '../financial/utils';

@Service()
export class ClassService {

  constructor(
    private classRepository: ClassRepository,
    private classValidator: ClassValidator,
    private settingsRepository: SettingsRepository,
    private sectionService: SectionService,
  ) { }

  // The selected year's classes. A class belongs to the year it was
  // registered for, so its students, parents and counts come from that year.
  async getAll() {
    return this.withSectionRosterCounts(await this.classRepository.getAll());
  }

  private async withSectionRosterCounts(rows: Awaited<ReturnType<ClassRepository['getAll']>>) {
    const counts = new Map((await this.classRepository.getSectionRosterCounts(rows.map(row => row.id)))
      .map(row => [row.id, row]));
    return rows.map(row => ({ ...row, sections: (Array.isArray(row.sections) ? row.sections : [])
      .filter((section: { id?: string }) => Boolean(section?.id))
      .map((section: { id: string; name: string }) => ({ ...section, ...counts.get(section.id) })) }));
  }

  async getCount() {
    return await this.classRepository.getCount();
  }

  async getById(id: string) {
    return (await this.withSectionRosterCounts([await this.classValidator.ensureInSelectedYear(id)]))[0];
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
    const schoolClass = await this.classValidator.ensureExistsByName(className);
    const settings = await this.settingsRepository.getPublicSettings();
    return await this.classRepository.getStudentsByClassName(
      schoolClass.name, sectionName, settings?.currentAcademicYear || getCurrentAcademicYear(),
    );
  }

  // A new class takes the selected year; the repository stamps it.
  async create(data: CreateClassDto) {
    await this.classValidator.ensureNameUnique(data.name);
    await this.classValidator.ensureCycleSelectable(data.cycleId);
    return await this.classRepository.create(data);
  }

  // A class keeps its year: only the selected year's classes can be edited.
  async update(id: string, data: UpdateClassDto) {
    const current = await this.classValidator.ensureInSelectedYear(id);
    await this.classValidator.ensureCycleSelectable(data.cycleId, current.cycleId);
    if (data.name) {
      await this.classValidator.ensureNameUnique(data.name, undefined, id);
    }
    return await this.classRepository.update(id, data);
  }

  @Transaction()
  async delete(id: string) {
    await this.classValidator.ensureInSelectedYear(id);
    await this.classRepository.lockForMutation(id);
    await this.classValidator.ensureHasNoStaff(id);
    const sections = await this.classRepository.getClassSections(id);
    // Reuse section deletion checks and roll back the whole class if any
    // section still holds students, history or staff assignments.
    for (const section of sections.sort((a, b) => a.id.localeCompare(b.id))) {
      await this.sectionService.delete(section.id);
    }
    return await this.classRepository.delete(id);
  }

  // The selected year's classes only.
  @Transaction()
  async deleteAll() {
    const rows = await this.classRepository.getAll();
    for (const row of [...rows].sort((a, b) => a.id.localeCompare(b.id))) await this.delete(row.id);
    return { deletedCount: rows.length, deletedClasses: rows };
  }

  async clearForSeedReset() {
    await this.classRepository.clearForSeedReset();
  }

  // Trusted seed data: each class names its own year.
  async seedDemoClasses(classesData: CreateClassesBulkDto) {
    const createdClasses = [];
    for (const classData of classesData) {
      try {
        const stage = schoolCycleForLevel(classData.level);
        const cycle = !classData.cycleId && stage
          ? await this.classRepository.findDefaultCycle([stage.name, ...Object.values(stage.labels)]) : null;
        const cycleId = classData.cycleId ?? cycle?.id;
        // A class an earlier run made before its cycle existed joins it now;
        // one that already has a cycle keeps it.
        const existing = await this.classRepository.getByName(classData.name, classData.academicYear);
        if (existing && !existing.cycleId && cycleId) await this.classRepository.setSeedCycle(existing.id, cycleId);
        await this.classValidator.ensureNameUnique(classData.name, classData.academicYear);
        const classEntity = await this.classRepository.createForSeed({ ...classData, cycleId });
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
