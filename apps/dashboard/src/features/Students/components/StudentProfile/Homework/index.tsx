'use client';

import React, { useMemo } from 'react';
import { CalendarDays, CircleDashed, X } from 'lucide-react';
import { NErrorState, NForbiddenState, NLoadingState } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolToday } from '@/hooks/useSchoolFormat';
import { isAuthorizationError } from '@/services/apiError';
import { missedByStudent } from '@/features/Homework/config/homeworkCompletion';
import { useMissedHomework } from '@/features/Homework/hooks/useHomework';
import MissedHomeworkList from '@/features/Homework/components/MissedHomeworkList';
import SectionTitle from '../SectionTitle';

/** The pupil's missed homework this year: how many, how many this month, and which. */
export default function HomeworkTab({ studentId }: { studentId: string }) {
  const { t } = useTranslation();
  const today = useSchoolToday();
  const { records, isLoading, error } = useMissedHomework({ studentId });
  const [group] = useMemo(() => missedByStudent(records ?? [], today), [records, today]);

  if (error) return isAuthorizationError(error) ? <NForbiddenState surface="panel" /> : <NErrorState surface="panel" />;
  if (isLoading) return <NLoadingState surface="panel" label={t('common.loading')} className="min-h-40" />;

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <SectionTitle title={t('homeworkFollowUp.title')} />
      {!group ? (
        <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">{t('homeworkFollowUp.profileEmpty')}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {([
              [t('homeworkFollowUp.table.notDone'), group.notDone, X, 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300'],
              [t('homeworkFollowUp.table.incomplete'), group.incomplete, CircleDashed, 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300'],
              [t('homeworkFollowUp.table.thisMonth'), group.thisMonth, CalendarDays, 'bg-primary/10 text-primary'],
            ] as const).map(([label, value, Icon, tone]) => (
              <div key={label} className="flex flex-col items-start gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${tone}`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-xs text-muted-foreground">{label}</div>
                  <div className="text-xl font-semibold tabular-nums">{value}</div>
                </div>
              </div>
            ))}
          </div>
          {group.toReport && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              {t('homeworkFollowUp.toReportHint', { count: group.thisMonth })}
            </p>
          )}
          <MissedHomeworkList records={group.records} />
        </>
      )}
    </section>
  );
}
