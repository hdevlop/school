'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';

import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import { User, Truck, Calendar, FileText } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { useTranslation } from 'najm-i18n/react'
import { z } from 'zod'

const assignDriverSchema = z.object({
   vehicleName: z.string(),
   driverId: z.string().min(1, 'Driver is required'),
   assignmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
   notes: z.string().optional(),
})

type AssignDriverData = z.infer<typeof assignDriverSchema>

const AssignDriverForm = ({ drivers, vehicle}) => {
   const { pop } = useDialog()

   const defaultValues = {
      vehicleName: `${vehicle?.name}  (${vehicle?.licensePlate})`,
      driverId: vehicle?.driverId || '',
      vehicleId: vehicle?.id || '',
      assignmentDate: new Date().toISOString().split('T')[0],
      notes: '',
   }

   const handleSubmit = async ({driverId, assignmentDate, notes}: AssignDriverData) => {
      pop({
         vehicleId: vehicle?.id,
         driverId,
         assignmentDate,
         notes
      })
   }

   return (
      <NForm
         id='assign-driver-form'
         schema={assignDriverSchema}
         defaultValues={defaultValues}
         onSubmit={handleSubmit}
      >
         <AssignDriverFormContent drivers={drivers}/>
      </NForm>
   )
}


const AssignDriverFormContent = ({ drivers }) => {
   const { t } = useTranslation()

   const driverOptions = drivers.map((driver) => ({
      value: driver.id,
      label: `${driver.name} - ${driver.licenseNumber || driver.cin}`,
   }))

   return (
      <>
         <FormSectionHeader icon={User} title={t('drivers.form.assignDriver') || 'Assign Driver'} />

         <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormInput
               name='vehicleName'
               type='text'
               formLabel={t('drivers.form.vehicle') || 'Vehicle'}
               readOnly={true}
               icon={Truck}
            />

            <FormInput
               name='driverId'
               type='combobox'
               formLabel={t('drivers.form.driver') || 'Select Driver'}
               placeholder={t('drivers.form.selectDriver') || 'Search driver...'}
               searchPlaceholder={t('drivers.form.searchDriver') || 'Search driver...'}
               emptyMessage={t('drivers.form.noDriverFound') || 'No driver found.'}
               items={driverOptions}
               required={true}
               icon={User}
            />
         </div>

         <FormInput
            name='assignmentDate'
            type='date'
            formLabel={t('drivers.form.assignmentDate') || 'Assignment Date'}
            required={true}
            icon={Calendar}
         />

         <FormInput
            name='notes'
            type='textarea'
            formLabel={t('vehicleAssignments.form.notes') || 'Notes'}
            placeholder={t('drivers.form.notesPlaceholder') || 'Add any additional notes...'}
            icon={FileText}
         />
      </>
   )
}

export default AssignDriverForm
