'use client';

import { BookOpen, CalendarClock, School } from 'lucide-react';
import { NAvatar, NBadge, NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { PersonCard } from '@/shared/PersonCard';
import { personInitials, type MissedByStudent } from '../config/homeworkCompletion';

const CHIP = 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums';

/** One pupil's missed homework on a phone: who, where, how many, and whether to report it. */
export default function MissedHomeworkCard({ data }: { data: MissedByStudent }) {
  const { t } = useTranslation();
  const { displayDateOnly } = useSchoolFormat();
  return (
    <PersonCard
      avatar={<NAvatar src={data.student.image} fallback={personInitials(data.student.name)} size="lg" />}
      name={(
        <span className="flex min-w-0 items-start justify-between gap-2">
          <span className="min-w-0 wrap-break-word">{data.student.name}</span>
          {data.toReport && <NBadge color="destructive" look="soft" label={t('homeworkFollowUp.toReport')} className="shrink-0 font-normal" />}
        </span>
      )}
    >
      <div className="flex flex-wrap gap-1.5">
        <span className={`${CHIP} bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300`}>
          {t('homeworkFollowUp.table.notDone')} <span className="font-bold">{data.notDone}</span>
        </span>
        <span className={`${CHIP} bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300`}>
          {t('homeworkFollowUp.table.incomplete')} <span className="font-bold">{data.incomplete}</span>
        </span>
        <span className={`${CHIP} bg-muted text-foreground`}>
          {t('homeworkFollowUp.table.thisMonth')} <span className="font-bold">{data.thisMonth}</span>
        </span>
      </div>
      <NSectionInfo
        icon={School}
        label={t('homeworkFollowUp.table.class')}
        value={[data.class?.name, data.section?.name].filter(Boolean).join(' - ') || '—'}
        valueColor="text-foreground font-medium"
      />
      <NSectionInfo
        icon={CalendarClock}
        label={t('homeworkFollowUp.table.lastMissed')}
        value={displayDateOnly(data.lastDate)}
        valueColor="text-foreground font-medium"
      />
      {data.subjects.length > 0 && (
        <NSectionInfo
          icon={BookOpen}
          label={t('homeworkFollowUp.table.subjects')}
          value={data.subjects.join(', ')}
          valueColor="text-foreground"
          maxChars={64}
          className="flex-wrap"
        />
      )}
    </PersonCard>
  );
}
