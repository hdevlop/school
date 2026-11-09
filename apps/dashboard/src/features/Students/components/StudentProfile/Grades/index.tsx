'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';

import { NBadge, NEmptyState, NStatCard } from 'najm-kit';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { useMemo } from 'react';
import { useStudentReport } from '@/features/Grades/hooks/useGrades';
import { GRADE_REMARK_COLORS, GRADE_REMARK_STYLES, gradeRemark } from '@/features/Grades/config/gradeRemarks';
import { Award, BookOpenCheck, Medal, Target, TrendingUp } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';

const pctColor = (pct?: number | null) => {
  if (pct == null) return 'text-slate-400';
  if (pct >= 75) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-rose-600';
};

const fmtPct = (value?: number | null) => (value == null ? '-' : `${Math.round(value)}%`);
/** A percentage as a mark on the school's scale: 88% is 17.6/20. */
const onScale = (pct: number, scale: number) => `${Number((pct / 100 * scale).toFixed(1))}/${scale}`;
/** Moroccan marks are /20 in collège and /10 in primary: the scale most of the grades use. */
function markScale(rows: Array<{ totalMarks?: number | string | null }>) {
  const counts = new Map<number, number>();
  for (const row of rows) { const total = Number(row.totalMarks); if (total > 0) counts.set(total, (counts.get(total) ?? 0) + 1); }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 20;
}
/** A card's label with what its value refers to: "Class rank · 1AC A". */
const withNote = (label: string, note?: string | null) => (note ? `${label} · ${note}` : label);

/**
 * The student's grades, to read: they are entered and corrected in one place,
 * the Grades page (or a Massar grid, which keeps them the same).
 */
export default function GradesTab({ studentId, student }: { studentId?: string; student?: { name?: string } }) {
  const { t } = useTranslation();
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
  const rank = report?.rank as { position: number; total: number; className: string } | null | undefined;

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
      cell: ({ row }: any) => (
        <div className="min-w-[150px] font-semibold text-slate-800">{row.original.subject?.name || t('common.notAssigned')}</div>
      ),
    },
    {
      accessorKey: 'marksObtained',
      header: t('students.profile.gradeDetails.marks'),
      enableSorting: true,
      cell: ({ row }: any) => (
        <div className="min-w-[110px] whitespace-nowrap font-medium text-slate-800">
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
      cell: ({ row }: any) => (
        <div className="flex min-w-[72px] items-center gap-2">
          <Award className="h-4 w-4 shrink-0 text-slate-400" />
          <span className={`font-bold ${pctColor(row.original.percentage)}`}>
            {fmtPct(row.original.percentage)}
          </span>
        </div>
      ),
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NStatCard
          icon={TrendingUp}
          label={withNote(t('students.profile.gradeDetails.overallAverage'), report?.totalGrades ? fmtPct(report.averagePercentage) : null)}
          value={report?.totalGrades ? onScale(report.averagePercentage, scale) : '-'}
          classNames={{ icon: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' }}
        />
        <NStatCard
          icon={Medal}
          label={withNote(t('students.profile.gradeDetails.classRank'), rank?.className)}
          value={rank ? `${rank.position} / ${rank.total}` : '-'}
          classNames={{ icon: 'bg-sky-50 text-sky-600 group-hover:bg-sky-100' }}
        />
        <NStatCard
          icon={Target}
          label={withNote(t('students.profile.gradeDetails.toWorkOn'), weakest?.subject?.name)}
          value={weakest ? onScale(weakest.averagePercentage, scale) : '-'}
          classNames={{ icon: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' }}
        />
        <NStatCard
          icon={BookOpenCheck}
          label={t('students.profile.tabs.grades')}
          value={report?.totalGrades ?? 0}
          classNames={{ icon: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' }}
        />
      </div>

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
