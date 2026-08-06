'use client';

import { Input, NButton, NEmptyState, NStatCard, NTable } from 'najm-kit';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGrades, useStudentReport } from '@/features/Grades/hooks/useGrades';
import { Award, BookOpenCheck, GraduationCap, Save, TrendingUp } from 'lucide-react';
import { NativeProfileSelect } from '../NativeProfileSelect';
import { useTranslation } from '@/hooks/useLanguage';

const pctColor = (pct?: number | null) => {
  if (pct == null) return 'text-slate-400';
  if (pct >= 75) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-rose-600';
};

const fmtPct = (value?: number | null) => (value == null ? '-' : `${Math.round(value)}%`);
const fmtGpa = (value?: number | null) => (value == null ? '-' : Number(value).toFixed(2));

export default function GradesTab({ studentId }: { studentId?: string }) {
  const { t } = useTranslation();
  const { data: reportResponse, isLoading } = useStudentReport(studentId || null);
  const { updateGrade, isUpdating } = useGrades({ enabled: false });
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const report = reportResponse?.data ?? reportResponse;
  const gradeStatusOptions = useMemo(() => [
    { value: 'graded', label: t('students.profile.gradeDetails.graded') },
    { value: 'pending', label: t('students.profile.gradeDetails.pending') },
    { value: 'missed', label: t('students.profile.gradeDetails.missed') },
  ], [t]);

  useEffect(() => {
    if (!report?.subjects) return;

    const nextDrafts: Record<string, any> = {};
    report.subjects.forEach((subject) => {
      (subject.grades || []).forEach((grade) => {
        nextDrafts[grade.id] = {
          marksObtained: grade.marksObtained ?? '',
          feedback: grade.feedback ?? '',
          status: grade.status || 'pending',
        };
      });
    });
    setDrafts(nextDrafts);
  }, [report]);

  const handleDraftChange = useCallback((gradeId: string, field: string, value: any) => {
    setDrafts((current) => ({
      ...current,
      [gradeId]: {
        ...current[gradeId],
        [field]: value,
      },
    }));
  }, []);

  const handleSaveGrade = useCallback(async (grade: any) => {
    const draft = drafts[grade.id];
    if (!draft) return;

    const payload: any = {
      id: grade.id,
      status: draft.status,
      feedback: draft.feedback ?? '',
    };

    if (draft.status === 'missed') {
      payload.marksObtained = 0;
    } else if (draft.marksObtained !== '') {
      payload.marksObtained = Number(draft.marksObtained);
    }

    await updateGrade(payload);
    await queryClient.invalidateQueries({ queryKey: ['grades', 'student', studentId, 'report'] });
  }, [drafts, queryClient, studentId, updateGrade]);

  const rows = useMemo(
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
      cell: ({ row }: any) => {
        const grade = row.original;
        const draft = drafts[grade.id] || {
          marksObtained: grade.marksObtained ?? '',
          feedback: grade.feedback ?? '',
          status: grade.status || 'pending',
        };

        return (
          <div className="flex min-w-[130px] items-center gap-2">
            <Input
              aria-label={t('students.profile.gradeDetails.marksFor', {
                assessment: grade.assessment?.title || t('students.profile.gradeDetails.assessment').toLowerCase(),
              })}
              type="number"
              min={0}
              max={grade.totalMarks ?? undefined}
              value={draft.marksObtained}
              onChange={(event) => handleDraftChange(grade.id, 'marksObtained', event.target.value)}
              className="h-9 w-20"
            />
            <span className="whitespace-nowrap text-sm text-slate-400">/ {grade.totalMarks ?? '—'}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: t('students.profile.attendanceDetails.status'),
      enableSorting: true,
      cell: ({ row }: any) => {
        const grade = row.original;
        const draft = drafts[grade.id] || {
          marksObtained: grade.marksObtained ?? '',
          feedback: grade.feedback ?? '',
          status: grade.status || 'pending',
        };

        return (
          <div className="min-w-[130px]">
            <NativeProfileSelect
              value={draft.status}
              onValueChange={(value) => handleDraftChange(grade.id, 'status', value)}
              options={gradeStatusOptions}
            />
          </div>
        );
      },
    },
    {
      accessorKey: 'feedback',
      header: t('students.profile.gradeDetails.feedback'),
      enableSorting: false,
      cell: ({ row }: any) => {
        const grade = row.original;
        const draft = drafts[grade.id] || {
          marksObtained: grade.marksObtained ?? '',
          feedback: grade.feedback ?? '',
          status: grade.status || 'pending',
        };

        return (
          <Input
            aria-label={t('students.profile.gradeDetails.feedbackFor', {
              assessment: grade.assessment?.title || t('students.profile.gradeDetails.assessment').toLowerCase(),
            })}
            value={draft.feedback}
            placeholder={t('students.profile.gradeDetails.feedback')}
            onChange={(event) => handleDraftChange(grade.id, 'feedback', event.target.value)}
            className="h-9 min-w-[220px]"
          />
        );
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
      id: 'actions',
      header: t('common.actions'),
      enableSorting: false,
      cell: ({ row }: any) => (
        <NButton
          type="button"
          size="sm"
          onClick={() => handleSaveGrade(row.original)}
          disabled={isUpdating}
        >
          <Save className="mr-2 h-4 w-4" />
          {t('common.save')}
        </NButton>
      ),
    },
  ], [drafts, gradeStatusOptions, handleDraftChange, handleSaveGrade, isUpdating, t]);

  return (
    <div className="space-y-4">
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
        data={rows}
        columns={columns}
        loading={isLoading}
        defaultMode="table"
        availableModes={['table']}
        showViewToggle={false}
        showColumnVisibility={false}
        showCheckbox={false}
        loadingText={t('students.profile.gradeDetails.loading')}
        noDataText={t('students.profile.gradeDetails.noneRecorded')}
        pagination={{ pageIndex: 0, pageSize: Math.max(rows.length, 1) }}
        showPagination={false}
        dynamicHeight={false}
        renderEmpty={() => (
          <NEmptyState
            icon={GraduationCap}
            title={t('students.profile.gradeDetails.noneRecorded')}
            className="min-h-64"
          />
        )}
      />
    </div>
  );
}
