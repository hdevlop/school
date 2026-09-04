'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';

import { NFormSectionHeader as FormHeader } from 'najm-kit';
import React from 'react'
import { Car, Hash, Calendar, DollarSign, Gauge, Tag, Truck, Users, Activity, User, FileText } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { vehicleSchema } from '@/lib/validations'
import { buildFill, isDevFill } from '@/lib/devFill'
import { useTranslation } from 'najm-i18n/react'

const VehicleForm = ({ vehicle = null, drivers = [] }) => {

   const { pop } = useDialog();

   const defaultValues = {
      ...(vehicle?.id && { id: vehicle.id }),
      name: vehicle?.name || '',
      brand: vehicle?.brand || '',
      model: vehicle?.model || '',
      year: vehicle?.year || new Date().getFullYear(),
      type: vehicle?.type || 'fullbus',
      capacity: vehicle?.capacity || 30,
      licensePlate: vehicle?.licensePlate || '',
      driverId: vehicle?.driverId || '',
      purchaseDate: vehicle?.purchaseDate || '',
      purchasePrice: vehicle?.purchasePrice || 0,
      initialMileage: vehicle?.initialMileage || 0,
      status: vehicle?.status || 'active',
      notes: vehicle?.notes || '',
   }

   const handleSubmit = async (formData) => {
      pop(formData);
   }

   return (
      <NForm id='vehicle-form' schema={vehicleSchema} defaultValues={defaultValues} onSubmit={handleSubmit} devTools={{ enabled: isDevFill, fill: () => buildFill(vehicleSchema, { driverId: drivers?.map((d: any) => ({ value: d.id })) }) }}>
         <VehicleFormContent drivers={drivers} />
      </NForm>
   )
}

const VehicleFormContent = ({ drivers }) => {

   const { t } = useTranslation();

   const vehicleTypeOptions = [
      { value: 'fullbus', label: t('vehicles.types.fullbus') },
      { value: 'minibus', label: t('vehicles.types.minibus') },
      { value: 'van', label: t('vehicles.types.van') },
      { value: 'truck', label: t('vehicles.types.truck') },
      { value: 'suv', label: t('vehicles.types.suv') },
   ]

   const statusOptions = [
      { value: 'active', label: t('vehicles.status.active') },
      { value: 'maintenance', label: t('vehicles.status.maintenance') },
      { value: 'retired', label: t('vehicles.status.retired') },
   ]

   const driverOptions = drivers.map((driver) => ({
      value: driver.id,
      label: `${driver.name} - ${driver.licenseNumber || driver.cin}`
   }))

   return (
      <>

         {/* Vehicle Information Section */}
         <FormHeader
            icon={Car}
            title={t('vehicles.form.vehicleInformation')}
         />

         <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormInput
               name='name'
               type='text'
               formLabel={t('vehicles.form.name')}
               placeholder={t('vehicles.form.namePlaceholder')}
               icon={Car}
               required={true}
            />

            <FormInput
               name='brand'
               type='text'
               formLabel={t('vehicles.form.brand')}
               placeholder={t('vehicles.form.brandPlaceholder')}
               icon={Tag}
               required={true}
            />

            <FormInput
               name='model'
               type='text'
               formLabel={t('vehicles.form.model')}
               placeholder={t('vehicles.form.modelPlaceholder')}
               icon={Car}
               required={true}
            />

            <FormInput
               name='year'
               type='number'
               formLabel={t('vehicles.form.year')}
               placeholder={t('vehicles.form.yearPlaceholder')}
               icon={Calendar}
               required={true}
            />

            <FormInput
               name='type'
               type='select'
               formLabel={t('vehicles.form.type')}
               items={vehicleTypeOptions}
               icon={Truck}
               required={true}
            />

            <FormInput
               name='capacity'
               type='number'
               formLabel={t('vehicles.form.capacity')}
               placeholder={t('vehicles.form.capacityPlaceholder')}
               icon={Users}
               required={true}
            />

            <FormInput
               name='licensePlate'
               type='text'
               formLabel={t('vehicles.form.licensePlate')}
               placeholder={t('vehicles.form.licensePlatePlaceholder')}
               icon={Hash}
               required={true}
            />

            <FormInput
               name='status'
               type='select'
               formLabel={t('vehicles.form.status')}
               items={statusOptions}
               icon={Activity}
            />
         </div>

         {/* Additional Details Section */}
         <FormHeader
            icon={DollarSign}
            title={t('vehicles.form.additionalDetails')}
         />

         <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormInput
               name='purchaseDate'
               type='date'
               formLabel={t('vehicles.form.purchaseDate')}
               icon={Calendar}
            />

            <FormInput
               name='purchasePrice'
               type='number'
               formLabel={t('vehicles.form.purchasePrice')}
               placeholder={t('vehicles.form.purchasePricePlaceholder')}
               icon={DollarSign}
            />

            <FormInput
               name='initialMileage'
               type='number'
               formLabel={t('vehicles.form.initialMileage')}
               placeholder={t('vehicles.form.initialMileagePlaceholder')}
               icon={Gauge}
            />

            <FormInput
               name='driverId'
               type='combobox'
               icon={User}
               formLabel={t('vehicles.form.driver')}
               placeholder={t('vehicles.form.driverPlaceholder')}
               searchPlaceholder={t('vehicles.form.searchDriver') || 'Search driver...'}
               emptyMessage={t('vehicles.form.noDriverFound') || 'No driver found.'}
               items={driverOptions}
            />
         </div>

         <FormInput
            name='notes'
            type='textarea'
            formLabel={t('vehicles.form.notes')}
            placeholder={t('vehicles.form.notesPlaceholder')}
            icon={FileText}
         />

      </>
   )
}

export default VehicleForm
