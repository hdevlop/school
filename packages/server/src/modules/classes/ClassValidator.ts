import { Service, Err, I18n } from '../../najm';
import { ClassRepository } from './ClassRepository';
import { SettingsRepository } from '../settings/SettingsRepository';
import { getCurrentAcademicYear } from '../financial/utils';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';

@Service()
export class ClassValidator {
  @I18n('classes.errors') private t!: (key: string) => string;
  @Year() private readonly year!: ResolvedAcademicYear;

  constructor(
    private classRepository: ClassRepository,
    private settingsRepository: SettingsRepository,
  ) { }

  private async activeAcademicYear() {
    const settings = await this.settingsRepository.getPublicSettings();
    return settings?.currentAcademicYear || getCurrentAcademicYear();
  }

  // The selected year's class; another year's reads as not found.
  async ensureInSelectedYear(id: string) {
    const existingClass = await this.classRepository.getInSelectedYear(id);
    if (!existingClass) {
      Err(404, this.t('notFound'));
    }
    return existingClass;
  }

  // Any year's class, for modules that apply their own year rule to it.
  async ensureExists(id: string) {
    const existingClass = await this.classRepository.getById(id);
    if (!existingClass) {
      Err(404, this.t('notFound'));
    }
    return existingClass;
  }

  async ensureExistsByName(name: string) {
    const existingClass = await this.classRepository.getByName(name, await this.activeAcademicYear());
    if (!existingClass) {
      Err(404, this.t('notFound'));
    }
    return existingClass;
  }

  // Unique within one year: the selected year unless a trusted seed names one.
  async ensureNameUnique(name: string, academicYear = this.year.label, excludeId?: string) {
    const existing = await this.classRepository.getByName(name, academicYear);
    if (existing && existing.id !== excludeId) {
      Err(409, this.t('nameExists'));
    }
  }

  async ensureHasNoSections(classId: string) {
    const hasSections = await this.classRepository.checkClassHasSections(classId);
    if (hasSections) {
      Err(409, this.t('hasSections'));
    }
  }

  async ensureClassId(classId?: string, className?: string) {
    if (!classId && !className) {
      Err(400, this.t('classRequired'));
    }

    if (classId) {
      const classEntity = await this.ensureExists(classId);
      return classEntity.id;
    }

    if (className) {
      const classEntity = await this.ensureExistsByName(className);
      return classEntity.id;
    }
  }

  async checkExists(id: string) {
    return this.ensureExists(id);
  }

  async checkExistsByName(name: string) {
    return this.ensureExistsByName(name);
  }

  async checkNameUnique(name: string) {
    return this.ensureNameUnique(name);
  }

  async checkNameUniqueForUpdate(id: string, name?: string) {
    if (!name) return;
    const currentClass = await this.ensureExists(id);
    return this.ensureNameUnique(name, currentClass.academicYear, id);
  }

  async checkHasNoSections(classId: string) {
    return this.ensureHasNoSections(classId);
  }

  async validateClass(classId?: string, className?: string) {
    return this.ensureClassId(classId, className);
  }
}
