'use client';

import { NButton, NEmptyState, NStatCard, NTable } from 'najm-kit';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGrades, useStudentReport } from '@/features/Grades/hooks/useGrades';
import { Award, BookOpenCheck, GraduationCap, Save, TrendingUp } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';

const pctColor = (pct?: number | null) => {
  if (pct == null) return 'text-slate-400';
  if (pct >= 75) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-rose-600';
};

const fmtPct = (value?: number | null) => (value == null ? '-' : `${Math.round(value)}%`);
const fmtGpa = (value?: number | null) => (value == null ? '-' : Number(value).toFixed(2));
const gradePercentage = (marks: number | null | undefined, total: number | null | undefined) =>
  marks == null || !total ? null : Number(marks) / Number(total) * 100;

export default function GradesTab({ studentId }: { studentId?: string }) {
  const { t } = useTranslation();
  const { data: reportResponse, isLoading } = useStudentReport(studentId || null);
  const { updateGrade } = useGrades({ enabled: false });
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, Record<string, any>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const report = reportResponse?.data ?? reportResponse;
  const gradeStatusOptions = useMemo(() => [
    { value: 'graded', label: t('students.profile.gradeDetails.graded') },
    { value: 'pending', label: t('students.profile.gradeDetails.pending') },
    { value: 'missed', label: t('students.profile.gradeDetails.missed') },
  ], [t]);

  useEffect(() => setDrafts({}), [studentId]);

  const baseRows = useMemo(
    () => (report?.subjects || []).flatMap((subject: any) =>
      (subject.grades || []).map((grade: any) => ({
        ...grade,
        subject: subject.subject,
        subjectGpa: subject.gpa,
        subjectAveragePercentage: subject.averagePercentage,
      })),
    ),
    [report],
  );

  const rows = useMemo(() => baseRows.map((grade: any) => {
    const draft = drafts[grade.id];
    if (!draft) return grade;
    const merged = { ...grade, ...draft };
    return {
      ...merged,
      percentage: gradePercentage(merged.status === 'missed' ? 0 : merged.marksObtained, merged.totalMarks),
    };
  }), [baseRows, drafts]);
  const changedGrades = useMemo(() => Object.entries(drafts).filter(([id, draft]) => {
    const original = baseRows.find((grade: any) => grade.id === id);
    return original && Object.entries(draft).some(([field, value]) => original[field] !== value);
  }), [baseRows, drafts]);

  const handleCellEdit = useCallback((grade: any, field: string, value: any) => {
    setDrafts((current) => ({
      ...current,
      [grade.id]: {
        ...current[grade.id],
        [field]: value,
        ...(field === 'marksObtained' ? { status: 'graded' } : {}),
        ...(field === 'status' && value === 'missed' ? { marksObtained: 0 } : {}),
      },
    }));
  }, []);

  const handleSaveAll = useCallback(async () => {
    if (!changedGrades.length || isSaving) return;

    setIsSaving(true);
    try {
      const results = await Promise.allSettled(changedGrades.map(([id, draft]) =>
        updateGrade({ id, ...draft })
      ));
      const savedIds = changedGrades.flatMap(([id], index) => results[index].status === 'fulfilled' ? [id] : []);
      if (savedIds.length) {
        setDrafts((current) => {
          const next = { ...current };
          savedIds.forEach((id) => delete next[id]);
          return next;
        });
        await queryClient.invalidateQueries({ queryKey: ['grades', 'student', studentId, 'report'] });
      }
      if (savedIds.length === changedGrades.length) toast.success(t('grades.success.saved'));
      else toast.error(t('grades.errors.saveFailed'));
    } catch {
      toast.error(t('grades.errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [changedGrades, isSaving, queryClient, studentId, t, updateGrade]);

  const columns = useMemo(() => [
    {
      accessorKey: 'subject',
      header: t('students.profile.gradeDetails.subject'),
      enableSorting: false,
      cell: ({ row }: any) => (
        <div className="min-w-[150px]">
          <div className="font-semibold text-slate-800">{row.original.subject?.name || t('common.notAssigned')}</div>
          <div className="mt-0.5 text-xs text-slate-400">
            {row.original.subject?.code || '—'} · {t('students.profile.gpa')} {fmtGpa(row.original.subjectGpa)} · {t('students.profile.gradeDetails.averageShort')}{' '}
            <span className={pctColor(row.original.subjectAveragePercentage)}>
              {fmtPct(row.original.subjectAveragePercentage)}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'assessment',
      header: t('students.profile.gradeDetails.assessment'),
      enableSorting: false,
      cell: ({ row }: any) => (
        <span className="min-w-[150px] font-medium text-slate-700">
          {row.original.assessment?.title || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'marksObtained',
      header: t('students.profile.gradeDetails.marks'),
      enableSorting: true,
      meta: {
        editable: !isSaving,
        editor: 'number',
        min: 0,
        max: (grade: any) => grade.totalMarks ?? 1000,
        validate: (value: number | null, grade: any) =>
          value == null ? t('validation.general.requiredFieldMissing')
            : value < 0 || (grade.totalMarks != null && value > grade.totalMarks)
              ? t('validation.general.valueOutOfRange') : null,
      },
      cell: ({ row }: any) => (
        <div className="min-w-[110px] whitespace-nowrap font-medium text-slate-800">
          {row.original.marksObtained ?? '—'}
          <span className="ml-1 text-sm font-normal text-slate-400">/ {row.original.totalMarks ?? '—'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: t('students.profile.attendanceDetails.status'),
      enableSorting: true,
      meta: { editable: !isSaving, editor: 'select', options: gradeStatusOptions },
      cell: ({ getValue }: any) => (
        <span className="font-medium text-slate-700">
          {gradeStatusOptions.find((option) => option.value === getValue())?.label || gradeStatusOptions[1].label}
        </span>
      ),
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
  ], [gradeStatusOptions, isSaving, t]);

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NStatCard
          icon={GraduationCap}
          label={t('students.profile.gpa')}
          value={fmtGpa(report?.gpa)}
          classNames={{ icon: 'bg-sky-50 text-sky-600 group-hover:bg-sky-100' }}
        />
        <NStatCard
          icon={TrendingUp}
          label={t('students.profile.gradeDetails.average')}
          value={fmtPct(report?.averagePercentage)}
          classNames={{ icon: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' }}
        />
        <NStatCard
          icon={BookOpenCheck}
          label={t('students.profile.tabs.grades')}
          value={report?.totalGrades ?? 0}
          classNames={{ icon: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' }}
        />
      </div>

      <NTable
        className="min-h-0 flex-1"
        data={rows}
        getRowId={(grade: any) => grade.id}
        columns={columns}
        onCellEdit={handleCellEdit}
        loading={isLoading}
        defaultMode="table"
        availableModes={['table']}
        showViewToggle={false}
        showColumnVisibility={false}
        showCheckbox={false}
        loadingText={t('students.profile.gradeDetails.loading')}
        pagination={{ pageIndex: 0, pageSize: Math.max(rows.length, 1) }}
        showPagination={false}
        dynamicHeight={false}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={GraduationCap}
            title={t('students.profile.gradeDetails.noneRecorded')}
            className="min-h-64"
          />
        )}
      />
      <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white pt-3">
        <NButton type="button" onClick={handleSaveAll} disabled={isSaving || !changedGrades.length}>
          <Save className="mr-2 h-4 w-4" />
          {t('common.save')}
        </NButton>
      </div>
    </div>
  );
}
