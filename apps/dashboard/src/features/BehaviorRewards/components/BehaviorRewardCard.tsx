'use client';

import { Award, CalendarClock, School, Star } from 'lucide-react';
import { NAvatar } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';
import {
  formatBehaviorDate,
  recognitionClasses,
  rewardClasses,
  tagClass,
} from '../behaviorRewardConstants';

const BehaviorRewardCard = ({ data }: { data: any }) => {
  const { t, language } = useTranslation();
  const reward = data;

  return (
    <div className="flex gap-3 p-4">
      <NAvatar
        src={reward.student?.image}
        title={reward.student?.name}
        size="lg"
        version={reward.updatedAt}
      />
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <div className="truncate font-semibold text-foreground">{reward.student?.name || '—'}</div>
          <div className="text-xs text-muted-foreground">{reward.student?.studentCode || '—'}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <Star className="me-1 h-3.5 w-3.5" />
            {t(`behaviorRewards.categories.${reward.category}`)}
          </span>
          <span className={tagClass(recognitionClasses, reward.recognitionLevel)}>
            {t(`behaviorRewards.recognitionLevels.${reward.recognitionLevel}`)}
          </span>
          <span className={tagClass(rewardClasses, reward.rewardType)}>
            {t(`behaviorRewards.rewardTypes.${reward.rewardType}`)}
          </span>
          {reward.points > 0 ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
              <Award className="me-1 h-3.5 w-3.5" />+{reward.points}
            </span>
          ) : null}
        </div>

        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <School className="h-4 w-4 text-emerald-600" />
            <span>{reward.class?.name || '—'} / {reward.section?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-emerald-600" />
            <span>{formatBehaviorDate(reward.behaviorAt, language)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BehaviorRewardCard;
