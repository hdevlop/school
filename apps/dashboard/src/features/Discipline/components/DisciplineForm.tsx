'use client';

import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CalendarDays, Clock3, FileText, MapPin, ShieldAlert, UserRound } from 'lucide-react';
import { FormControl, FormField, FormInput, FormItem, FormLabel, NForm, NFormSectionHeader, SelectInput, useVariantPreset } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { useStudents } from '@/features/Students/hooks/useStudents';
import { FormStudentCombobox } from '@/features/Students/components/StudentCombobox';
import { useTranslation } from 'najm-i18n/react';
import { createDisciplineSchemas } from '../config/disciplineSchemas';
import { OTHER_LOCATION, buildDisciplineLocationOptions, isListedDisciplineLocation } from '../config/disciplineOptions';
import { DISCIPLINE_CATEGORIES, DISCIPLINE_SEVERITIES, type DisciplineIncident } from '../disciplineConstants';
import { useViewingYearCalendar } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { teachingDateWithinYear } from '@/features/AcademicYears/utils/viewingYear';

const localParts = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safe.getFullYear();
  const month = String(safe.getMonth() + 1).padStart(2, '0');
  const day = String(safe.getDate()).padStart(2, '0');
  const hours = String(safe.getHours()).padStart(2, '0');
  const minutes = String(safe.getMinutes()).padStart(2, '0');
  return { incidentDate: `${year}-${month}-${day}`, incidentTime: `${hours}:${minutes}` };
};

/** A list of usual places; "other" opens a text box, as does a place stored outside the list. */
function IncidentLocationField() {
  const { t } = useTranslation();
  const { control, getValues } = useFormContext();
  const preset = useVariantPreset();
  const [isOther, setIsOther] = useState(() => {
    const stored = getValues('location');
    return Boolean(stored) && !isListedDisciplineLocation(stored);
  });
  const items = useMemo(() => buildDisciplineLocationOptions(t), [t]);

  return (
    <>
      <FormField control={control} name="location" render={({ field }) => (
        <FormItem className={preset.item}>
          <FormLabel className={preset.label}>
            <MapPin aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            {t('discipline.form.location')}
          </FormLabel>
          <FormControl>
            <SelectInput
              value={isOther ? OTHER_LOCATION : field.value ?? ''}
              onChange={(choice) => {
                setIsOther(choice === OTHER_LOCATION);
                field.onChange(choice === OTHER_LOCATION ? '' : choice);
              }}
              items={items}
              placeholder={t('discipline.form.locationPlaceholder')}
              ariaLabel={t('discipline.form.location')}
              className={preset.input}
            />
          </FormControl>
        </FormItem>
      )} />
      {isOther && <FormInput name="location" type="text" placeholder={t('discipline.form.locationOtherPlaceholder')} />}
    </>
  );
}

export default function DisciplineForm({ incident }: { incident?: DisciplineIncident | null }) {
  const { t } = useTranslation();
  const disciplineSchema = useMemo(() => createDisciplineSchemas(t).discipline, [t]);
  const { pop } = useDialog();
  const { students, isStudentsLoading } = useStudents();
  const yearCalendar = useViewingYearCalendar();
  const dateParts = localParts(incident?.incidentAt);
  // A new incident starts on today's date inside the viewed year; once that
  // year has ended, today would be refused as outside it.
  if (!incident?.id) dateParts.incidentDate = teachingDateWithinYear(dateParts.incidentDate, yearCalendar);
  const activeStudents = useMemo(() => (students || []).filter((student) => student.status === 'active'), [students]);

  const defaultValues = {
    ...(incident?.id ? { id: incident.id } : {}),
    studentId: incident?.studentId || '',
    ...dateParts,
    category: incident?.category || 'classroom_disruption',
    severity: incident?.severity || 'medium',
    location: incident?.location || '',
    description: incident?.description || '',
  };

  const submit = (data) => {
    const { incidentDate, incidentTime, ...rest } = data;
    pop({
      ...rest,
      incidentAt: new Date(`${incidentDate}T${incidentTime}:00`).toISOString(),
      location: rest.location || null,
    });
  };

  return (
    <NForm id="discipline-form" schema={disciplineSchema} defaultValues={defaultValues} onSubmit={submit}>
      <div className="flex flex-col gap-4">
        <NFormSectionHeader icon={ShieldAlert} title={t('discipline.form.incidentDetails')} />
        <FormStudentCombobox
          formLabel={t('discipline.form.student')}
          placeholder={t('discipline.form.studentPlaceholder')}
          searchPlaceholder={t('discipline.form.studentSearch')}
          emptyMessage={t('discipline.form.noStudents')}
          icon={UserRound}
          students={activeStudents}
          disabled={isStudentsLoading}
          required
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput name="incidentDate" type="date" formLabel={t('discipline.form.incidentDate')} icon={CalendarDays} required />
          <FormInput name="incidentTime" type="time" formLabel={t('discipline.form.incidentTime')} icon={Clock3} required />
          <FormInput
            name="category" type="select" formLabel={t('discipline.form.category')} icon={ShieldAlert} required
            items={DISCIPLINE_CATEGORIES.map((value) => ({ value, label: t(`discipline.categories.${value}`) }))}
          />
          <FormInput
            name="severity" type="select" formLabel={t('discipline.form.severity')} icon={ShieldAlert} required
            items={DISCIPLINE_SEVERITIES.map((value) => ({ value, label: t(`discipline.severity.${value}`) }))}
          />
        </div>
        <IncidentLocationField />
        <FormInput name="description" type="textarea" formLabel={t('discipline.form.description')} placeholder={t('discipline.form.descriptionPlaceholder')} icon={FileText} required />
      </div>
    </NForm>
  );
}
