'use client';

import { Award, CalendarClock, School, Star } from 'lucide-react';
import { NBadge, NAvatar } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import {
  recognitionClasses,
  rewardClasses,
  tagClass,
} from '../behaviorRewardConstants';

const BehaviorRewardCard = ({ data }: { data: any }) => {
  const { t } = useTranslation();
  const { displayDateTime } = useSchoolFormat();
  const reward = data;

  // A narrow card (a phone, or one column of several) puts the student above
  // the details: side by side, the name squeezed the badges past the edge.
  return (
    <div className="@container">
    <div className="flex flex-col gap-3 p-4 pe-10 @md:flex-row @md:pe-4">
      <NAvatar
        src={reward.student?.image}
        title={reward.student?.name}
        subtitle={reward.student?.studentCode || '—'}
        size="lg"
        version={reward.updatedAt}
      />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap gap-2">
          <NBadge className="inline-flex rounded-md bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <Star className="me-1 h-3.5 w-3.5" />
            {t(`behaviorRewards.categories.${reward.category}`)}
          </NBadge>
          <NBadge className={tagClass(recognitionClasses, reward.recognitionLevel)}>
            {t(`behaviorRewards.recognitionLevels.${reward.recognitionLevel}`)}
          </NBadge>
          <NBadge className={tagClass(rewardClasses, reward.rewardType)}>
            {t(`behaviorRewards.rewardTypes.${reward.rewardType}`)}
          </NBadge>
          {reward.points > 0 ? (
            <NBadge className="inline-flex items-center rounded-full bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
              <Award className="me-1 h-3.5 w-3.5" />+{reward.points}
            </NBadge>
          ) : null}
        </div>

        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <School className="h-4 w-4 text-emerald-600" />
            <span>{reward.class?.name || '—'} / {reward.section?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-emerald-600" />
            <span>{displayDateTime(reward.behaviorAt)}</span>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default BehaviorRewardCard;
