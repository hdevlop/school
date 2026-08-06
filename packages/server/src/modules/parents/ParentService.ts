import { Service, Events, EventService } from '@server/najm';
import { ParentRepository } from './ParentRepository';
import { ParentValidator } from './ParentValidator';
import { AuthService, UserService } from '@server/auth';
import { StorageService } from 'najm-storage';
import { nanoid } from 'nanoid';
import { calculateAge, pickProps, isEmpty } from '@server/shared';
import { resolveUserPassword, isSeeding } from '@server/shared/userPassword';
import type {
  CreateParentDto,
  CreateParentsBulkDto,
  UpdateParentDto,
} from './ParentDto';

@Service()
export class ParentService {
  @Events() private events!: EventService;

  constructor(
    private parentRepository: ParentRepository,
    private parentValidator: ParentValidator,
    private userService: UserService,
    private authService: AuthService,
    private storage: StorageService,
  ) { }

  // ========== RETRIEVAL METHODS ==========

  async getAll() {
    return await this.parentRepository.getAll();
  }

  async getCount() {
    return await this.parentRepository.getCount();
  }

  async search(query: string, limit?: number) {
    return await this.parentRepository.search(query, limit);
  }

  async getById(id: string) {
    return await this.parentValidator.ensureExists(id);
  }

  async getByCin(cin: string) {
    return await this.parentValidator.ensureCinExists(cin);
  }

  async checkCinExists(cin: string) {
    const parent = await this.parentRepository.getByCin(cin);
    return !!parent;
  }

  async getByPhone(phone: string) {
    return await this.parentValidator.ensurePhoneExists(phone);
  }

  async getChildren(id: string) {
    await this.parentValidator.ensureExists(id);
    return await this.parentRepository.getChildren(id);
  }

  // ========== CREATE-METHOD ==========

  async create(data: CreateParentDto) {
    if (data.userId) await this.parentValidator.ensureUserIdUnique(data.userId);
    if (data.id) await this.parentValidator.ensureIdUnique(data.id);
    if (data.gender) await this.parentValidator.ensureGenderValid(data.gender);
    if (data.relationshipType) await this.parentValidator.ensureRelationshipTypeValid(data.relationshipType);
    if (data.maritalStatus) await this.parentValidator.ensureMaritalStatusValid(data.maritalStatus);
    if (data.email) await this.parentValidator.ensureEmailUnique(data.email);
    if (data.cin) await this.parentValidator.ensureCinUnique(data.cin);
    if (data.phone) await this.parentValidator.ensurePhoneUnique(data.phone);

    const parentId = data.id || nanoid(5);

    const genderSuffix = data.gender === 'F' ? 'female' : 'male';
    const image = await this.storage.processFile('parents', data?.image, {
      filePath: `${parentId}_avatar.png`,
      fallback: `/images/parent_${genderSuffix}.png`,
    });

    // Seeding passes a password (account created silently, log-in-able);
    // the dashboard passes none, so the parent is emailed a set-password invite.
    const user = await this.authService.provisionUser({
      id: data.userId,
      name: data.name,
      email: data.email,
      image,
      role: 'parent',
      password: isSeeding() ? resolveUserPassword(data.password) : data.password,
    });

    const parent = await this.parentRepository.create({
      id: parentId,
      userId: user.id,
      name: data.name,
      cin: data.cin,
      phone: data.phone,
      gender: data.gender,
      address: data.address,
      dateOfBirth: data.dateOfBirth,
      age: calculateAge(data.dateOfBirth),
      occupation: data.occupation,
      nationality: data.nationality,
      maritalStatus: data.maritalStatus,
      relationshipType: data.relationshipType,
      isEmergencyContact: data.isEmergencyContact,
      financialResponsibility: data.financialResponsibility,
    });
    return parent;
  }

  // ========== UPDATE-METHOD ==========

  async update(id: string, data: UpdateParentDto) {
    const USER_UPDATE_KEYS = [
      'name', 'email', 'image', 'password'
    ];

    const PARENT_UPDATE_KEYS = [
      'name', 'cin', 'phone', 'gender', 'address', 'dateOfBirth',
      'occupation', 'nationality', 'maritalStatus', 'relationshipType',
      'isEmergencyContact', 'financialResponsibility'
    ];

    await this.parentValidator.ensureExists(id);
    if (data.gender) await this.parentValidator.ensureGenderValid(data.gender);
    if (data.relationshipType) await this.parentValidator.ensureRelationshipTypeValid(data.relationshipType);
    if (data.maritalStatus) await this.parentValidator.ensureMaritalStatusValid(data.maritalStatus);
    if (data.email) await this.parentValidator.ensureEmailUnique(data.email, id);
    if (data.cin) await this.parentValidator.ensureCinUnique(data.cin, id);
    if (data.phone) await this.parentValidator.ensurePhoneUnique(data.phone, id);

    const parent = await this.parentRepository.getById(id);
    const userData = pickProps(data, USER_UPDATE_KEYS);
    const parentData = pickProps(data, PARENT_UPDATE_KEYS);

    if (data.image !== undefined) {
      const genderSuffix = data.gender === 'F' ? 'female' : 'male';
      userData.image = await this.storage.processFile('parents', data.image, {
        filePath: `${id}_avatar.png`,
        fallback: `/images/parent_${genderSuffix}.png`,
      });
    }

    if (parentData.dateOfBirth) {
      (parentData as Record<string, unknown>).age = calculateAge(parentData.dateOfBirth);
    }

    if (Object.keys(userData).length > 0) {
      await this.userService.update(parent.userId, userData);
    }
    if (Object.keys(parentData).length > 0) {
      return await this.parentRepository.update(id, parentData);
    }
    return parent;
  }

  // ========== DELETE-METHODS ==========

  async delete(id: string) {
    await this.parentValidator.ensureCanDelete(id);
    const deletedParent = await this.parentRepository.delete(id);
    this.storage.delete('parents', `${id}_avatar.png`).catch(() => {});
    return deletedParent;
  }

  async deleteAll() {
    return await this.parentRepository.deleteAll();
  }

  async deleteBulk(ids: string[]) {
    const results = await Promise.all(
      ids.map((id) => this.delete(id))
    );
    return {
      deletedCount: results.length,
      deletedParents: results,
      deletedFees: results,
    };
  }

  // ========== RELATIONSHIP METHODS ==========

  async linkStudent(parentId: string, studentId: string) {
    await this.parentValidator.ensureExists(parentId);
    await this.parentValidator.ensureStudentExists(studentId);
    await this.parentValidator.ensureStudentNotLinked(parentId, studentId);

    return await this.parentRepository.linkStudent({ parentId, studentId });
  }

  async unlinkStudent(parentId: string, studentId: string) {
    await this.parentValidator.ensureExists(parentId);
    await this.parentValidator.ensureStudentExists(studentId);
    await this.parentValidator.ensureStudentLinked(parentId, studentId);
    return await this.parentRepository.unlinkStudent(parentId, studentId);
  }

  // ========== SEED METHOD ==========

  async createBulk(parentsData: CreateParentsBulkDto) {
    const createdParents = [];

    for (const [index, parentData] of parentsData.entries()) {
      try {
        const parent = await this.create(parentData);
        createdParents.push(parent);
      } catch (error: any) {
        if (error?.status === 409) continue;
        const identifier = parentData.cin || parentData.id || parentData.name || `at index ${index}`;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to create parent ${identifier}: ${message}`);
      }
    }

    return createdParents;
  }

  // ========== UTILITY METHODS ==========

  async processParents(student?, parents?) {
    if (isEmpty(parents)) return;

    const studentId = student?.id;
    const linkedParentIds = [];

    for (const parentData of parents) {
      let parentId;

      if (typeof parentData === 'string') {
        try {
          await this.getById(parentData);
          parentId = parentData;
          linkedParentIds.push(parentId);
        } catch {
          throw new Error(`Parent with ID ${parentData} not found`);
        }
      } else {
        if (parentData.cin) {
          try {
            const existingParent = await this.getByCin(parentData.cin);
            parentId = existingParent.id;
            linkedParentIds.push(parentId);
          } catch {
            const newParent = await this.create(parentData);
            parentId = newParent.id;
            linkedParentIds.push(parentId);
          }
        } else if (parentData.phone) {
          try {
            const existingParent = await this.getByPhone(parentData.phone);
            parentId = existingParent.id;
            linkedParentIds.push(parentId);
          } catch {
            const newParent = await this.create(parentData);
            parentId = newParent.id;
            linkedParentIds.push(parentId);
          }
        } else {
          const newParent = await this.create(parentData);
          parentId = newParent.id;
          linkedParentIds.push(parentId);
        }
      }
      await this.linkStudent(parentId, studentId);
    }

    return linkedParentIds;
  }
}
