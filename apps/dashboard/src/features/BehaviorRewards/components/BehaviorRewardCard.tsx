'use client';

import { CalendarDays, School } from 'lucide-react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { BehaviorRewardStudentIdentity } from './BehaviorRewardStudentIdentity';
import { PointsMark, RewardChip } from './BehaviorRewardTags';

const BehaviorRewardCard = ({ data }: { data: any }) => {
  const { displayDate, displayDateTime, displayTime } = useSchoolFormat();
  const reward = data;
  const placement = `${reward.class?.name || '—'} / ${reward.section?.name || '—'}`;
  const fullDate = displayDateTime(reward.behaviorAt);
  const date = fullDate === '—' ? fullDate : `${displayDate(reward.behaviorAt, { day: '2-digit', month: '2-digit' })} · ${displayTime(reward.behaviorAt)}`;

  return (
    <div>
      <div className="flex items-center gap-2 px-2.5 py-2 pe-10">
        <BehaviorRewardStudentIdentity student={reward.student} updatedAt={reward.updatedAt} description={reward.description} className="flex-1" />
        {reward.points > 0 && <PointsMark points={reward.points} className="shrink-0 rounded-md border border-amber-200 dark:border-amber-900" />}
      </div>

      <div className="mx-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border/60 py-1.5 text-xs text-muted-foreground">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <RewardChip type={reward.rewardType} className="border-0 bg-muted px-1.5" />
          <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5">
            <School className="size-3.5 shrink-0" aria-hidden />
            <bdi className="truncate" title={placement}>{placement}</bdi>
          </span>
        </div>
        <span className="inline-flex min-w-0 items-center gap-1.5 tabular-nums">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden />
          <time dateTime={reward.behaviorAt} title={fullDate}><bdi>{date}</bdi></time>
        </span>
      </div>
    </div>
  );
};

export default BehaviorRewardCard;
