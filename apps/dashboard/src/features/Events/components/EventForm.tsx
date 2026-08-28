'use client';

import React from 'react';
import {
  Activity,
  Building,
  Calendar,
  Clock,
  FileText,
  MapPin,
  Tag,
  Users,
} from 'lucide-react';
import { NForm } from 'najm-kit';
import { FormInput } from 'najm-kit';

import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import { useDialog } from 'najm-kit';
import { eventSchema } from '@/lib/validations';
import { buildFill, isDevFill } from '@/lib/devFill';
import { useEnum } from '@/hooks/useEnum';
import { useClasses } from '@/hooks/useClasses';
import { useTranslation } from '@/hooks/useLanguage';

const eventTypeLabels = {
  academic: 'Academic',
  sports: 'Sports',
  cultural: 'Cultural',
  holiday: 'Holiday',
  exam: 'Exam',
  meeting: 'Meeting',
  workshop: 'Workshop',
  fieldtrip: 'Field Trip',
  ceremony: 'Ceremony',
  conference: 'Conference',
  other: 'Other',
};

const statusLabels = {
  scheduled: 'Scheduled',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  postponed: 'Postponed',
};

const visibilityLabels = {
  public: 'Public',
  private: 'Private',
  teachers: 'Teachers',
  students: 'Students',
  parents: 'Parents',
  staff: 'Staff',
};

const toDateInput = (value?: string | Date | null) => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).slice(0, 10);
};

const emptyToUndefined = (value) => (value === '' || value === null ? undefined : value);

const EventForm = ({ event = null, initialDate = null }) => {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { classes, isClassesLoading } = useClasses();

  const typeOptions = useEnum('eventType', { customLabels: eventTypeLabels });
  const statusOptions = useEnum('eventStatus', { customLabels: statusLabels });
  const visibilityOptions = useEnum('eventVisibility', { customLabels: visibilityLabels });

  const initialClassIds = Array.isArray(event?.classIds) && event.classIds.length > 0
    ? event.classIds
    : event?.classId || event?.class?.id
      ? [event.classId || event.class.id]
      : [];
  const selectedDate = toDateInput(initialDate) || new Date().toISOString().split('T')[0];

  const defaultValues = {
    ...(event?.id && { id: event.id }),
    title: event?.title || '',
    description: event?.description || '',
    type: event?.type || 'academic',
    startDate: toDateInput(event?.startDate) || selectedDate,
    endDate: toDateInput(event?.endDate) || selectedDate,
    startTime: event?.startTime || undefined,
    endTime: event?.endTime || undefined,
    location: event?.location || '',
    venue: event?.venue || '',
    classIds: initialClassIds,
    classId: initialClassIds[0] || undefined,
    sectionId: undefined,
    visibility: event?.visibility || 'public',
    status: event?.status || 'scheduled',
    capacity: event?.capacity ?? undefined,
    registrationRequired: event?.registrationRequired ?? false,
    registrationDeadline: toDateInput(event?.registrationDeadline),
  };

  const classOptions = (classes || []).map((cls) => ({
    value: cls.id,
    label: cls.name,
  }));
  const devFillValues = {
    classIds: classOptions.slice(0, 2).map((item) => item.value),
    classId: classOptions[0]?.value || '',
    sectionId: '',
  };

  const handleSubmit = async (formData) => {
    const classIds = [...new Set((formData.classIds || []).filter(Boolean))];
    const payload = {
      ...formData,
      classIds,
      classId: classIds[0] || null,
      sectionId: null,
      startTime: emptyToUndefined(formData.startTime),
      endTime: emptyToUndefined(formData.endTime),
      location: emptyToUndefined(formData.location),
      venue: emptyToUndefined(formData.venue),
      capacity: emptyToUndefined(formData.capacity),
      registrationDeadline: emptyToUndefined(formData.registrationDeadline),
      description: emptyToUndefined(formData.description),
    };

    if (!payload.endDate) payload.endDate = payload.startDate;
    pop(payload);
  };

  return (
    <NForm id="event-form" schema={eventSchema} defaultValues={defaultValues} onSubmit={handleSubmit} devTools={{ enabled: isDevFill, fill: () => buildFill(eventSchema, devFillValues) }}>
      <div className="flex flex-col gap-4">
        <FormSectionHeader icon={Calendar} title={t('events.sections.eventDetails')} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput
            name="title"
            type="text"
            formLabel={t('events.form.title')}
            placeholder={t('events.form.titlePlaceholder')}
            icon={Calendar}
            required
          />

          <FormInput
            name="type"
            type="select"
            formLabel={t('events.form.type')}
            placeholder={t('events.form.typePlaceholder')}
            icon={Tag}
            items={typeOptions}
            required
          />
        </div>

        <FormInput
          name="description"
          type="textarea"
          formLabel={t('events.form.description')}
          placeholder={t('events.form.descriptionPlaceholder')}
          icon={FileText}
        />

        <FormSectionHeader icon={Clock} title={t('events.sections.schedule')} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput name="startDate" type="date" formLabel={t('events.form.startDate')} icon={Calendar} required />
          <FormInput name="endDate" type="date" formLabel={t('events.form.endDate')} icon={Calendar} required />
          <FormInput name="startTime" type="time" formLabel={t('events.form.startTime')} icon={Clock} />
          <FormInput name="endTime" type="time" formLabel={t('events.form.endTime')} icon={Clock} />
        </div>

        <FormSectionHeader icon={MapPin} title="Place & Audience" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput name="location" type="text" formLabel={t('events.form.location')} placeholder={t('events.form.locationPlaceholder')} icon={MapPin} />
          <FormInput name="venue" type="text" formLabel={t('events.form.venue')} placeholder={t('events.form.venuePlaceholder')} icon={Building} />
          <FormInput
            name="classIds"
            type="multiselect"
            formLabel={t('events.form.class')}
            placeholder={t('events.form.classPlaceholder')}
            icon={Building}
            items={classOptions}
            searchPlaceholder={t('events.form.searchClasses')}
            emptyMessage={t('events.form.noClasses')}
            disabled={isClassesLoading || classOptions.length === 0}
            maxDisplay={3}
            required
          />

          <FormInput
            name="status"
            type="select"
            formLabel={t('events.form.status')}
            placeholder={t('events.form.statusPlaceholder')}
            icon={Activity}
            items={statusOptions}
            required
          />
          <FormInput
            name="visibility"
            type="select"
            formLabel={t('events.form.visibility')}
            placeholder={t('events.form.visibilityPlaceholder')}
            icon={Users}
            items={visibilityOptions}
            required
          />
        </div>

      </div>
    </NForm>
  );
};

export default EventForm;
