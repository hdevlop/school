'use client'

import { NButton, NForm, SelectInput } from 'najm-kit'
import { FormInput } from 'najm-kit';

import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import React, { useMemo, useState } from 'react'
import { compareClassNames, toOfficialClassName } from '@sms/contracts'
import { useLevelSubSubjectsSheet } from './LevelSubSubjects'
import { BookOpen, Hash, FileText, Languages, Pencil } from 'lucide-react'
import { useDialog } from '@/shared/useDialog'
import { useClasses } from '@/features/Classes/hooks/useClasses'
import { createSubjectSchema } from '../config/subjectSchemas'
import { useTranslation } from 'najm-i18n/react'

/** Each class (its name, kept from year to year) has its own sub-subjects: pick it, then edit its list over this form. */
function LevelListsPicker({ subject }: { subject: { id: string; name: string } }) {
   const { t } = useTranslation();
   const { classes } = useClasses();
   const levelSheet = useLevelSubSubjectsSheet();
   const levels = [...new Set<string>((classes ?? []).map((cls: { name: string }) => cls.name))].sort(compareClassNames);
   const [level, setLevel] = useState('');
   if (!levels.length) return null;
   return <div className='space-y-2 rounded-lg border p-3'>
      <p className='text-sm font-medium'>{t('subjects.levels.title')}</p>
      <p className='text-xs text-muted-foreground'>{t('subjects.levels.pickerHelp')}</p>
      <div className='flex items-center gap-2'>
         <SelectInput ariaLabel={t('assessments.form.class')} placeholder={t('subjects.levels.chooseClass')} showIcon={false} className='w-48'
            items={levels.map(name => ({ value: name, label: toOfficialClassName(name) }))} value={level} onChange={value => setLevel(String(value))} />
         <NButton type='button' variant='outline' size='sm' disabled={!level} leftIcon={<Pencil className='size-4' />} onClick={() => levelSheet.open(subject, level)}>{t('subjects.levels.edit')}</NButton>
      </div>
      {levelSheet.sheet}
   </div>;
}

const SubjectForm = ({ subject = null }) => {

   const { t } = useTranslation();
   const subjectSchema = useMemo(() => createSubjectSchema(t), [t]);
   const { pop } = useDialog();

   const defaultValues = {
      ...(subject?.id && { id: subject.id }),
      code: subject?.code || '',
      name: subject?.name || '',
      nameAr: subject?.nameAr || '',
      description: subject?.description || '',
   }

   const handleSubmit = async (formData) => {
      // An emptied Arabic name is cleared (null), not left as it was.
      pop({ ...formData, nameAr: formData.nameAr?.trim() || null });
   }

   return (
      <div className='flex flex-col justify-center items-center w-full'>
         <div className='flex flex-col h-full w-full gap-4'>
            <NForm
               id='subject-form'
               schema={subjectSchema}
               defaultValues={defaultValues}
               onSubmit={handleSubmit}
            >
               <div className='flex flex-col gap-4'>

                  {/* Subject Information Section */}
                  <FormSectionHeader
                     icon={BookOpen}
                     title={t('subjects.form.subjectInformation')}
                  />

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                     <FormInput
                        name='code'
                        type='text'
                        formLabel={t('subjects.form.code')}
                        placeholder={t('subjects.form.codePlaceholder')}
                        icon={Hash}
                        required={true}
                     />

                     <FormInput
                        name='name'
                        type='text'
                        formLabel={t('subjects.form.name')}
                        placeholder={t('subjects.form.namePlaceholder')}
                        icon={BookOpen}
                        required={true}
                     />
                  </div>

               <FormInput
                  name='nameAr'
                  type='text'
                  dir='rtl'
                  formLabel={t('subjects.form.nameAr')}
                  placeholder={t('subjects.form.nameArPlaceholder')}
                  formDescription={t('subjects.form.nameArHelp')}
                  icon={Languages}
               />

               <FormInput
                  name='description'
                  type='textarea'
                  icon={FileText}
                  formLabel={t('subjects.form.description')}
                  placeholder={t('subjects.form.descriptionPlaceholder')}
                  className='col-span-1'
               />

               {subject?.id && <LevelListsPicker subject={{ id: subject.id, name: subject.name }} />}

               </div>

            </NForm>
         </div>
      </div>
   )
}

export default SubjectForm
