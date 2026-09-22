'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import React from 'react'
import { Briefcase, IdCard, User, UserRound, Mail, Activity, UserPlus, CreditCard, Car, Calendar, CalendarCheck, Award, DollarSign, Phone, MapPin, FileText } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { useTranslation } from 'najm-i18n/react'
import { useWatch } from 'react-hook-form'
import { driverSchema } from '../config/driverSchemas'
import {
   DRIVER_LICENSE_TYPE_OPTIONS,
   buildDriverStatusOptions,
   buildGenderOptions,
} from '../config/driverOptions'
import { buildFill, isDevFill } from '@/lib/devFill'

const DriverForm = ({ driver = null, defaultGender = 'M' }) => {

   const { pop } = useDialog();

   const defaultValues = {
      ...(driver?.id && { id: driver.id }),
      name: driver?.name || '',
      cin: driver?.cin || '',
      email: driver?.email || '',
      phone: driver?.phone || '',
      address: driver?.address || '',
      gender: driver?.gender || defaultGender,
      licenseNumber: driver?.licenseNumber || '',
      licenseType: driver?.licenseType || 'B',
      licenseExpiry: driver?.licenseExpiry || '',
      hireDate: driver?.hireDate || '',
      salary: driver?.salary || '',
      yearsOfExperience: driver?.yearsOfExperience || '',
      emergencyContact: driver?.emergencyContact || '',
      emergencyPhone: driver?.emergencyPhone || '',
      status: driver?.status || 'active',
      notes: driver?.notes || '',
      image: driver?.user?.image || null,
   }

   const handleSubmit = async (driverData) => {
      pop(driverData);
   }

   return (
      <NForm id='driver-form' schema={driverSchema} defaultValues={defaultValues} onSubmit={handleSubmit} devTools={{ enabled: isDevFill, fill: () => buildFill(driverSchema) }} >
         <DriverFormContent />
      </NForm>
   )
}

const DriverFormContent = () => {

   const { t } = useTranslation();
   const gender = useWatch({ name: 'gender' })

   const defaultImage = gender === 'M'
      ? '/images/driver_male.png'
      : '/images/driver_female.png'

   const genderOptions = buildGenderOptions(t)

   const licenseTypeOptions = DRIVER_LICENSE_TYPE_OPTIONS

   const statusOptions = buildDriverStatusOptions(t)

   return (
      <>

         <FormSectionHeader
            icon={IdCard}
            title={t('drivers.form.personalInformation')}
         />

         <div className='grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4'>

            <div className='flex items-start justify-center'>
               <FormInput
                  name='image'
                  type='image'
                  formLabel={t('drivers.form.image')}
                  showPreview={true}
                  previewPosition='top'
                  imageSize='xl'
                  allowClear={true}
                  defaultImage={defaultImage}
               />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
               <FormInput
                  name='name'
                  type='text'
                  formLabel={t('drivers.form.fullName')}
                  placeholder={t('drivers.form.fullNamePlaceholder')}
                  icon={User}
                  required={true}
               />

               <FormInput
                  name='cin'
                  type='text'
                  formLabel={t('drivers.form.cin')}
                  placeholder={t('drivers.form.cinPlaceholder')}
                  icon={IdCard}
                  required={true}
               />

               <FormInput
                  name='gender'
                  type='select'
                  formLabel={t('drivers.form.gender')}
                  items={genderOptions}
                  icon={UserRound}
               />

               <FormInput
                  name='email'
                  type='text'
                  formLabel={t('drivers.form.email')}
                  placeholder={t('drivers.form.emailPlaceholder')}
                  icon={Mail}
                  required={true}
               />

               <FormInput
                  name='phone'
                  type='phone'
                  formLabel={t('drivers.form.phone')}
                  placeholder={t('drivers.form.phonePlaceholder')}
                  icon={Phone}
                  required={true}
               />

               <FormInput
                  name='status'
                  type='select'
                  formLabel={t('drivers.form.status')}
                  items={statusOptions}
                  icon={Activity}
                  required={true}
               />


               <FormInput
                  name='emergencyPhone'
                  type='phone'
                  formLabel={t('drivers.form.emergencyPhone')}
                  placeholder={t('drivers.form.emergencyPhonePlaceholder')}
                  icon={Phone}
               />

               <FormInput
                  name='emergencyContact'
                  type='text'
                  formLabel={t('drivers.form.emergencyContactName')}
                  placeholder={t('drivers.form.emergencyContactNamePlaceholder')}
                  icon={UserPlus}
               />

                <div className='md:col-span-2'>
                   <FormInput
                      name='address'
                      type='textarea'
                      formLabel={t('drivers.form.address')}
                      placeholder={t('drivers.form.addressPlaceholder')}
                      icon={MapPin}
                   />
                </div>
            </div>
         </div>

         <FormSectionHeader
            icon={Briefcase}
            title={t('drivers.form.professionalInformation')}
         />

         <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
            <FormInput
               name='licenseNumber'
               type='text'
               formLabel={t('drivers.form.licenseNumber')}
               placeholder={t('drivers.form.licenseNumberPlaceholder')}
               icon={CreditCard}
               required={true}
            />

            <FormInput
               name='licenseType'
               type='select'
               formLabel={t('drivers.form.licenseType')}
               items={licenseTypeOptions}
               icon={Car}
               required={true}
            />

            <FormInput
               name='licenseExpiry'
               type='date'
               formLabel={t('drivers.form.licenseExpiry')}
               icon={Calendar}
               required={true}
            />

            <FormInput
               name='hireDate'
               type='date'
               formLabel={t('drivers.form.hireDate')}
               icon={CalendarCheck}
               required={true}
            />

            <FormInput
               name='yearsOfExperience'
               type='number'
               formLabel={t('drivers.form.yearsOfExperience')}
               placeholder={t('drivers.form.yearsOfExperiencePlaceholder')}
               icon={Award}
            />

            <FormInput
               name='salary'
               type='number'
               formLabel={t('drivers.form.salary')}
               placeholder={t('drivers.form.salaryPlaceholder')}
               icon={DollarSign}
            />


            <div className='md:col-span-3'>
               <FormInput
                  name='notes'
                  type='textarea'
                  formLabel={t('drivers.form.notes')}
                  placeholder={t('drivers.form.notesPlaceholder')}
                  icon={FileText}
               />
            </div>
         </div>
      </>
   )
}

export default DriverForm
