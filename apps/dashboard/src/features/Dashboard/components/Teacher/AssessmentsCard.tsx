'use client';

import Link from 'next/link';
import { ChevronRight, ClipboardList, FileText } from 'lucide-react';
import { NCard, NCardAction, NEmptyState, NProgress, NSkeleton, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { TeacherDashboardAssessment } from '@sms/contracts/teacher-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { TEACHER_DASHBOARD_LINKS } from '../../config/teacherDashboardLinks';
import { CardLink, IconTile, type Tone, FILL_CARD } from './shared';

const ROW_TONES: Tone[] = ['primary', 'warning', 'info', 'success'];

type AssessmentsCardProps = {
  assessments: TeacherDashboardAssessment[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

const AssessmentsSkeleton = () => (
  <div className="flex flex-col gap-3" aria-hidden="true">
    {Array.from({ length: 3 }, (_, index) => <NSkeleton key={index} className="h-16 w-full rounded-lg" />)}
  </div>
);

const AssessmentsCard = ({ assessments, loading, error, onRetry, className }: AssessmentsCardProps) => {
  const { t } = useTranslation();
  const { number, percent, displayDate } = useSchoolFormat();
  const rows = assessments ?? [];

  return (
    <NCard
      title={t('dashboard.teacher.assessments.title')}
      icon={ClipboardList}
      className={cn('h-full', className)}
      classNames={FILL_CARD}
      loading={loading}
      skeleton={<AssessmentsSkeleton />}
      error={error}
      errorText={t('common.feedback.errorMessage')}
      onRetry={onRetry}
    >
      <NCardAction>
        <CardLink href={TEACHER_DASHBOARD_LINKS.assessments}>{t('dashboard.teacher.assessments.viewAll')}</CardLink>
      </NCardAction>

      {rows.length ? (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((row, index) => {
            const progress = row.studentCount > 0
              ? Math.min(100, Math.round((row.gradedCount / row.studentCount) * 100))
              : 0;
            return (
              <li key={row.id}>
                <Link
                  href={TEACHER_DASHBOARD_LINKS.grades}
                  prefetch={false}
                  className="flex items-center gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-accent/50"
                >
                  <IconTile icon={FileText} tone={ROW_TONES[index % ROW_TONES.length]} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.className} · {row.sectionName} • {t('dashboard.teacher.assessments.due', { date: displayDate(row.date) })}
                    </p>
                  </div>
                  <div className="flex w-24 shrink-0 flex-col gap-1 sm:w-32">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {number(row.gradedCount)} / {number(row.studentCount)}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">{percent(progress / 100, 0)}</span>
                    </div>
                    <NProgress value={progress} size="sm" color={progress >= 100 ? 'success' : 'primary'} />
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <NEmptyState icon={ClipboardList} title={t('dashboard.teacher.assessments.empty')} className="py-4" />
      )}
    </NCard>
  );
};

export default AssessmentsCard;
