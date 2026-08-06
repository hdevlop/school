'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';

import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import React from 'react'
import { Building, Hash, Users, DoorOpen } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { sectionSchema } from '@/lib/validations'
import { buildFill, isDevFill } from '@/lib/devFill'
import { DevFormFiller } from '@/components/DevFormFiller'
import { useTranslation } from '@/hooks/useLanguage'
import { useClasses } from '@/hooks/useClasses'

const SectionForm = ({ section = null }) => {

   const { t } = useTranslation();
   const { pop } = useDialog();
   const { classes, isClassesLoading } = useClasses();

   const defaultValues = {
      ...(section?.id && { id: section.id }),
      name: section?.name || '',
      classId: section?.classId || '',
      maxStudents: section?.maxStudents || 30,
      roomNumber: section?.roomNumber || '',
      status: section?.status || 'active',
   }

   const classOptions = classes?.map(cls => ({
      value: cls.id,
      label: `${cls.name} (${cls.academicYear})`,
   })) || [];


   const handleSubmit = async (sectionData) => {
      pop(sectionData);
   }

   return (
      <div className='flex flex-col justify-center items-center w-full'>
         <div className='flex flex-col h-full w-full gap-4'>
            <NForm
               id='section-form'
               schema={sectionSchema}
               defaultValues={defaultValues}
               onSubmit={handleSubmit}
               devTools={{ enabled: isDevFill, fill: () => buildFill(sectionSchema, { classId: classOptions }) }}
            >
               <DevFormFiller fill={() => buildFill(sectionSchema, { classId: classOptions })} />
               <div className='flex flex-col gap-4'>

                  <FormSectionHeader
                     icon={Building}
                     title={t('sections.form.sectionInformation')}
                  />

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                     <FormInput
                        name='name'
                        type='text'
                        formLabel={t('sections.form.sectionName')}
                        placeholder={t('sections.form.sectionNamePlaceholder')}
                        icon={Hash}
                        required={true}
                     />

                     <FormInput
                        name='classId'
                        type='select'
                        formLabel={t('sections.form.class')}
                        placeholder={t('sections.form.classPlaceholder')}
                        icon={Building}
                        items={classOptions}
                        required={true}
                        disabled={isClassesLoading}
                     />

                     <FormInput
                        name='roomNumber'
                        type='text'
                        formLabel={t('sections.form.roomNumber')}
                        placeholder={t('sections.form.roomNumberPlaceholder')}
                        icon={DoorOpen}
                     />

                     <FormInput
                        name='maxStudents'
                        type='number'
                        formLabel={t('sections.form.maxStudents')}
                        placeholder={t('sections.form.maxStudentsPlaceholder')}
                        icon={Users}
                     />

                  </div>

               </div>

            </NForm>
         </div>
      </div>
   )
}

export default SectionForm
