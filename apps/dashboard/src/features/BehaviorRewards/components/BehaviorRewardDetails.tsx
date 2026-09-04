'use client';

import { Award, CalendarClock, Gift, School, Star, UserRound } from 'lucide-react';
import { NAvatar, NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import {
  formatBehaviorDate,
  recognitionClasses,
  rewardClasses,
  tagClass,
} from '../behaviorRewardConstants';

const BehaviorRewardDetails = ({ behaviorReward }: { behaviorReward: any }) => {
  const { t, language } = useTranslation();
  const reward = behaviorReward;
  const awardedBy = reward.awardedByUser?.name || reward.awardedByUser?.email || '—';

  return (
    <div className="space-y-5 p-1">
      <div className="flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
        <NAvatar src={reward.student?.image} title={reward.student?.name} size="lg" version={reward.updatedAt} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-foreground">{reward.student?.name || '—'}</h3>
          <p className="text-sm text-muted-foreground">{reward.student?.studentCode || '—'}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={tagClass(recognitionClasses, reward.recognitionLevel)}>
              {t(`behaviorRewards.recognitionLevels.${reward.recognitionLevel}`)}
            </span>
            <span className={tagClass(rewardClasses, reward.rewardType)}>
              {t(`behaviorRewards.rewardTypes.${reward.rewardType}`)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <Star className="h-4 w-4" />
          {t(`behaviorRewards.categories.${reward.category}`)}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{reward.description}</p>
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
          value={formatBehaviorDate(reward.behaviorAt, language)}
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
        <span>{t('behaviorRewards.table.createdAt')}: {formatBehaviorDate(reward.createdAt, language)}</span>
        <span>{t('behaviorRewards.table.updatedAt')}: {formatBehaviorDate(reward.updatedAt, language)}</span>
      </div>
    </div>
  );
};

export default BehaviorRewardDetails;
