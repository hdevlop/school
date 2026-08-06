'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Award,
  BookOpen,
  CalendarClock,
  CalendarX,
  CircleDollarSign,
  Clock3,
  GraduationCap,
  Percent,
  UserRound,
} from 'lucide-react';
import { NStatCard } from 'najm-kit';
import { useStudentReport } from '@/features/Grades/hooks/useGrades';
import { useFees } from '@/features/Financial/Fees/hooks/useFees';
import { getAttendanceByStudentApi } from '@/services/attendanceApi';
import { Student } from './types';
import { useTranslation } from '@/hooks/useLanguage';
import { studentAvatarBackgroundClass } from '@/lib/avatar';

const defaultStudentImage = (gender?: string) =>
  gender === 'F' ? '/images/student_female.png' : '/images/student_male.png';

const formatMoneyStat = (value: unknown) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return '0 DH';
  if (amount >= 1000) return `${Math.round(amount / 100) / 10}k DH`;
  return `${Math.round(amount)} DH`;
};

const formatDateStat = (value: string | null | undefined, language: string, noneLabel: string) => {
  if (!value) return noneLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return noneLabel;
  return date.toLocaleDateString(language, { month: 'short', day: 'numeric' });
};

const formatPercentStat = (value?: number | null) =>
  value == null || !Number.isFinite(value) ? 'N/A' : `${Math.round(value)}%`;

const SkeletonBox = () => (
  <div className="h-[60px] rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
    <div className="flex items-center gap-2.5">
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-slate-100" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 w-12 animate-pulse rounded bg-slate-100" />
        <div className="h-3.5 w-16 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  </div>
);

interface LeftSidebarProps {
  student: Student | null | undefined;
  isLoading?: boolean;
}

export default function LeftSidebar({
  student,
  isLoading,
}: LeftSidebarProps) {
  const { t, language } = useTranslation();
  const { data: attendanceResponse } = useQuery({
    queryKey: ['attendance', 'student', student?.id, 'sidebar-stats'],
    queryFn: () => getAttendanceByStudentApi(student?.id as string),
    enabled: !!student?.id,
  });
  const { data: reportResponse } = useStudentReport(student?.id || null);
  const { studentFees } = useFees({ studentId: student?.id, enabled: false });

  const attendanceRowsRaw = attendanceResponse?.data ?? attendanceResponse ?? [];
  const attendanceRows = Array.isArray(attendanceRowsRaw) ? attendanceRowsRaw : [];
  const absentCount = attendanceRows.filter((row) => row.status === 'absent').length;
  const lateCount = attendanceRows.filter((row) => row.status === 'late').length;
  const report = reportResponse?.data ?? reportResponse;
  const gradeRows = Array.isArray(report?.subjects)
    ? report.subjects.flatMap((subject) => (Array.isArray(subject.grades) ? subject.grades : []))
    : [];
  const examGradeRows = gradeRows.filter((grade) => {
    const assessment = grade?.assessment ?? {};
    const type = String(assessment.type ?? '').toLowerCase();
    const title = String(assessment.title ?? '').toLowerCase();
    return type === 'test' || type.includes('exam') || title.includes('exam');
  });
  const examTotals = examGradeRows.reduce(
    (totals, grade) => ({
      marks: totals.marks + Number(grade.marksObtained ?? 0),
      total: totals.total + Number(grade.totalMarks ?? 0),
    }),
    { marks: 0, total: 0 },
  );
  const examAverageValue = examTotals.total > 0
    ? (examTotals.marks / examTotals.total) * 100
    : report?.averagePercentage;
  const averageGrade = formatPercentStat(report?.averagePercentage);
  const examAverage = formatPercentStat(examAverageValue);
  const gpaValue = report?.gpa == null ? 'N/A' : Number(report.gpa).toFixed(2);
  const gradeCount = report?.totalGrades ?? gradeRows.length ?? 0;

  const fees = Array.isArray(studentFees?.fees) ? studentFees.fees : [];
  const feeCount = studentFees?.summary?.totalFees ?? fees.length;
  const totalDue = studentFees?.summary?.totalDue
    ?? fees.reduce((sum, fee) => sum + Number(fee.balance ?? fee.totalDue ?? 0), 0);
  const dueItems = fees.flatMap((fee) => {
    const installments = Array.isArray(fee.installments) ? fee.installments : [];
    const installmentItems = installments.map((installment) => ({
      dueDate: installment.dueDate,
      status: installment.status,
      remaining: Number(installment.remainingAmount ?? installment.remaining ?? installment.amountDue ?? installment.amount ?? 0),
    }));

    return [
      ...installmentItems,
      {
        dueDate: fee.dueDate,
        status: fee.status,
        remaining: Number(fee.balance ?? fee.totalDue ?? fee.dueAmount ?? 0),
      },
    ];
  });
  const nextDueItem = dueItems
    .filter((item) => item.dueDate && item.status !== 'paid' && item.remaining > 0)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const sidebarStats = [
    {
      icon: UserRound,
      label: t('students.profile.age'),
      value: student?.age ? t('students.profile.yearsShort', { count: student.age }) : '—',
    },
    {
      icon: CircleDollarSign,
      label: t('students.profile.tabs.fees'),
      value: String(feeCount ?? 0),
    },
    {
      icon: CalendarX,
      label: t('students.profile.absences'),
      value: String(absentCount),
    },
    {
      icon: Clock3,
      label: t('students.profile.attendanceDetails.late'),
      value: String(lateCount),
    },
    {
      icon: Award,
      label: t('students.profile.examsAverage'),
      value: examAverage,
    },
    {
      icon: BookOpen,
      label: t('students.profile.tabs.grades'),
      value: String(gradeCount),
    },
    {
      icon: GraduationCap,
      label: t('students.profile.gpa'),
      value: gpaValue,
    },
    {
      icon: CalendarClock,
      label: t('students.profile.nextDue'),
      value: formatDateStat(nextDueItem?.dueDate, language, t('common.none')),
    },
  ];

  return (
    <aside className="h-full min-h-0 overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <div className="relative flex flex-col items-center px-4 pt-8 text-center">
          <div className="relative mb-3">
            <div className="rounded-full bg-gradient-to-br from-primary/40 via-primary/20 to-primary/5 p-[3px] shadow-lg shadow-primary/10">
              <img
                src={student?.image || defaultStudentImage(student?.gender)}
                alt={student?.name
                  ? t('students.profile.studentAvatarNamed', { name: student.name })
                  : t('students.profile.studentAvatar')}
                className={`h-24 w-24 rounded-full object-cover ${studentAvatarBackgroundClass}`}
              />
            </div>
            {student && (
              <span
                className={`absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-2 border-white ${
                  student.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
            )}
          </div>

          {isLoading ? (
            <div className="mb-2 h-6 w-36 animate-pulse rounded bg-slate-200" />
          ) : (
            <h3 className="max-w-full truncate text-lg font-bold text-slate-900">{student?.name ?? '—'}</h3>
          )}
          <p className="font-mono text-xs tracking-wide text-slate-500">{student?.studentCode ?? '—'}</p>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {student?.class && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                {student.class.name}{student.section ? ` · ${student.section.name}` : ''}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                student?.status === 'active'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${student?.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {student?.status ? t(`students.status.${student.status}`) : t('students.profile.unknown')}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-5 pt-5">
        <div className="grid grid-cols-2 gap-2.5">
          {isLoading ? (
            <>
              <SkeletonBox />
              <SkeletonBox />
              <SkeletonBox />
              <SkeletonBox />
              <SkeletonBox />
              <SkeletonBox />
              <SkeletonBox />
              <SkeletonBox />
            </>
          ) : (
            <>
              {sidebarStats.map((stat) => (
                <NStatCard
                  key={stat.label}
                  variant="compact"
                  icon={stat.icon}
                  label={stat.label}
                  value={stat.value}
                />
              ))}
            </>
          )}
        </div>

        <div className="mt-2.5 space-y-2.5">
          <NStatCard
            variant="compact"
            icon={GraduationCap}
            label={t('students.profile.averageGrade')}
            value={averageGrade}
          />
          <NStatCard
            variant="compact"
            icon={Percent}
            label={t('students.profile.due')}
            value={formatMoneyStat(totalDue)}
          />
        </div>
      </div>
    </aside>
  );
}
