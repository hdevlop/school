'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import React from 'react'
import { useActiveForm } from '@/hooks/useActiveForm'
import { Megaphone, FileText, Users, Building, Calendar } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { announcementSchema } from '@/lib/validations'
import { buildFill, isDevFill } from '@/lib/devFill'
import { DevFormFiller } from '@/components/DevFormFiller'
import { useTranslation } from '@/hooks/useLanguage'
import { useClasses } from '@/hooks/useClasses'

const toIsoOrUndefined = (value) => {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
};

const toDateInput = (value) => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).slice(0, 10);
};

const ClassTargetFields = () => {
  const { t } = useTranslation();
  const { watch } = useActiveForm();
  const { classes, isClassesLoading } = useClasses();

  const targetAudience = watch('targetAudience');

  if (targetAudience !== 'class') return null;

  const classOptions = classes?.map((cls) => ({
    value: cls.id,
    label: cls.name,
  })) || [];

  return (
    <div className='md:col-span-2'>
      <FormInput
        name='classIds'
        type='multiselect'
        formLabel={t('announcements.form.class')}
        placeholder='Select classes'
        icon={Building}
        items={classOptions}
        searchPlaceholder='Search classes...'
        emptyMessage='No classes found'
        maxDisplay={3}
        required
        disabled={isClassesLoading || classOptions.length === 0}
      />
    </div>
  );
};

const AnnouncementForm = ({ announcement = null, defaultPublishDate = null }) => {
  const { t } = useTranslation();
  const { pop } = useDialog();

  const initialClassId = announcement?.classId || announcement?.class?.id || '';
  const initialClassIds = Array.isArray(announcement?.classIds) && announcement.classIds.length > 0
    ? announcement.classIds
    : initialClassId
      ? [initialClassId]
      : [];

  const defaultValues = {
    ...(announcement?.id && { id: announcement.id }),
    title: announcement?.title || '',
    content: announcement?.content || '',
    targetAudience: announcement?.targetAudience || 'all',
    classId: initialClassIds[0] || '',
    classIds: initialClassIds,
    publishDate: toDateInput(announcement?.publishDate || defaultPublishDate),
    expiryDate: toDateInput(announcement?.expiryDate),
  };

  const audienceOptions = [
    { value: 'all', label: t('announcements.audience.all') },
    { value: 'students', label: t('announcements.audience.students') },
    { value: 'teachers', label: t('announcements.audience.teachers') },
    { value: 'parents', label: t('announcements.audience.parents') },
    { value: 'class', label: t('announcements.audience.class') },
  ];

  const handleSubmit = async (formData) => {
    const payload = { ...formData };
    if (payload.targetAudience !== 'class') {
      payload.classId = undefined;
      payload.classIds = undefined;
    } else {
      const classIds = [...new Set((payload.classIds || []).filter(Boolean))];
      payload.classIds = classIds;
      payload.classId = classIds[0] || undefined;
    }
    payload.publishDate = toIsoOrUndefined(payload.publishDate);
    payload.expiryDate = toIsoOrUndefined(payload.expiryDate);
    pop(payload);
  };

  return (
    <div className='flex flex-col justify-center items-center w-full'>
      <div className='flex flex-col h-full w-full gap-4'>
        <NForm
          id='announcement-form'
          schema={announcementSchema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          devTools={{ enabled: isDevFill, fill: () => buildFill(announcementSchema, { targetAudience: 'all', classId: '', classIds: [] }) }}
        >
          <DevFormFiller fill={() => buildFill(announcementSchema, { targetAudience: 'all', classId: '', classIds: [] })} />
          <div className='flex flex-col gap-4'>

            <FormSectionHeader
              icon={Megaphone}
              title={t('announcements.form.announcementDetails')}
            />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormInput
                name='title'
                type='text'
                formLabel={t('announcements.form.title')}
                placeholder={t('announcements.form.titlePlaceholder')}
                icon={Megaphone}
                required={true}
              />

              <FormInput
                name='targetAudience'
                type='select'
                formLabel={t('announcements.form.targetAudience')}
                placeholder={t('announcements.form.targetAudiencePlaceholder')}
                icon={Users}
                items={audienceOptions}
                required={true}
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <ClassTargetFields />

              <FormInput
                name='publishDate'
                type='date'
                formLabel={t('announcements.form.publishDate')}
                placeholder={t('announcements.form.publishDatePlaceholder')}
                icon={Calendar}
              />

              <FormInput
                name='expiryDate'
                type='date'
                formLabel={t('announcements.form.expiryDate')}
                placeholder={t('announcements.form.expiryDatePlaceholder')}
                icon={Calendar}
              />

            </div>

            <div className='grid grid-cols-1 gap-2'>
              <FormInput
                name='content'
                type='textarea'
                formLabel={t('announcements.form.content')}
                placeholder={t('announcements.form.contentPlaceholder')}
                icon={FileText}
                required={true}
              />
            </div>

          </div>
        </NForm>
      </div>
    </div>
  );
};

export default AnnouncementForm;
