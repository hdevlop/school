import { Err, I18n, Service } from '@server/najm';
import { BehaviorRewardRepository } from './BehaviorRewardRepository';

export type BehaviorRewardActor = {
  id: string;
  role?: string | null;
};

export const isBehaviorRewardDateInFuture = (value: string, now = new Date()) => {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > now.getTime() + 5 * 60 * 1000;
};

@Service()
export class BehaviorRewardValidator {
  @I18n('behaviorRewards.errors') private bt!: (key: string) => string;

  constructor(private behaviorRewardRepository: BehaviorRewardRepository) {}

  async ensureExists(id: string) {
    const record = await this.behaviorRewardRepository.getById(id);
    if (!record) Err(404, this.bt('notFound'));
    return record;
  }

  ensureSupportedActor(actor: BehaviorRewardActor) {
    if (actor.role !== 'admin' && actor.role !== 'teacher') {
      Err(403, this.bt('forbidden'));
    }
  }

  async ensureStudentEligible(studentId: string, actor: BehaviorRewardActor) {
    this.ensureSupportedActor(actor);
    const student = await this.behaviorRewardRepository.getStudentAcademicContext(studentId);
    if (!student) Err(404, this.bt('studentNotFound'));
    if (student.status !== 'active') Err(409, this.bt('studentInactive'));
    if (!student.classId || !student.sectionId) Err(409, this.bt('studentAcademicContextMissing'));

    if (actor.role === 'teacher') {
      const assigned = await this.behaviorRewardRepository.isTeacherAssignedToStudent(actor.id, studentId);
      if (!assigned) Err(403, this.bt('studentNotAssigned'));
    }

    return student;
  }

  ensureTeacherOwns(record: { awardedBy: string }, actor: BehaviorRewardActor) {
    this.ensureSupportedActor(actor);
    if (actor.role === 'teacher' && record.awardedBy !== actor.id) {
      Err(403, this.bt('notOwner'));
    }
  }

  ensureAdmin(actor: BehaviorRewardActor) {
    if (actor.role !== 'admin') Err(403, this.bt('deleteAdminOnly'));
  }

  ensureBehaviorDate(value: string) {
    if (!Number.isFinite(new Date(value).getTime())) Err(400, this.bt('invalidBehaviorDate'));
    if (isBehaviorRewardDateInFuture(value)) Err(400, this.bt('futureBehaviorDate'));
  }
}
