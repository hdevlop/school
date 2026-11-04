'use client';

import type { LucideIcon } from 'lucide-react';
import { NCard, NSkeletonEventList, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { RegistrarGradeAverage } from '@sms/contracts/registrar-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import DashboardEmptyState from '../DashboardEmptyState';
import { GRADE_FILL, GRADE_FILL_CLASS } from './gradeChartColor';

type GradeAveragesCardProps = {
  title: string;
  emptyTitle: string;
  icon: LucideIcon;
  rows: readonly RegistrarGradeAverage[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

// One labelled bar per class or subject. A school can have many of either: the
// list scrolls, where a column chart would drop the labels it has no room for.
export default function GradeAveragesCard({ title, emptyTitle, icon, rows, loading, error, onRetry, className }: GradeAveragesCardProps) {
  const { t } = useTranslation();
  const { number, percent } = useSchoolFormat();

  return (
    <NCard
      title={title}
      icon={icon}
      className={cn('flex h-full w-full', GRADE_FILL_CLASS, className)}
      loading={loading}
      error={error}
      onRetry={onRetry}
      skeleton={<NSkeletonEventList />}
      classNames={{ content: 'flex-1 min-h-0 overflow-y-auto' }}
    >
      {!rows?.length ? (
        <DashboardEmptyState icon={icon} title={emptyTitle} />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} title={t('dashboard.registrar.gradedCount', { count: number(row.graded) })}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-muted-foreground">{row.name}</span>
                <span className="shrink-0 font-semibold tabular-nums">{percent(row.average / 100, 0)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, row.average))}%`, backgroundColor: GRADE_FILL }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </NCard>
  );
}
