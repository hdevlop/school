'use client';

import { Award, CalendarClock, Gift, School, UserRound } from 'lucide-react';
import { NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { CategoryLabel, PointsMark, RewardChip } from './BehaviorRewardTags';
import { BehaviorRewardStudentIdentity } from './BehaviorRewardStudentIdentity';

const BehaviorRewardDetails = ({ behaviorReward }: { behaviorReward: any }) => {
  const { t } = useTranslation();
  const { displayDateTime } = useSchoolFormat();
  const reward = behaviorReward;
  const awardedBy = reward.awardedByUser?.name || '—';

  return (
    <div className="space-y-5 p-1">
      <div className="flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
        <BehaviorRewardStudentIdentity student={reward.student} updatedAt={reward.updatedAt} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <RewardChip type={reward.rewardType} className="bg-background" />
            {reward.points > 0 ? <PointsMark points={reward.points} /> : null}
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <CategoryLabel category={reward.category} withIcon />
        <p dir="auto" className="whitespace-pre-wrap text-sm leading-6 text-foreground">{reward.description}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <NSectionInfo
          icon={School}
          iconColor="text-emerald-600"
          label={t('behaviorRewards.table.classSection')}
          value={`${reward.class?.name || '—'} / ${reward.section?.name || '—'}`}
          valueColor="text-foreground font-medium"
        />
        <NSectionInfo
          icon={CalendarClock}
          iconColor="text-emerald-600"
          label={t('behaviorRewards.table.behaviorDate')}
          value={displayDateTime(reward.behaviorAt)}
          valueColor="text-foreground font-medium"
        />
        <NSectionInfo
          icon={Gift}
          iconColor="text-emerald-600"
          label={t('behaviorRewards.table.reward')}
          value={t(`behaviorRewards.rewardTypes.${reward.rewardType}`)}
          valueColor="text-foreground font-medium"
        />
        <NSectionInfo
          icon={Award}
          iconColor="text-emerald-600"
          label={t('behaviorRewards.table.points')}
          value={reward.points > 0 ? String(reward.points) : '—'}
          valueColor="text-foreground font-medium"
        />
        <NSectionInfo
          icon={UserRound}
          iconColor="text-emerald-600"
          label={t('behaviorRewards.table.awardedBy')}
          value={awardedBy}
          valueColor="text-foreground font-medium"
        />
      </div>

      {reward.rewardNote ? (
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('behaviorRewards.form.rewardNote')}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6">{reward.rewardNote}</p>
        </div>
      ) : null}

      <div className="grid gap-2 border-t pt-4 text-xs text-muted-foreground sm:grid-cols-2">
        <span>{t('behaviorRewards.table.createdAt')}: {displayDateTime(reward.createdAt)}</span>
        <span>{t('behaviorRewards.table.updatedAt')}: {displayDateTime(reward.updatedAt)}</span>
      </div>
    </div>
  );
};

export default BehaviorRewardDetails;
