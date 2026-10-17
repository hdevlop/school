'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';

import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import React, { useMemo } from 'react'
import { GraduationCap, FileText, Layers } from 'lucide-react'
import { useDialog } from '@/shared/useDialog'
import { createClassSchema } from '../config/classSchemas'
import { useTranslation } from 'najm-i18n/react'

const ClassForm = ({ classData = null}) => {

   const { t } = useTranslation();
   const classSchema = useMemo(() => createClassSchema(t), [t]);
   const { pop } = useDialog();

   const defaultValues = {
      ...(classData?.id && { id: classData.id }),
      // A new class starts blank; these held development sample values
      // ("CE1", "Middle", "asdasd") that a quick Create submitted as real.
      name: classData?.name ?? '',
      level: classData?.level ?? '',
      description: classData?.description ?? '',
   }

   const handleSubmit = async (formData) => {
      pop(formData);
   }

   return (
      <div className='flex flex-col justify-center items-center w-full'>
         <div className='flex flex-col h-full w-full gap-4'>
            <NForm
               id='class-form'
               schema={classSchema}
               defaultValues={defaultValues}
               onSubmit={handleSubmit}
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
