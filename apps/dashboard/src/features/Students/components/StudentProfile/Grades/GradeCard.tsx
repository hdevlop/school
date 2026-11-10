'use client';

import { cn, NBadge, NSkeleton } from 'najm-kit';
import { Medal } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { GRADE_REMARK_BAR_STYLES, GRADE_REMARK_COLORS, GRADE_REMARK_STYLES, gradeRemark } from '@/features/Grades/config/gradeRemarks';

export interface GradeRow {
  id: string;
  subject?: { name?: string | null } | null;
  assessment?: { title?: string | null } | null;
  exam?: { title?: string | null } | null;
  /** classAverage: the class's mean percentage in the subject; withheld (null) under three students. */
  subjectRank?: { position: number; total: number; classAverage?: number | null } | null;
  marksObtained?: number | null;
  totalMarks?: number | null;
  percentage?: number | null;
  status?: string | null;
}

const clampPct = (pct: number) => Math.min(Math.max(pct, 0), 100);

/**
 * How much of the scale a mark covers, in the remark's hue, with a black tick
 * where the class average falls when there is one.
 */
export function MarkBar({ percent, fill, classAverage, className }: {
  percent: number;
  fill: string;
  classAverage?: number | null;
  className?: string;
}) {
  return (
    <div className={cn('relative py-1', className)}>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-foreground/15"
        role="progressbar"
        aria-valuenow={Math.round(clampPct(percent))}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn('h-full rounded-full', fill)} style={{ width: `${clampPct(percent)}%` }} />
      </div>
      {classAverage != null ? (
        <span
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-foreground rtl:translate-x-1/2"
          style={{ insetInlineStart: `${clampPct(classAverage)}%` }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

/**
 * What tells a subject's grades apart: the assessment or exam title, unless it
 * only repeats the subject (a Massar grade's exam is named after it).
 */
export function gradeSource(grade: GradeRow) {
  const title = (grade.assessment?.title || grade.exam?.title || '').trim();
  const subject = (grade.subject?.name || '').trim();
  return title && title.toLocaleLowerCase() !== subject.toLocaleLowerCase() ? title : null;
}

/**
 * One grade on a phone or tablet: the subject with its remark and class rank
 * under it, the mark beside them, then a bar in the remark's hue. A pending or
 * missed grade has no mark to show, so it shows its status instead.
 */
export function GradeCard({ data: grade }: { data: GradeRow }) {
  const { t } = useTranslation();
  const remark = gradeRemark(grade);
  const source = gradeSource(grade);
  const percent = Math.min(Math.max(grade.percentage ?? 0, 0), 100);

  return (
    <div className="flex flex-col gap-2.5 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {/* The subject, its remark and its rank on one row; a long name pushes the last two under it. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="min-w-0 font-semibold text-foreground">
              <bdi>{grade.subject?.name || t('common.notAssigned')}</bdi>
            </p>
            {remark
              ? <NBadge color={GRADE_REMARK_COLORS[remark]} className={GRADE_REMARK_STYLES[remark]} label={t(`students.profile.gradeDetails.remarks.${remark}`)} look="soft" />
              : <NBadge status={grade.status || 'pending'} />}
            {grade.subjectRank ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Medal className="h-3.5 w-3.5" />
                {t('students.profile.gradeDetails.rank')}
                <span className="font-semibold tabular-nums text-foreground">{grade.subjectRank.position}</span>
                <span className="tabular-nums">/ {grade.subjectRank.total}</span>
              </span>
            ) : null}
          </div>
          {source ? <p className="mt-0.5 truncate text-xs text-muted-foreground"><bdi>{source}</bdi></p> : null}
        </div>
        <p className="shrink-0 whitespace-nowrap text-xl font-bold leading-none tabular-nums text-foreground">
          {remark ? grade.marksObtained : '—'}
          <span className="text-sm font-normal text-muted-foreground"> / {grade.totalMarks || '—'}</span>
        </p>
      </div>

      {remark ? (
        <div className="flex items-center gap-2">
          <MarkBar percent={percent} fill={GRADE_REMARK_BAR_STYLES[remark]} classAverage={grade.subjectRank?.classAverage} className="flex-1" />
          <span className="w-10 text-end text-xs font-medium tabular-nums text-muted-foreground">{Math.round(percent)}%</span>
        </div>
      ) : null}
    </div>
  );
}

/** The card's own geometry, so the first load measures the real card height. */
export function GradeCardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <NSkeleton className="h-4 w-24" />
          <NSkeleton className="h-5 w-14 rounded-full" />
          <NSkeleton className="h-3.5 w-16" />
        </div>
        <NSkeleton className="h-5 w-14" />
      </div>
      <NSkeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}
