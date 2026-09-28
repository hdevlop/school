import { Err, I18n, Service } from '../../najm';
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

  /**
   * The class and section the student was placed in on the behavior's day,
   * which must fall in the selected year. A past-dated record takes the class
   * of that day, not the student's current one.
   */
  async ensureStudentEligible(studentId: string, behaviorAt: string, actor: BehaviorRewardActor) {
    this.ensureSupportedActor(actor);
    const student = await this.behaviorRewardRepository.getStudentPlacementOn(studentId, behaviorAt);
    if (!student) Err(404, this.bt('studentNotFound'));
    if (!student.inSelectedYear) Err(409, this.bt('outsideSelectedYear'));
    if (!student.classId || !student.sectionId) Err(409, this.bt('notPlacedOnDate'));
    const placement = { classId: student.classId!, sectionId: student.sectionId! };

    if (actor.role === 'teacher') {
      const assigned = await this.behaviorRewardRepository.isTeacherAssignedToSection(actor.id, placement.sectionId);
      if (!assigned) Err(403, this.bt('studentNotAssigned'));
    }

    return placement;
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
