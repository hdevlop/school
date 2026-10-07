"use client";

import React, { useMemo } from 'react';
import { Briefcase, GraduationCap, SearchX, UserRound, UsersRound } from 'lucide-react';
import { NBadge, NCard, NEmptyState, NErrorState, NTable } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { TeacherDashboardClass } from '@sms/contracts/teacher-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { hasFailedToLoad } from '@/services/apiError';
import {
  EMPLOYMENT_TYPE_TRANSLATION_PREFIX,
  GENDER_TRANSLATION_PREFIX,
} from '../../config/teacherOptions';

interface TeacherDetailsTabProps {
  teacher: any;
  // This year's assignments, as the overview reads them.
  classes: TeacherDashboardClass[] | undefined;
  classesLoading: boolean;
  classesError: unknown;
}

type Field = { label: string; value: React.ReactNode };

const maskAccount = (value?: string | null) => {
  const digits = String(value ?? '').replace(/\s+/g, '');
  return digits.length > 4 ? `•••• •••• ${digits.slice(-4)}` : digits || null;
};

const FieldList = ({ fields, empty }: { fields: Field[]; empty: string }) => (
  <dl className="flex flex-col divide-y divide-border/60">
    {fields.map(({ label, value }) => (
      <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-3 py-2.5 text-sm">
        <dt className="truncate text-muted-foreground">{label}</dt>
        <dd className="min-w-0 truncate text-foreground">
          {value === null || value === undefined || value === '' ? (
            <span className="text-muted-foreground">{empty}</span>
          ) : value}
        </dd>
      </div>
    ))}
  </dl>
);

const TeacherDetailsTab: React.FC<TeacherDetailsTabProps> = ({ teacher, classes, classesLoading, classesError }) => {
  const { t } = useTranslation();
  const { displayDateOnly, majorMoney, number } = useSchoolFormat();
  const empty = t('common.notSpecified');
  const isHourly = teacher?.compensationMode === 'hourly';

  const personal: Field[] = [
    { label: t('teachers.form.fullName'), value: teacher?.name },
    { label: t('teachers.form.cin'), value: teacher?.cin },
    { label: t('teachers.form.gender'), value: teacher?.gender ? t(`${GENDER_TRANSLATION_PREFIX}.${teacher.gender}`) : null },
    { label: t('teachers.form.address'), value: teacher?.address },
    { label: t('teachers.form.phone'), value: teacher?.phone },
    { label: t('teachers.form.email'), value: teacher?.email },
  ];

  const employment: Field[] = [
    { label: t('teachers.form.status'), value: teacher?.status ? <NBadge status={teacher.status} /> : null },
    {
      label: t('teachers.form.employmentType'),
      value: teacher?.employmentType ? t(`${EMPLOYMENT_TYPE_TRANSLATION_PREFIX}.${teacher.employmentType}`) : null,
    },
    { label: t('teachers.form.hireDate'), value: teacher?.hireDate ? displayDateOnly(teacher.hireDate) : null },
    {
      label: t('teachers.form.workloadHours'),
      value: teacher?.workloadHours != null ? t('dashboard.teacher.info.hoursPerWeek', { hours: teacher.workloadHours }) : null,
    },
    isHourly
      ? { label: t('dashboard.teacher.payroll.hourlyRate'), value: teacher?.hourlyRate != null ? majorMoney(Number(teacher.hourlyRate)) : null }
      : { label: t('teachers.form.salary'), value: teacher?.salary != null ? majorMoney(Number(teacher.salary)) : null },
    { label: t('teachers.form.bankAccount'), value: maskAccount(teacher?.bankAccount) },
  ];

  const academic: Field[] = [
    { label: t('teachers.form.specialization'), value: teacher?.specialization },
    { label: t('teachers.form.academicDegrees'), value: teacher?.academicDegrees },
    {
      label: t('teachers.profile.experience'),
      value: teacher?.yearsOfExperience != null
        ? t('dashboard.teacher.info.yearsCount', { count: teacher.yearsOfExperience })
        : null,
    },
    { label: t('teachers.form.emergencyContactName'), value: teacher?.emergencyContact },
    { label: t('teachers.form.emergencyPhone'), value: teacher?.emergencyPhone },
  ];

  const rows = useMemo(
    () => (classes ?? []).map((item) => ({ ...item, id: item.teacherAssignmentId })),
    [classes],
  );

  const columns = useMemo(() => [
    {
      accessorKey: 'className',
      header: t('teachers.profile.table.class'),
      enableSorting: true,
      cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue() as string}</span>,
    },
    { accessorKey: 'sectionName', header: t('teachers.profile.table.section'), enableSorting: true },
    { accessorKey: 'subjectName', header: t('teachers.profile.table.subject'), enableSorting: true },
    {
      accessorKey: 'studentCount',
      header: t('teachers.profile.table.students'),
      enableSorting: true,
      cell: ({ getValue }) => number(Number(getValue() ?? 0)),
    },
  ], [t, number]);

  return (
    <div className="flex min-h-full flex-col gap-3 pb-1">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 [&>*]:min-w-0">
        <NCard title={t('teachers.profile.personalInformation')} icon={UserRound} className="h-full">
          <FieldList fields={personal} empty={empty} />
        </NCard>
        <NCard title={t('dashboard.teacher.details.employment')} icon={Briefcase} className="h-full">
          <FieldList fields={employment} empty={empty} />
        </NCard>
        <NCard title={t('dashboard.teacher.details.academicEmergency')} icon={GraduationCap} className="h-full">
          <FieldList fields={academic} empty={empty} />
        </NCard>
      </div>

      <NCard title={t('teachers.profile.teachingAssignments')} icon={UsersRound} className="lg:flex-1">
        <NTable
          data={rows}
          columns={columns}
          loading={classesLoading}
          error={hasFailedToLoad(classesError, classes) ? classesError : null}
          renderError={() => <NErrorState surface="panel" />}
          dynamicHeight={false}
          showPagination={false}
          showCheckbox={false}
          showAddButton={false}
          showViewToggle={false}
          showColumnVisibility={false}
          renderEmpty={() => (
            <NEmptyState surface="panel" icon={UsersRound} title={t('teachers.form.noAssignments')} />
          )}
          renderFilteredEmpty={() => (
            <NEmptyState
              surface="panel"
              icon={SearchX}
              title={t('emptyStates.filtered.title')}
              description={t('emptyStates.filtered.description')}
            />
          )}
        />
      </NCard>
    </div>
  );
};

export default TeacherDetailsTab;
