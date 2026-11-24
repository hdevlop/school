'use client';

import { NBadge } from 'najm-kit';
import {
  CategoryLabel,
  CategoryTile,
  PointsMark,
  RewardChip,
} from '@/features/BehaviorRewards/components/BehaviorRewardTags';

/** A reward in the bank: its category, title and wording, then the reward and points it gives. */
const RewardTemplateCard = ({ data }: { data: any }) => (
  <div className="flex items-start gap-3 p-4">
    <CategoryTile category={data.category} className="size-10" />
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-sm font-bold">{data.title}</span>
        <NBadge status={data.status} />
      </div>
      <CategoryLabel category={data.category} className="text-xs" />
      {data.description && <p className="line-clamp-2 text-xs text-muted-foreground">{data.description}</p>}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <RewardChip type={data.rewardType} />
        <PointsMark points={data.points} />
      </div>
    </div>
  </div>
);

export default RewardTemplateCard;
