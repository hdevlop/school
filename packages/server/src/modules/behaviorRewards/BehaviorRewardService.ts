import { Service } from '@server/najm';
import { pickProps } from '@server/shared';
import type { CreateBehaviorRewardDto, UpdateBehaviorRewardDto } from './BehaviorRewardDto';
import { BehaviorRewardRepository } from './BehaviorRewardRepository';
import { BehaviorRewardValidator, type BehaviorRewardActor } from './BehaviorRewardValidator';

const MUTABLE_FIELDS = [
  'studentId',
  'behaviorAt',
  'category',
  'recognitionLevel',
  'description',
  'rewardType',
  'points',
  'rewardNote',
] as const;

@Service()
export class BehaviorRewardService {
  constructor(
    private behaviorRewardRepository: BehaviorRewardRepository,
    private behaviorRewardValidator: BehaviorRewardValidator,
  ) {}

  async list() {
    return this.behaviorRewardRepository.getAll();
  }

  async getById(id: string) {
    return this.behaviorRewardValidator.ensureExists(id);
  }

  async create(data: CreateBehaviorRewardDto, actor: BehaviorRewardActor) {
    const student = await this.behaviorRewardValidator.ensureStudentEligible(data.studentId, actor);
    this.behaviorRewardValidator.ensureBehaviorDate(data.behaviorAt);

    return this.behaviorRewardRepository.create({
      studentId: data.studentId,
      behaviorAt: data.behaviorAt,
      category: data.category,
      recognitionLevel: data.recognitionLevel,
      description: data.description,
      rewardType: data.rewardType,
      points: data.points,
      rewardNote: data.rewardNote || null,
      classId: student.classId,
      sectionId: student.sectionId,
      awardedBy: actor.id,
    });
  }

  async update(id: string, data: UpdateBehaviorRewardDto, actor: BehaviorRewardActor) {
    const existing = await this.behaviorRewardValidator.ensureExists(id);
    this.behaviorRewardValidator.ensureTeacherOwns(existing, actor);

    const updateData: Record<string, unknown> = pickProps(data, MUTABLE_FIELDS);
    if (data.behaviorAt) this.behaviorRewardValidator.ensureBehaviorDate(data.behaviorAt);
    if ('rewardNote' in data) updateData.rewardNote = data.rewardNote || null;

    if (data.studentId && data.studentId !== existing.studentId) {
      const student = await this.behaviorRewardValidator.ensureStudentEligible(data.studentId, actor);
      updateData.classId = student.classId;
      updateData.sectionId = student.sectionId;
    }

    return this.behaviorRewardRepository.update(id, updateData);
  }

  async delete(id: string, actor: BehaviorRewardActor) {
    this.behaviorRewardValidator.ensureAdmin(actor);
    await this.behaviorRewardValidator.ensureExists(id);
    return this.behaviorRewardRepository.delete(id);
  }

  async deleteAll() {
    return this.behaviorRewardRepository.deleteAll();
  }
}
