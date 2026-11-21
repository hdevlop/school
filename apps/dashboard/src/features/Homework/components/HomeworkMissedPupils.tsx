'use client';

import { useMemo } from 'react';
import { UserX } from 'lucide-react';
import { HOMEWORK_MISSED_STATUS_VALUES, type HomeworkMissedStatus } from '@sms/contracts';
import { NErrorState, NSkeleton, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useHomeworkRoster } from '../hooks/useHomework';
import { STATUS_LOOK } from './HomeworkCompletionSheet';

const isMissed = (status: unknown): status is HomeworkMissedStatus =>
  (HOMEWORK_MISSED_STATUS_VALUES as readonly unknown[]).includes(status);

// Not done before incomplete, then by name: the pupils to talk to first come first.
const ORDER: Record<HomeworkMissedStatus, number> = { not_done: 0, incomplete: 1 };

/**
 * The pupils the follow-up marked as not having done the homework, or not in
 * full: the name, then the status as the follow-up sheet shows it.
 */
export default function HomeworkMissedPupils({ homeworkId }: { homeworkId: string }) {
  const { t, language } = useTranslation();
  const { roster, isLoading, error } = useHomeworkRoster(homeworkId);
  const missed = useMemo(() => (roster ?? [])
    .flatMap((entry) => isMissed(entry.status) ? [{ ...entry, status: entry.status }] : [])
    .sort((left, right) => ORDER[left.status] - ORDER[right.status] || left.name.localeCompare(right.name, language)),
  [roster, language]);

  if (error) return <NErrorState surface="panel" title={t('homework.completion.missedPupils')} />;
  if (isLoading) return <NSkeleton className="h-24 rounded-xl" />;
  if (!missed.length) return null;
  return (
    <section className="grid gap-2 border-t pt-3" aria-labelledby={`missed-${homeworkId}`}>
      <h4 id={`missed-${homeworkId}`} className="flex items-center gap-2 text-base font-bold">
        <UserX className="size-5 text-primary" aria-hidden />
        {t('homework.completion.missedPupils')}
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">{missed.length}</span>
      </h4>
      <ul className="divide-y rounded-xl border" role="list">
        {missed.map((entry) => {
          const look = STATUS_LOOK[entry.status];
          const Icon = look.icon;
          const label = t(`homework.completion.status.${entry.status}`);
          return (
            <li key={entry.studentId} className={cn('flex items-center gap-3 px-3 py-2', look.row)}>
              <span className="min-w-0 flex-1">
                <bdi className="block truncate text-sm font-medium" title={entry.name}>{entry.name}</bdi>
                {entry.note && <bdi className="block text-xs text-muted-foreground wrap-anywhere">{entry.note}</bdi>}
              </span>
              <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold', look.chip)} title={label}>
                <Icon className="size-4" aria-hidden />
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
