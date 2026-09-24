'use client'

import { NForm, NSkeleton } from 'najm-kit'
import { FormInput } from 'najm-kit';

import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import React from 'react'
import { GraduationCap, FileText, Layers } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { classSchema } from '../config/classSchemas'
import { buildFill, isDevFill } from '@/lib/devFill'
import { useTranslation } from 'najm-i18n/react'
import { useActiveAcademicYear } from '@/features/Settings/hooks/useSettings'

const ClassForm = ({ classData = null}) => {

   const { t } = useTranslation();
   const { pop } = useDialog();
   const { academicYear, isAcademicYearLoading } = useActiveAcademicYear();

   const defaultValues = {
      ...(classData?.id && { id: classData.id }),
      name: classData?.name || 'CE1',
      academicYear: classData?.academicYear || academicYear,
      level: classData?.level || 'Middle',
      description: classData?.description || 'asdasd',
   }

   const handleSubmit = async (formData) => {
      pop(formData);
   }

   if (isAcademicYearLoading && !classData) return <NSkeleton className="h-64 w-full" />;

   return (
      <div className='flex flex-col justify-center items-center w-full'>
         <div className='flex flex-col h-full w-full gap-4'>
            <NForm
               id='class-form'
               schema={classSchema}
               defaultValues={defaultValues}
               onSubmit={handleSubmit}
               devTools={{ enabled: isDevFill, fill: () => buildFill(classSchema) }}
            >
               <div className='flex flex-col gap-4'>

                  {/* Class Information Section */}
                  <FormSectionHeader
                     icon={GraduationCap}
                     title={t('classes.form.classInformation')}
                  />

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                     <FormInput
                        name='name'
                        type='text'
                        formLabel={t('classes.form.className')}
                        placeholder={t('classes.form.classNamePlaceholder')}
                        icon={GraduationCap}
                        required={true}
                     />

                     <FormInput
                        name='level'
                        type='text'
                        formLabel={t('classes.form.level')}
                        placeholder={t('classes.form.levelPlaceholder')}
                        icon={Layers}
                     />
                  </div>

                  {/* Description Section */}
                  <FormSectionHeader
                     icon={FileText}
                     title={t('classes.form.description')}
                  />

                  <div className='grid grid-cols-1 gap-4'>
                     <FormInput
                        name='description'
                        type='textarea'
                        formLabel={t('classes.form.descriptionLabel')}
                        placeholder={t('classes.form.descriptionPlaceholder')}
                        icon={FileText}
                     />
                  </div>

               </div>

            </NForm>
         </div>
      </div>
   )
}

export default ClassForm
