'use client';

import { AlertTriangle, Medal, TrendingUp } from 'lucide-react';
import { NBadge, NSkeleton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { GRADE_REMARK_BAR_STYLES, GRADE_REMARK_COLORS, GRADE_REMARK_STYLES, gradeRemark } from '@/features/Grades/config/gradeRemarks';
import { MarkBar } from './GradeCard';

interface Rank {
  position: number;
  total: number;
  /** The class's mean percentage; withheld (null) under three students. */
  classAverage?: number | null;
}

export interface ReportSubject {
  subject?: { name?: string | null } | null;
  averagePercentage: number;
  rank?: Rank | null;
}

/** A percentage on the school's scale, to two decimals at most: 85.55% is 17.11 on /20. */
const onScale = (pct: number, scale: number) => Number((pct / 100 * scale).toFixed(2));
const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)}`;

/** Where the student stands against the class, in words: above, below, or level with its average. */
function classComparison(t: (key: string, values?: Record<string, unknown>) => string, own: number, classAverage: number, scale: number) {
  const diff = Number((onScale(own, scale) - onScale(classAverage, scale)).toFixed(2));
  const average = onScale(classAverage, scale);
  if (diff > 0) return t('students.profile.gradeDetails.aboveClass', { diff: signed(diff), average });
  if (diff < 0) return t('students.profile.gradeDetails.belowClass', { diff: signed(diff), average });
  return t('students.profile.gradeDetails.levelWithClass', { average });
}

/**
 * The year at a glance on a phone: the overall average and its remark, the
 * place in the class, and a bar with a mark where the class average falls.
 */
export function GradeSummaryCard({ average, rank, scale }: {
  average: number;
  rank?: Rank | null;
  scale: number;
}) {
  const { t } = useTranslation();
  const remark = gradeRemark({ marksObtained: average, totalMarks: 100, status: 'graded' });
  const classAverage = rank?.classAverage ?? null;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5 text-amber-600" aria-hidden />
            {t('students.profile.gradeDetails.overallAverage')}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold leading-none tabular-nums text-foreground">
              {onScale(average, scale)}<span className="text-xs font-normal text-muted-foreground">/{scale}</span>
            </p>
            {remark ? (
              <NBadge
                color={GRADE_REMARK_COLORS[remark]}
                className={GRADE_REMARK_STYLES[remark]}
                label={t(`students.profile.gradeDetails.remarks.${remark}`)}
                look="soft"
              />
            ) : null}
          </div>
        </div>
        {rank ? (
          <div className="shrink-0 text-end">
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Medal className="size-3.5 text-sky-600" aria-hidden />
              {t('students.profile.gradeDetails.rank')}
            </p>
            <p className="mt-1 text-lg font-bold leading-none tabular-nums text-foreground">
              {rank.position}<span className="text-xs font-normal text-muted-foreground"> / {rank.total}</span>
            </p>
          </div>
        ) : null}
      </div>

      <MarkBar percent={average} fill={remark ? GRADE_REMARK_BAR_STYLES[remark] : 'bg-primary'} classAverage={classAverage} />

      {classAverage != null ? (
        <p className="text-xs text-muted-foreground">{classComparison(t, average, classAverage, scale)}</p>
      ) : null}
    </div>
  );
}

/** The subject with the lowest average: its mark, against the class, and its rank. */
export function WeakestSubjectBanner({ subject, scale }: { subject: ReportSubject; scale: number }) {
  const { t } = useTranslation();
  const classAverage = subject.rank?.classAverage ?? null;
  const details = [
    classAverage != null
      ? t('students.profile.gradeDetails.vsClass', { diff: signed(Number((onScale(subject.averagePercentage, scale) - onScale(classAverage, scale)).toFixed(2))) })
      : null,
    subject.rank ? `${t('students.profile.gradeDetails.rank')} ${subject.rank.position} / ${subject.rank.total}` : null,
  ].filter(Boolean);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">
          {t('students.profile.gradeDetails.toWorkOn')} · <bdi>{subject.subject?.name || t('common.notAssigned')}</bdi>
          <span className="tabular-nums"> — {onScale(subject.averagePercentage, scale)}/{scale}</span>
        </p>
        {details.length ? <p className="text-xs tabular-nums opacity-90">{details.join(' · ')}</p> : null}
      </div>
    </div>
  );
}

export function GradeSummarySkeleton() {
  return <NSkeleton className="h-28 rounded-xl border border-border" />;
}
