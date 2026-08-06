import { Service, Err, I18n } from '@server/najm';
import { ClassRepository } from './ClassRepository';

@Service()
export class ClassValidator {
  @I18n('classes.errors') private t!: (key: string) => string;

  constructor(private classRepository: ClassRepository) { }

  async ensureExists(id: string) {
    const existingClass = await this.classRepository.getById(id);
    if (!existingClass) {
      Err(404, this.t('notFound'));
    }
    return existingClass;
  }

  async ensureExistsByName(name: string) {
    const existingClass = await this.classRepository.getByName(name);
    if (!existingClass) {
      Err(404, this.t('notFound'));
    }
    return existingClass;
  }

  async ensureNameUnique(name: string, excludeId?: string) {
    const existing = await this.classRepository.getByName(name);
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
    return this.ensureNameUnique(name, id);
  }

  async checkHasNoSections(classId: string) {
    return this.ensureHasNoSections(classId);
  }

  async validateClass(classId?: string, className?: string) {
    return this.ensureClassId(classId, className);
  }
}
