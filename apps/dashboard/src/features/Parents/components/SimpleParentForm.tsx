'use client'

import { NForm, useNForm } from 'najm-kit'
import { FormInput } from 'najm-kit';
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import { IdCard, Mail, User, Users, UserRound, Globe, Calendar, Briefcase, Heart, Phone, MapPin, PhoneCall, Wallet } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { useTranslation } from 'najm-i18n/react'
import { parentSchema } from '@/lib/validations'
import { buildFill, isDevFill } from '@/lib/devFill'
import { useActiveForm } from '@/hooks/useActiveForm'
import { usePrefix } from 'najm-kit';
import { useEnum } from '@/hooks/useEnum'

// ==================== DEFAULT VALUES ====================

export const getParentDefaultValues = (parent = null, overrides = {}) => ({
   ...(parent?.id && { id: parent.id }),
   name: parent?.name || '',
   email: parent?.email || '',
   phone: parent?.phone || '',
   gender: parent?.gender ?? 'M',
   nationality: parent?.nationality || '',
   maritalStatus: parent?.maritalStatus ?? 'married',
   address: parent?.address || '',
   dateOfBirth: parent?.dateOfBirth || '',
   cin: parent?.cin || '',
   occupation: parent?.occupation || '',
   relationshipType: parent?.relationshipType ?? 'father',
   image: parent?.image || '',
   isEmergencyContact: parent?.isEmergencyContact ?? false,
   financialResponsibility: parent?.financialResponsibility ?? false,
   ...overrides,
})

export const getFatherDefaultValues = (parent = null) =>
   getParentDefaultValues(parent, { gender: 'M', relationshipType: 'father' })

export const getMotherDefaultValues = (parent = null) =>
   getParentDefaultValues(parent, { gender: 'F', relationshipType: 'mother' })

// ==================== FORM CONTENT ====================

export const ParentFormContent = ({ form = null }: { form?: any } = {}) => {
   const { t } = useTranslation()
   const { watch } = useActiveForm(form);


   const prefix = usePrefix();
   const gender = watch(prefix ? `${prefix}.gender` : "gender");

   const defaultImage = gender === 'M'
      ? '/images/parent_male.png'
      : '/images/parent_female.png'

   const genderOptions = useEnum('gender')
   const relationshipOptions = useEnum('relationshipType')
   const maritalStatusOptions = useEnum('maritalStatus')

   return (
      <>
         <FormSectionHeader
            icon={IdCard}
            title={t('parents.form.personalInformation')}
         />

         <div className='grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4'>
            <div className='flex items-start justify-center'>
               <FormInput
                  name='image'
                  type='image'
                  formLabel={t('parents.form.parentImage')}
                  showPreview={true}
                  previewPosition='top'
                  imageSize='lg'
                  allowClear={true}
                  defaultImage={defaultImage}
               />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
               <FormInput
                  name='name'
                  type='text'
                  formLabel={t('parents.form.fullName')}
                  placeholder={t('parents.form.fullNamePlaceholder')}
                  icon={User}
                  required={true}
               />

               <FormInput
                  name='relationshipType'
                  type='select'
                  formLabel={t('parents.form.relationshipType')}
                  items={relationshipOptions}
                  icon={Users}
                  required={true}
               />

               <FormInput
                  name='gender'
                  type='select'
                  formLabel={t('parents.form.gender')}
                  items={genderOptions}
                  icon={UserRound}
               />

               <FormInput
                  name='nationality'
                  type='text'
                  formLabel={t('parents.form.nationality')}
                  placeholder={t('parents.form.nationalityPlaceholder')}
                  icon={Globe}
               />

               <FormInput
                  name='cin'
                  type='text'
                  formLabel={t('parents.form.cin')}
                  placeholder={t('parents.form.cinPlaceholder')}
                  icon={IdCard}
                  required={true}
               />

               <FormInput
                  name='dateOfBirth'
                  type='date'
                  formLabel={t('parents.form.dateOfBirth')}
                  placeholder={t('parents.form.dateOfBirthPlaceholder')}
                  icon={Calendar}
               />

               <FormInput
                  name='occupation'
                  type='text'
                  formLabel={t('parents.form.occupation')}
                  placeholder={t('parents.form.occupationPlaceholder')}
                  icon={Briefcase}
               />

               <FormInput
                  name='maritalStatus'
                  type='select'
                  formLabel={t('parents.form.maritalStatus')}
                  items={maritalStatusOptions}
                  icon={Heart}
                  required={true}
               />
            </div>
         </div>

         <FormSectionHeader
            icon={Mail}
            title={t('parents.form.contactInformation')}
         />

         <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormInput
               name='email'
               type='text'
               formLabel={t('parents.form.email')}
               placeholder={t('parents.form.emailPlaceholder')}
               icon={Mail}
            />

            <FormInput
               name='phone'
               type='phone'
               formLabel={t('parents.form.phone')}
               placeholder={t('parents.form.phonePlaceholder')}
               icon={Phone}
               required={true}
            />
         </div>

         <FormInput
            name='address'
            type='textarea'
            formLabel={t('parents.form.address')}
            placeholder={t('parents.form.addressPlaceholder')}
            icon={MapPin}

         />

         <div className='flex '>
            <FormInput
               name='isEmergencyContact'
               type='checkbox'
               formLabel={t('parents.form.isEmergencyContact')}
               variant='ghost'
               icon={PhoneCall}
            />

            <FormInput
               name='financialResponsibility'
               type='checkbox'
               formLabel={t('parents.form.financialResponsibility')}
               variant='ghost'
               icon={Wallet}
            />
         </div>

      </>
   )
}

// ==================== MAIN FORM ====================

const SimpleParentForm = ({ parent = null }) => {
   const { pop } = useDialog()
   const defaultValues = getParentDefaultValues(parent)
   const form = useNForm({
      schema: parentSchema,
      defaultValues,
   })

   const handleSubmit = async (parentData) => {
      pop(parentData)
   }

   return (
      <NForm
         id='parent-form'
         schema={parentSchema}
         defaultValues={defaultValues}
         form={form}
         onSubmit={handleSubmit}
         devTools={{ enabled: isDevFill, fill: () => buildFill(parentSchema) }}
      >
         <ParentFormContent form={form} />
      </NForm>
   )
}

export default SimpleParentForm
