import { Can, own, join, where } from '../../auth';
import { parents, studentParents, students } from '../../database/schema';
import { behaviorRewards } from './behaviorRewardSchema';

/** Teachers see the rewards they gave; students their own; parents their children's. */
export const BehaviorReward = own(behaviorRewards)
  .for('teacher', where(behaviorRewards.awardedBy))
  .for('parent',
    join(behaviorRewards.studentId, students.id),
    join(students.id, studentParents.studentId),
    join(studentParents.parentId, parents.id),
    where(parents.userId),
  )
  .for('student',
    join(behaviorRewards.studentId, students.id),
    where(students.userId),
  );

export const canListBehaviorRewards = () => Can('read:behavior-rewards');
export const canReadBehaviorRewards = () => Can('read:behavior-rewards');
export const canCreateBehaviorRewards = () => Can('create:behavior-rewards');
export const canUpdateBehaviorRewards = () => Can('update:behavior-rewards');
export const canDeleteBehaviorRewards = () => Can('delete:behavior-rewards');
