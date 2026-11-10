'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';

import { NBadge, NEmptyState, NStatCard, useMediaQuery } from 'najm-kit';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { useMemo } from 'react';
import { useStudentReport } from '@/features/Grades/hooks/useGrades';
import { GRADE_REMARK_BAR_STYLES, GRADE_REMARK_COLORS, GRADE_REMARK_STYLES, gradeRemark } from '@/features/Grades/config/gradeRemarks';
import { BookOpenCheck, Medal, Target, TrendingUp } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { GradeCard, GradeCardSkeleton, gradeSource } from './GradeCard';
import { GradeSummaryCard, GradeSummarySkeleton, WeakestSubjectBanner } from './GradeSummaryCard';

const fmtPct = (value?: number | null) => (value == null ? '-' : `${Math.round(value)}%`);
/** A percentage as a mark on the school's scale: 88% is 17.6/20. */
const onScale = (pct: number, scale: number) => `${Number((pct / 100 * scale).toFixed(1))}/${scale}`;
/** Moroccan marks are /20 in collège and /10 in primary: the scale most of the grades use. */
function markScale(rows: Array<{ totalMarks?: number | string | null }>) {
  const counts = new Map<number, number>();
  for (const row of rows) { const total = Number(row.totalMarks); if (total > 0) counts.set(total, (counts.get(total) ?? 0) + 1); }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 20;
}
/** A stat's note (the class, the subject) on its own line, cut short rather than wrapped. */
const STAT_CLASS_NAMES = { description: 'truncate text-xs' };

/**
 * The student's grades, to read: they are entered and corrected in one place,
 * the Grades page (or a Massar grid, which keeps them the same).
 */
export default function GradesTab({ studentId, student }: { studentId?: string; student?: { name?: string } }) {
  const { t } = useTranslation();
  // Below lg, where the grades turn into cards, one summary card replaces the four tiles.
  const isStacked = useMediaQuery('(max-width: 1023px)');
  const { data: reportResponse, isLoading } = useStudentReport(studentId || null);
  const report = reportResponse?.data ?? reportResponse;

  const rows = useMemo(
    () => (report?.subjects || []).flatMap((subject: any) =>
      (subject.grades || []).map((grade: any) => ({ ...grade, subject: subject.subject, subjectRank: subject.rank })),
    ),
    [report],
  );
  const scale = markScale(rows);
  // The subject with the lowest average, once there are several to compare.
  const weakest = (report?.subjects || []).length > 1
    ? [...report.subjects].sort((a: any, b: any) => a.averagePercentage - b.averagePercentage)[0] : null;
  const rank = report?.rank as { position: number; total: number; className: string; classAverage?: number | null } | null | undefined;

  const columns = useMemo(() => [
    {
      id: 'position',
      header: '#',
      size: 48,
      enableSorting: false,
      // The row's place as shown, whatever the sort.
      cell: ({ row, table }: any) => (
        <span className="tabular-nums text-slate-400">{table.getRowModel().rows.findIndex((item: any) => item.id === row.id) + 1}</span>
      ),
    },
    {
      accessorKey: 'subject',
      header: t('students.profile.gradeDetails.subject'),
      size: 340,
      enableSorting: false,
      // A subject can hold several grades: the assessment or exam tells them apart.
      cell: ({ row }: any) => {
        const source = gradeSource(row.original);
        return (
          <div className="min-w-37.5">
            <div className="font-semibold text-foreground"><bdi>{row.original.subject?.name || t('common.notAssigned')}</bdi></div>
            {source ? <div className="text-xs text-muted-foreground"><bdi>{source}</bdi></div> : null}
          </div>
        );
      },
    },
    {
      accessorKey: 'marksObtained',
      header: t('students.profile.gradeDetails.marks'),
      enableSorting: true,
      cell: ({ row }: any) => (
        <div className="min-w-27.5 whitespace-nowrap font-medium text-slate-800">
          {row.original.marksObtained ?? '—'}
          <span className="ml-1 text-sm font-normal text-slate-400">/ {row.original.totalMarks ?? '—'}</span>
        </div>
      ),
    },
    {
      // The student's place in the class in this subject.
      id: 'subjectRank',
      accessorFn: (row: any) => row.subjectRank?.position ?? null,
      header: t('students.profile.gradeDetails.rank'),
      enableSorting: true,
      cell: ({ row }: any) => (
        <span className="whitespace-nowrap tabular-nums font-medium text-slate-700">
          {row.original.subjectRank ? <>{row.original.subjectRank.position}<span className="font-normal text-slate-400"> / {row.original.subjectRank.total}</span></> : '—'}
        </span>
      ),
    },
    {
      // The usual Moroccan remark for the mark, from ممتاز to غير كاف; none without a mark.
      id: 'remark',
      header: t('students.profile.gradeDetails.remark'),
      enableSorting: false,
      cell: ({ row }: any) => {
        const remark = gradeRemark(row.original);
        return remark ? <NBadge color={GRADE_REMARK_COLORS[remark]} className={GRADE_REMARK_STYLES[remark]} label={t(`students.profile.gradeDetails.remarks.${remark}`)} look="soft" /> : <span className="text-slate-400">—</span>;
      },
    },
    {
      accessorKey: 'percentage',
      header: t('students.profile.gradeDetails.result'),
      enableSorting: true,
      // A bar in the remark's hue, so the result never disagrees with the remark beside it.
      cell: ({ row }: any) => {
        const remark = gradeRemark(row.original);
        if (!remark) return <span className="text-muted-foreground">—</span>;
        const percent = Math.min(Math.max(row.original.percentage ?? 0, 0), 100);
        return (
          <div className="flex min-w-30 items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-foreground/15">
              <div className={`h-full rounded-full ${GRADE_REMARK_BAR_STYLES[remark]}`} style={{ width: `${percent}%` }} />
            </div>
            <span className="text-sm font-semibold tabular-nums text-foreground">{fmtPct(row.original.percentage)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: t('students.profile.attendanceDetails.status'),
      enableSorting: true,
      cell: ({ getValue }: any) => <NBadge status={getValue() || 'pending'} />,
    },
  ], [t]);

  return (
    <div className="flex min-h-full flex-col gap-3">
      {isStacked ? (
        isLoading ? <GradeSummarySkeleton /> : report?.totalGrades ? (
          <>
            <GradeSummaryCard average={report.averagePercentage} rank={rank} scale={scale} />
            {weakest ? <WeakestSubjectBanner subject={weakest} scale={scale} /> : null}
          </>
        ) : null
      ) : (
      <div className="grid grid-cols-4 gap-3">
        <NStatCard
          icon={TrendingUp}
          label={t('students.profile.gradeDetails.overallAverage')}
          value={report?.totalGrades ? onScale(report.averagePercentage, scale) : '-'}
          subtext={report?.totalGrades ? fmtPct(report.averagePercentage) : undefined}
          classNames={{ ...STAT_CLASS_NAMES, icon: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' }}
        />
        <NStatCard
          icon={Medal}
          label={t('students.profile.gradeDetails.classRank')}
          value={rank ? `${rank.position} / ${rank.total}` : '-'}
          subtext={rank?.className || undefined}
          classNames={{ ...STAT_CLASS_NAMES, icon: 'bg-sky-50 text-sky-600 group-hover:bg-sky-100' }}
        />
        <NStatCard
          icon={Target}
          label={t('students.profile.gradeDetails.toWorkOn')}
          value={weakest ? onScale(weakest.averagePercentage, scale) : '-'}
          subtext={weakest?.subject?.name || undefined}
          classNames={{ ...STAT_CLASS_NAMES, icon: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' }}
        />
        <NStatCard
          icon={BookOpenCheck}
          label={t('students.profile.tabs.grades')}
          value={report?.totalGrades ?? 0}
          classNames={{ icon: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' }}
        />
      </div>
      )}

      {!isLoading && rows.length === 0 ? (
        <NEmptyState
          surface="panel"
          icon={FEATURE_ICONS.grades}
          title={t('students.profile.gradeDetails.noneRecorded')}
          className="min-h-64"
        />
      ) : (
      <NTable
        exportTitle={[student?.name, t('students.profile.tabs.grades')].filter(Boolean).join(' - ')}
        className="min-h-0 flex-1"
        data={rows}
        getRowId={(grade: any) => grade.id}
        columns={columns}
        loading={isLoading}
        defaultMode="table"
        availableModes={['table']}
        showViewToggle={false}
        showColumnVisibility={false}
        showCheckbox={false}
        // Below lg NTable turns rows into cards; without this each cell becomes a label/value line.
        renderCard={GradeCard}
        renderCardSkeleton={GradeCardSkeleton}
        // No export or print here: without them the table needs no toolbar row under the stats.
        showExportButton={false}
        showPrintButton={false}
        loadingText={t('students.profile.gradeDetails.loading')}
        pagination={{ pageIndex: 0, pageSize: Math.max(rows.length, 1) }}
        showPagination={false}
        dynamicHeight={false}
      />
      )}
    </div>
  );
}
