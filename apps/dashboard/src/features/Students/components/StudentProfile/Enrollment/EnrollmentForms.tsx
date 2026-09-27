'use client';

import { useEffect, useMemo } from 'react';
import { FormInput, NForm, useDialog } from 'najm-kit';
import { useQuery } from '@tanstack/react-query';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'najm-i18n/react';
import { CalendarDays, DoorOpen, FileText, GraduationCap, LogOut } from 'lucide-react';
import { getClassesApi } from '@/services/classApi';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import type { EnrollmentPlacement } from '@/services/studentEnrollmentApi';
import {
  buildEndEnrollmentSchema,
  buildEnrollSchema,
  buildTransferSchema,
} from '@/features/Students/config/enrollmentSchemas';
import { buildEnrollmentEndStatusOptions } from '@/features/Students/config/enrollmentOptions';

type Year = { label: string; reportingStartsOn: string; reportingEndsOn: string };
type SchoolClass = { id: string; name: string; sections?: { id: string; name: string }[] };

// The classes of the year the operation targets, which need not be the one
// the tab views: the request sends that year, under a key naming it.
function useYearClasses(label: string) {
  const { data } = useQuery({
    queryKey: ['classes', 'academicYear', label],
    queryFn: () => withAcademicYear(label, getClassesApi),
  });
  return (data?.data ?? []) as SchoolClass[];
}

function PlacementFields({ year }: { year: Year }) {
  const { t } = useTranslation();
  const { setValue } = useFormContext();
  const classId = useWatch({ name: 'classId' });
  const sectionId = useWatch({ name: 'sectionId' });
  const classes = useYearClasses(year.label);

  const classOptions = classes.map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.name }));
  const sectionOptions = useMemo(
    () => (classes.find((schoolClass) => schoolClass.id === classId)?.sections ?? [])
      .map((section) => ({ value: section.id, label: section.name })),
    [classes, classId],
  );

  // A section belongs to its class: choosing another class clears it.
  useEffect(() => {
    if (sectionId && classes.length && !sectionOptions.some((option) => option.value === sectionId)) {
      setValue('sectionId', '');
    }
  }, [classes.length, sectionId, sectionOptions, setValue]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormInput
        name="classId"
        type="select"
        icon={GraduationCap}
        formLabel={t('students.form.class')}
        placeholder={t('students.form.classPlaceholder')}
        items={classOptions}
        required
      />
      <FormInput
        name="sectionId"
        type="select"
        icon={DoorOpen}
        formLabel={t('students.form.section')}
        placeholder={t('students.form.sectionPlaceholder')}
        items={sectionOptions}
        disabled={!classId || sectionOptions.length === 0}
        required
      />
    </div>
  );
}

export function EnrollForm({ year, defaultDate }: { year: Year; defaultDate: string }) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const schema = useMemo(() => buildEnrollSchema(year), [year]);

  return (
    <NForm
      id="student-enroll-form"
      schema={schema}
      defaultValues={{ classId: '', sectionId: '', enrolledOn: defaultDate }}
      onSubmit={pop}
    >
      <div className="flex flex-col gap-4">
        <PlacementFields year={year} />
        <FormInput
          name="enrolledOn"
          type="date"
          icon={CalendarDays}
          formLabel={t('students.enrollment.enrolledOn')}
          required
        />
      </div>
    </NForm>
  );
}

export function TransferForm({ year, current }: { year: Year; current: EnrollmentPlacement }) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const schema = useMemo(() => buildTransferSchema(year, current.validFrom), [year, current.validFrom]);

  return (
    <NForm
      id="student-transfer-form"
      schema={schema}
      defaultValues={{ classId: current.classId, sectionId: current.sectionId, validFrom: '', reason: '' }}
      onSubmit={pop}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {t('students.enrollment.currentPlacement', {
            className: current.className,
            sectionName: current.sectionName,
            date: current.validFrom,
          })}
        </p>
        <PlacementFields year={year} />
        <FormInput
          name="validFrom"
          type="date"
          icon={CalendarDays}
          formLabel={t('students.enrollment.validFrom')}
          required
        />
        <FormInput
          name="reason"
          type="textarea"
          icon={FileText}
          formLabel={t('students.enrollment.reason')}
          placeholder={t('students.enrollment.reasonPlaceholder')}
          required
        />
      </div>
    </NForm>
  );
}

export function EndEnrollmentForm({ current }: { current: EnrollmentPlacement }) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const schema = useMemo(() => buildEndEnrollmentSchema(current.validFrom), [current.validFrom]);

  return (
    <NForm
      id="student-end-enrollment-form"
      schema={schema}
      defaultValues={{ leftOn: '', status: 'withdrawn' }}
      onSubmit={pop}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormInput
          name="leftOn"
          type="date"
          icon={CalendarDays}
          formLabel={t('students.enrollment.leftOn')}
          required
        />
        <FormInput
          name="status"
          type="select"
          icon={LogOut}
          formLabel={t('students.enrollment.outcome')}
          items={buildEnrollmentEndStatusOptions(t)}
          required
        />
      </div>
    </NForm>
  );
}
