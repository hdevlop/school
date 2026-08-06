import { Service, Err, I18n, t } from '@server/najm';
import { ParentRepository } from './ParentRepository';
import { UserValidator } from '@server/auth';

@Service()
export class ParentValidator {
  @I18n('parents.errors') private pt!: (key: string) => string;

  constructor(
    private parentRepository: ParentRepository,
    private userValidator: UserValidator,
  ) { }

  // ========== UNIQUENESS CHECKS ==========

  async ensureUserIdUnique(id: string) {
    return await this.userValidator.checkUserIdIsUnique(id);
  }

  async ensureIdUnique(id: string) {
    const existingParent = await this.parentRepository.getById(id);
    if (existingParent) {
      Err(409, this.pt('idExists'));
    }
  }

  async ensureEmailUnique(email: string, excludeId?: string) {
    if (!email) return;

    const existingParent = await this.parentRepository.getByEmail(email);
    if (existingParent && existingParent.id !== excludeId) {
      Err(409, this.pt('emailExists'));
    }
  }

  async ensureCinUnique(cin: string, excludeId?: string) {
    if (!cin) return;

    const existingParent = await this.parentRepository.getByCin(cin);
    if (existingParent && existingParent.id !== excludeId) {
      Err(409, this.pt('cinExists'));
    }
  }

  async ensurePhoneUnique(phone: string, excludeId?: string) {
    if (!phone) return;

    const existingParent = await this.parentRepository.getByPhone(phone);
    if (existingParent && existingParent.id !== excludeId) {
      Err(409, this.pt('phoneExists'));
    }
  }

  // ========== EXISTENCE CHECKS ==========

  async isExists(id: string) {
    const existingParent = await this.parentRepository.getById(id);
    return !!existingParent;
  }

  async isEmailExists(email: string) {
    if (!email) return false;
    const existingParent = await this.parentRepository.getByEmail(email);
    return !!existingParent;
  }

  async isPhoneExists(phone: string) {
    if (!phone) return false;
    const existingParent = await this.parentRepository.getByPhone(phone);
    return !!existingParent;
  }

  async isParentLinkedToStudents(parentId: string) {
    return await this.parentRepository.checkLinkedToStudents(parentId);
  }

  // ========== EXISTENCE CHECKS (THROWING) ==========

  async ensureExists(id: string) {
    const parent = await this.parentRepository.getById(id);
    if (!parent) {
      Err(404, this.pt('notFound'));
    }
    return parent;
  }

  async ensureEmailExists(email: string) {
    const parent = await this.parentRepository.getByEmail(email);
    if (!parent) {
      Err(404, this.pt('notFound'));
    }
    return parent;
  }

  async ensureCinExists(cin: string) {
    const parent = await this.parentRepository.getByCin(cin);
    if (!parent) {
      Err(404, this.pt('notFound'));
    }
    return parent;
  }

  async ensurePhoneExists(phone: string) {
    const parent = await this.parentRepository.getByPhone(phone);
    if (!parent) {
      Err(404, this.pt('notFound'));
    }
    return parent;
  }

  // ========== FIELD VALIDATION ==========

  async ensureGenderValid(gender: string) {
    const validGenders = ['M', 'F', 'Other'];
    if (!validGenders.includes(gender)) {
      Err(400, this.pt('invalidGender'));
    }
    return true;
  }

  async ensureRelationshipTypeValid(relationshipType: string) {
    const validTypes = ['father', 'mother', 'guardian', 'stepparent', 'grandparent', 'other'];
    if (!validTypes.includes(relationshipType)) {
      Err(400, this.pt('invalidRelationshipType'));
    }
    return true;
  }

  async ensureMaritalStatusValid(maritalStatus: string) {
    const validStatuses = ['single', 'married', 'divorced', 'widowed', 'separated'];
    if (!validStatuses.includes(maritalStatus)) {
      Err(400, this.pt('invalidMaritalStatus'));
    }
    return true;
  }

  // ========== WORKFLOW VALIDATION ==========

  async ensureCanDelete(id: string) {
    const hasLinkedStudents = await this.isParentLinkedToStudents(id);
    if (hasLinkedStudents) {
      Err(409, this.pt('hasLinkedStudents'));
    }
    return true;
  }

  async ensureNotLinkedToStudents(parentId: string) {
    return await this.ensureCanDelete(parentId);
  }

  async ensureStudentExists(studentId: string) {
    const studentExists = await this.parentRepository.checkStudentExists(studentId);
    if (!studentExists) {
      Err(404, t('students.errors.notFound'));
    }
    return true;
  }

  async ensureStudentLinked(parentId: string, studentId: string) {
    const isLinked = await this.parentRepository.checkStudentLinked(parentId, studentId);
    if (!isLinked) {
      Err(409, this.pt('studentNotLinked'));
    }
    return true;
  }

  async ensureStudentNotLinked(parentId: string, studentId: string) {
    const isLinked = await this.parentRepository.checkStudentLinked(parentId, studentId);
    if (isLinked) {
      Err(409, this.pt('studentAlreadyLinked'));
    }
    return true;
  }

  async checkUserIdIsUnique(id: string) {
    return this.ensureUserIdUnique(id);
  }

  async checkIdIsUnique(id: string) {
    return this.ensureIdUnique(id);
  }

  async checkEmailIsUnique(email: string, excludeId: string = null) {
    return this.ensureEmailUnique(email, excludeId ?? undefined);
  }

  async checkCinIsUnique(cin: string, excludeId: string = null) {
    return this.ensureCinUnique(cin, excludeId ?? undefined);
  }

  async checkPhoneIsUnique(phone: string, excludeId: string = null) {
    return this.ensurePhoneUnique(phone, excludeId ?? undefined);
  }

  async checkExists(id: string) {
    return this.ensureExists(id);
  }

  async checkEmailExists(email: string) {
    return this.ensureEmailExists(email);
  }

  async checkCinExists(cin: string) {
    return this.ensureCinExists(cin);
  }

  async checkPhoneExists(phone: string) {
    return this.ensurePhoneExists(phone);
  }

  async validateGender(gender: string) {
    return this.ensureGenderValid(gender);
  }

  async validateRelationshipType(relationshipType: string) {
    return this.ensureRelationshipTypeValid(relationshipType);
  }

  async validateMaritalStatus(maritalStatus: string) {
    return this.ensureMaritalStatusValid(maritalStatus);
  }

  async checkCanDelete(id: string) {
    return this.ensureCanDelete(id);
  }

  async checkNotLinkedToStudents(parentId: string) {
    return this.ensureNotLinkedToStudents(parentId);
  }

  async checkStudentExists(studentId: string) {
    return this.ensureStudentExists(studentId);
  }

  async checkStudentLinked(parentId: string, studentId: string) {
    return this.ensureStudentLinked(parentId, studentId);
  }

  async checkStudentNotLinked(parentId: string, studentId: string) {
    return this.ensureStudentNotLinked(parentId, studentId);
  }

}
