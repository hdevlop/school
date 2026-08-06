import { Service, Err, I18n, t } from '@server/najm';
import { SectionRepository } from './SectionRepository';
import { ClassRepository } from '../classes/ClassRepository';

@Service()
export class SectionValidator {
  @I18n('sections.errors') private t!: (key: string) => string;

  constructor(
    private sectionRepository: SectionRepository,
    private classRepository: ClassRepository
  ) {}

  async ensureExists(id: string) {
    const section = await this.sectionRepository.getById(id);
    if (!section) {
      Err(404, this.t('notFound'));
    }
    return section;
  }

  async ensureExistsByName(name: string, classId: string) {
    const classSections = await this.sectionRepository.getByClass(classId);
    const section = classSections.find(s => s.name === name);
    if (!section) {
      Err(404, this.t('notFound'));
    }
    return section;
  }

  async ensureSection(identifier: { id?: string; name?: string; classId?: string }) {
    if (identifier.id) {
      return this.ensureExists(identifier.id);
    }

    if (identifier.name && identifier.classId) {
      return this.ensureExistsByName(identifier.name, identifier.classId);
    }

    Err(404, this.t('notFound'));
  }

  async ensureClassExists(classId: string) {
    const existingClass = await this.classRepository.getById(classId);
    if (!existingClass) {
      Err(404, t('classes.errors.notFound'));
    }
  }

  async ensureNameUniqueInClass(classId: string, name: string, excludeId?: string) {
    const exists = await this.sectionRepository.checkNameExistsInClass(classId, name, excludeId);
    if (exists) {
      Err(409, this.t('nameExistsInClass'));
    }
  }

  async ensureHasNoStudents(sectionId: string) {
    const hasStudents = await this.sectionRepository.checkHasStudents(sectionId);
    if (hasStudents) {
      Err(409, this.t('hasStudents'));
    }
  }

  async ensureSectionInClass(sectionId?: string, sectionName?: string, classId?: string, className?: string) {
    if (!sectionId && !sectionName) {
      Err(400, this.t('sectionRequired'));
    }

    let resolvedClassId = classId;
    if (!resolvedClassId && className) {
      const classEntity = await this.classRepository.getByName(className);
      if (!classEntity) {
        Err(404, t('classes.errors.notFound'));
      }
      resolvedClassId = classEntity.id;
    }

    if (sectionId) {
      const sectionEntity = await this.ensureSection({ id: sectionId });
      if (resolvedClassId && sectionEntity.classId !== resolvedClassId) {
        Err(409, this.t('notInClass'));
      }
      return sectionEntity.id;
    }

    if (sectionName && resolvedClassId) {
      const sectionEntity = await this.ensureSection({
        name: sectionName,
        classId: resolvedClassId
      });
      return sectionEntity.id;
    }

    Err(400, this.t('validationFailed'));
  }

  async checkExists(id: string) {
    return this.ensureExists(id);
  }

  async checkExistsByName(name: string, classId: string) {
    return this.ensureExistsByName(name, classId);
  }

  async validateSection(identifier: { id?: string; name?: string; classId?: string }) {
    return this.ensureSection(identifier);
  }

  async checkClassExists(classId: string) {
    return this.ensureClassExists(classId);
  }

  async checkNameUniqueInClass(classId: string, name: string) {
    return this.ensureNameUniqueInClass(classId, name);
  }

  async checkNameUniqueInClassForUpdate(id: string, classId?: string, name?: string) {
    if (!classId && !name) return;

    const currentSection = await this.sectionRepository.getById(id);
    const checkClassId = classId || currentSection.classId;
    const checkName = name || currentSection.name;

    return this.ensureNameUniqueInClass(checkClassId, checkName, id);
  }

  async checkHasNoStudents(sectionId: string) {
    return this.ensureHasNoStudents(sectionId);
  }

  async validateSectionInClass(sectionId?: string, sectionName?: string, classId?: string, className?: string) {
    return this.ensureSectionInClass(sectionId, sectionName, classId, className);
  }

}
