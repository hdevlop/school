'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';

import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import React from 'react'
import { BookOpen, Hash, FileText } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { subjectSchema } from '@/lib/validations'
import { buildFill, isDevFill } from '@/lib/devFill'
import { useTranslation } from '@/hooks/useLanguage'

const SubjectForm = ({ subject = null }) => {

   const { t } = useTranslation();
   const { pop } = useDialog();

   const defaultValues = {
      ...(subject?.id && { id: subject.id }),
      code: subject?.code || '',
      name: subject?.name || '',
      description: subject?.description || '',
   }

   const handleSubmit = async (formData) => {
      pop(formData);
   }

   return (
      <div className='flex flex-col justify-center items-center w-full'>
         <div className='flex flex-col h-full w-full gap-4'>
            <NForm
               id='subject-form'
               schema={subjectSchema}
               defaultValues={defaultValues}
               onSubmit={handleSubmit}
               devTools={{ enabled: isDevFill, fill: () => buildFill(subjectSchema) }}
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
                  name='description'
                  type='textarea'
                  icon={FileText}
                  formLabel={t('subjects.form.description')}
                  placeholder={t('subjects.form.descriptionPlaceholder')}
                  className='col-span-1'
               />

               </div>

            </NForm>
         </div>
      </div>
   )
}

export default SubjectForm
