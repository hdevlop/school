'use client';

import { CalendarClock, School } from 'lucide-react';
import { NAvatar, NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { personInitials, type MissedByStudent } from '../config/homeworkCompletion';

const CHIP = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums';

/**
 * One pupil's missed homework on a phone, in one compact row: who, where and
 * when, then the counts. A count of nothing is left out, so the eye lands on
 * what happened.
 */
export default function MissedHomeworkCard({ data }: { data: MissedByStudent }) {
  const { t } = useTranslation();
  const { displayDateOnly } = useSchoolFormat();
  const place = [data.class?.name, data.section?.name].filter(Boolean).join(' - ');
  return (
    // End padding keeps the name clear of the card's menu button.
    <div className="flex min-w-0 items-start gap-3 p-3 pe-9">
      <NAvatar src={data.student.image} fallback={personInitials(data.student.name)} size="md" className="shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <bdi className="min-w-0 truncate text-sm font-bold" title={data.student.name}>{data.student.name}</bdi>
          {data.toReport && <NBadge color="destructive" look="soft" label={t('homeworkFollowUp.toReport')} className="shrink-0 text-[11px] font-normal" />}
        </div>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {place && (
            <span className="inline-flex shrink-0 items-center gap-1" title={t('homeworkFollowUp.table.class')}>
              <School className="size-3.5" aria-hidden />{place}
            </span>
          )}
          <span className="inline-flex shrink-0 items-center gap-1" title={t('homeworkFollowUp.table.lastMissed')}>
            <CalendarClock className="size-3.5" aria-hidden />{displayDateOnly(data.lastDate)}
          </span>
          {data.subjects.length > 0 && (
            <bdi className="min-w-0 truncate" title={`${t('homeworkFollowUp.table.subjects')}: ${data.subjects.join(', ')}`}>
              · {data.subjects.join(', ')}
            </bdi>
          )}
        </p>
        <div className="flex flex-wrap gap-1">
          {data.notDone > 0 && (
            <span className={`${CHIP} bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300`}>
              {t('homeworkFollowUp.table.notDone')} <span className="font-bold">{data.notDone}</span>
            </span>
          )}
          {data.incomplete > 0 && (
            <span className={`${CHIP} bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300`}>
              {t('homeworkFollowUp.table.incomplete')} <span className="font-bold">{data.incomplete}</span>
            </span>
          )}
          <span className={`${CHIP} bg-muted text-foreground`}>
            {t('homeworkFollowUp.table.thisMonth')} <span className="font-bold">{data.thisMonth}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
