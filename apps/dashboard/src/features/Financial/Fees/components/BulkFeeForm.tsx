'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';

import { useEffect, useMemo } from 'react'
import { IdCard, User, DollarSign, CalendarClock, CalendarDays, Percent, Wallet } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Label } from 'najm-kit';import { Badge } from 'najm-kit';import { useTranslation } from 'najm-i18n/react'
import { bulkFeeFormSchema } from '../config/feeSchemas'
import { buildScheduleOptions } from '../config/feeOptions'
import { useDialog } from 'najm-kit'
import { getFeeTypeDisplayName, injectStudentIdToFees } from '../utils/feeUtils'
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import { calculateFeeAmounts, calculateTotalFees, buildInstallmentsPreview } from '@/features/Financial/Fees/utils/feeUtils'
import { useAddFees } from '../hooks/useAddFees'
import { DynamicArray } from 'najm-kit';

import { usePrefix } from 'najm-kit';

import InstallmentPreviewTable from './InstallmentPreviewTable'

// ==================== COMPONENTS ====================

const TotalFeesBadge = () => {
   const { t } = useTranslation()
   const feesData = useWatch({ name: 'fees' }) || []
   const totalFees = calculateTotalFees(feesData)

   if (feesData.length === 0) return null

   return (
      <div className="flex items-center justify-between  rounded-lg bg-muted/50">
         <Label className="text-sm font-medium">
            {t('fees.form.selectedFees') || 'Selected Fees'}
         </Label>
         <Badge variant="secondary" className="font-semibold text-md">
            {t('fees.form.total') || 'Total'}: ${totalFees}
         </Badge>
      </div>
   )
}

const FeeItem = ({
   feeTypes,
   showInstallmentPreview = true,
   showEffectiveDateField = true,
   studentEnrollmentDate = null,
}) => {
    const { setValue } = useFormContext();
    const { t } = useTranslation();
    const prefix = usePrefix();

    const feeTypeId = useWatch({ name: `${prefix}.feeTypeId` })
    const baseAmount = useWatch({ name: `${prefix}.baseAmount` }) || 0
    const discountAmount = useWatch({ name: `${prefix}.discountAmount` }) || 0
    const schedule = useWatch({ name: `${prefix}.schedule` })
    const effectiveDate = useWatch({ name: `${prefix}.effectiveDate` }) || studentEnrollmentDate
    const academicYear = useWatch({ name: `${prefix}.academicYear` })
    const calculationContext = useMemo(
       () => ({ effectiveDate, academicYear }),
       [academicYear, effectiveDate],
    )

    const selectedFeeType = feeTypes.find(ft => ft.id === feeTypeId)
    const feeTypeAmount = selectedFeeType?.amount || 0
    const paymentType = selectedFeeType?.paymentType || 'recurring'

    const isScheduleDisabled = paymentType === 'oneTime'

    useEffect(() => {
       if (feeTypeId && selectedFeeType && !baseAmount) {
          setValue(`${prefix}.baseAmount`, feeTypeAmount)
       }
     }, [feeTypeId, selectedFeeType, feeTypeAmount, prefix, setValue, baseAmount])

    useEffect(() => {
       if (feeTypeId && selectedFeeType) {
          if (paymentType === 'oneTime' && schedule !== 'oneTime') {
             setValue(`${prefix}.schedule`, 'oneTime')
             return
          }

          const { netAmount } = calculateFeeAmounts(
             paymentType,
             baseAmount,
             schedule,
             discountAmount,
             calculationContext,
          )

          setValue(`${prefix}.netAmount`, netAmount)
       }
     }, [baseAmount, calculationContext, discountAmount, feeTypeId, paymentType, prefix, schedule, selectedFeeType, setValue])

    const netAmount = selectedFeeType
       ? calculateFeeAmounts(paymentType, baseAmount, schedule, discountAmount, calculationContext).netAmount
       : 0

    const previewInstallments = useMemo(() => {
       if (!selectedFeeType || netAmount <= 0) return []
       return buildInstallmentsPreview(netAmount, schedule || 'monthly', calculationContext)
    }, [calculationContext, netAmount, schedule, selectedFeeType])

    const scheduleOptions = buildScheduleOptions(t)

    return (
       <div className='flex flex-col gap-3'>
          <div className='grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(110px,0.85fr)_minmax(160px,1.2fr)_minmax(110px,0.85fr)_minmax(110px,0.85fr)]'>
             {showEffectiveDateField && (
                <div className='md:col-span-4'>
                   <FormInput
                      name="effectiveDate"
                      type="date"
                      icon={CalendarDays}
                      formLabel={t('fees.form.effectiveDate')}
                      formDescription={t('fees.form.effectiveDateDescription')}
                      placeholder={studentEnrollmentDate || 'YYYY-MM-DD'}
                   />
                </div>
             )}
             <FormInput
                name="baseAmount"
                type='number'
                icon={DollarSign}
                formLabel={t('fees.form.amount') || 'Amount'}
                placeholder="0.00"
                required
             />

             <FormInput
                name="schedule"
                type='select'
                icon={CalendarClock}
                formLabel={t('fees.form.schedule')}
                placeholder={t('fees.form.schedulePlaceholder')}
                items={scheduleOptions}
                required
                disabled={isScheduleDisabled}
             />

             <FormInput
                name="discountAmount"
                type='number'
                icon={Percent}
                formLabel={t('fees.form.discountAmount')}
                placeholder={t('fees.form.discountAmountPlaceholder')}
             />

             <FormInput
                name="netAmount"
                type="number"
                icon={Wallet}
                formLabel={t('fees.form.netAmount')}
                readOnly={true}
                className="border-green-700 bg-green-100"
             />
          </div>

          {showInstallmentPreview && (
             <InstallmentPreviewTable installments={previewInstallments} />
          )}
       </div>
    )
 }

export const BulkFeeFormContent = ({
   feeTypes,
   showInstallmentPreview = true,
   students = [],
   enrollmentDate = null,
   showEffectiveDateField = true,
}: {
   feeTypes: any[]
   showInstallmentPreview?: boolean
   students?: any[]
   enrollmentDate?: string | null
   showEffectiveDateField?: boolean
}) => {
   const { t, language } = useTranslation()

   const feesData = useWatch({ name: 'fees' }) || []
   const selectedStudentId = useWatch({ name: 'studentId' })
   const formEnrollmentDate = useWatch({ name: 'enrollmentDate' })
   const selectedStudent = students.find((student) => student.id === selectedStudentId)
   const resolvedEnrollmentDate = enrollmentDate || selectedStudent?.enrollmentDate || formEnrollmentDate || null

   const { handleAddFees } = useAddFees({ feeTypes, feesData })

   const getFeeTypeName = (field) => {
      const feeType = feeTypes.find(ft => ft.id === field.feeTypeId)
      return getFeeTypeDisplayName(feeType, t, language) || t('fees.form.unknownFeeType')
   }

   return (
      <DynamicArray
         name="fees"
         title={getFeeTypeName}
         onAdd={handleAddFees}
         addLabel={t('common.addItem')}
         emptyLabel={t('common.noItemsAdded')}
         className="[&>button]:order-first [&>button]:border-muted-foreground/40 [&>button]:hover:border-primary/60"
      >
         <FeeItem
            feeTypes={feeTypes}
            showInstallmentPreview={showInstallmentPreview}
            showEffectiveDateField={showEffectiveDateField}
            studentEnrollmentDate={resolvedEnrollmentDate}
         />
      </DynamicArray>
   )
}

// ==================== MAIN FORM ====================
const BulkFeeForm = ({ students = [], feeTypes = [] }) => {
   const { t } = useTranslation()
   const { pop } = useDialog()

   const handleSubmit = async (feeData) => {
      const processedData = {
         fees: injectStudentIdToFees(feeData.fees, feeData.studentId)
      }
      pop(processedData)
   }

   const studentOptions = students.map((student) => ({
      value: student.id,
      label: `${student.name} - ${student.studentCode}`
   }))

   const defaultValues = {
      studentId: null,
      fees: []
   }

   return (
      <NForm
         id='bulk-fee-form'
         schema={bulkFeeFormSchema}
         defaultValues={defaultValues}
         onSubmit={handleSubmit}
      >
         <FormInput
            name='studentId'
            type='combobox'
            icon={User}
            formLabel={t('fees.form.student')}
            placeholder={t('fees.form.studentPlaceholder')}
            searchPlaceholder={t('fees.form.searchStudent') || 'Search student...'}
            emptyMessage={t('fees.form.noStudentFound') || 'No student found.'}
            items={studentOptions}
            required={true}
         />

         <FormSectionHeader icon={IdCard} title={t('students.form.feesInformation')} />
         <TotalFeesBadge />
         <BulkFeeFormContent feeTypes={feeTypes} students={students} />
      </NForm>
   )
}

export default BulkFeeForm


