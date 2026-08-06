import { Can } from '@server/auth';
import { own, where } from 'najm-auth';
import { behaviorRewards } from './behaviorRewardSchema';

export const BehaviorReward = own(behaviorRewards)
  .for('teacher', where(behaviorRewards.awardedBy));

export const canListBehaviorRewards = () => Can('read:behavior-rewards');
export const canReadBehaviorRewards = () => Can('read:behavior-rewards');
export const canCreateBehaviorRewards = () => Can('create:behavior-rewards');
export const canUpdateBehaviorRewards = () => Can('update:behavior-rewards');
export const canDeleteBehaviorRewards = () => Can('delete:behavior-rewards');
