'use client';

import { CalendarDays, Clock3, FileText, MapPin, ShieldAlert, UserRound } from 'lucide-react';
import { FormInput, NForm, NFormSectionHeader, useDialog } from 'najm-kit';
import { useStudents } from '@/features/Students/hooks/useStudents';
import { useTranslation } from 'najm-i18n/react';
import { disciplineSchema } from '@/lib/validations';
import { DISCIPLINE_CATEGORIES, DISCIPLINE_SEVERITIES, type DisciplineIncident } from '../disciplineConstants';

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

export default function DisciplineForm({ incident }: { incident?: DisciplineIncident | null }) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { students, isStudentsLoading } = useStudents();
  const dateParts = localParts(incident?.incidentAt);
  const studentOptions = (students || [])
    .filter((student) => student.status === 'active')
    .map((student) => ({ value: student.id, label: `${student.name} · ${student.studentCode}` }));

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
        <FormInput
          name="studentId"
          type="combobox"
          formLabel={t('discipline.form.student')}
          placeholder={t('discipline.form.studentPlaceholder')}
          searchPlaceholder={t('discipline.form.studentSearch')}
          emptyMessage={t('discipline.form.noStudents')}
          icon={UserRound}
          items={studentOptions}
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
        <FormInput name="location" type="text" formLabel={t('discipline.form.location')} placeholder={t('discipline.form.locationPlaceholder')} icon={MapPin} />
        <FormInput name="description" type="textarea" formLabel={t('discipline.form.description')} placeholder={t('discipline.form.descriptionPlaceholder')} icon={FileText} required />
      </div>
    </NForm>
  );
}
