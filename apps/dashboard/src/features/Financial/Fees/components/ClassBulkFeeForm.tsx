'use client'

import { useEffect, useMemo } from 'react'
import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';
import { GraduationCap, LayoutGrid, Tag, CalendarClock, CalendarDays, DollarSign, Percent, FileText } from 'lucide-react'
import { useActiveForm } from '@/hooks/useActiveForm'
import { Label } from 'najm-kit';import { Badge } from 'najm-kit';import { useTranslation } from 'najm-i18n/react'
import { classBulkFeeFormSchema } from '@/lib/validations'
import { useDialog } from 'najm-kit'
import { useEnum } from '@/hooks/useEnum'
import { calculateFeeAmounts, buildInstallmentsPreview } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { getClassStudentsApi } from '@/services/classApi'
import { formatMAD } from '@/lib/format'
import InstallmentPreviewTable from './InstallmentPreviewTable'

const StudentCount = ({ classId, sectionId }) => {
   const { t } = useTranslation()

   const { data: students } = useQuery({
      queryKey: ['class-students', classId],
      queryFn: () => getClassStudentsApi(classId),
      enabled: !!classId,
   })

    const filtered = useMemo(() => {
       const studentsList = students?.data ?? []
       if (sectionId) return studentsList.filter(s => s.sectionId === sectionId)
       return studentsList
    }, [students, sectionId])

   if (!classId) return null

   return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
         <Label className="text-sm font-medium">
            {t('fees.form.studentsInClass') || 'Students in class'}
         </Label>
         <Badge variant="secondary" className="font-semibold">
            {filtered.length} {t('fees.form.students') || 'students'}
         </Badge>
      </div>
   )
}

const ClassBulkFeeForm = ({ classes = [], feeTypes = [] }) => {
   const { pop } = useDialog()

   const handleSubmit = async (data) => {
      pop(data)
   }

   const defaultValues = {
      classId: '',
      sectionId: '',
      feeTypeId: '',
      schedule: 'monthly',
      academicYear: undefined,
      baseAmount: undefined,
      discountAmount: 0,
      discountReason: '',
      notes: '',
   }

   return (
      <NForm
         id='class-bulk-fee-form'
         schema={classBulkFeeFormSchema}
         defaultValues={defaultValues}
         onSubmit={handleSubmit}
      >
         <ClassBulkFeeFormContent classes={classes} feeTypes={feeTypes} />
      </NForm>
   )
}

export const ClassBulkFeeFormContent = ({ classes = [], feeTypes = [] }) => {
   const { watch, setValue } = useActiveForm()
   const { t } = useTranslation()

   const classId = watch('classId')
   const sectionId = watch('sectionId')
   const feeTypeId = watch('feeTypeId')
   const baseAmount = watch('baseAmount') || 0
   const discountAmount = watch('discountAmount') || 0
   const schedule = watch('schedule')
   const academicYear = watch('academicYear')

   const selectedClass = classes.find(cls => cls.id === classId)
   const sectionOptions = useMemo(() => selectedClass?.sections?.map(s => ({
      value: s.id,
      label: s.name,
   })) || [], [selectedClass])

   const selectedFeeType = feeTypes.find(ft => ft.id === feeTypeId)
   const paymentType = selectedFeeType?.paymentType || 'recurring'
   const isScheduleDisabled = paymentType === 'oneTime'

   useEffect(() => {
      if (feeTypeId && selectedFeeType && !baseAmount) {
         setValue('baseAmount', selectedFeeType.amount)
      }
   }, [feeTypeId, selectedFeeType, baseAmount, setValue])

   useEffect(() => {
      if (paymentType === 'oneTime' && schedule !== 'oneTime') {
         setValue('schedule', 'oneTime')
      }
   }, [paymentType, schedule, setValue])

   useEffect(() => {
      if (sectionId && sectionOptions.length > 0 && !sectionOptions.find(s => s.value === sectionId)) {
         setValue('sectionId', '')
      }
   }, [classId, sectionId, sectionOptions, setValue])

   const netAmount = selectedFeeType
      ? calculateFeeAmounts(paymentType, baseAmount, schedule, discountAmount, { academicYear }).netAmount
      : 0

   const previewInstallments = useMemo(() => {
      if (!selectedFeeType || netAmount <= 0) return []
      return buildInstallmentsPreview(netAmount, schedule || 'monthly', { academicYear })
   }, [academicYear, netAmount, schedule, selectedFeeType])

   const scheduleOptions = useEnum('schedule')

   return (
      <div className='flex flex-col gap-4'>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormInput
               name='classId'
               type='select'
               icon={GraduationCap}
               formLabel={t('fees.form.class') || 'Class'}
               placeholder={t('fees.form.classPlaceholder') || 'Select class'}
               items={useMemo(() => classes.map(cls => ({ value: cls.id, label: cls.name })), [classes])}
               required
            />
            <FormInput
               name='sectionId'
               type='select'
               icon={LayoutGrid}
               formLabel={t('fees.form.section') || 'Section (optional)'}
               placeholder={t('fees.form.sectionPlaceholder') || 'All sections'}
               items={sectionOptions}
            />
         </div>

         <StudentCount classId={classId} sectionId={sectionId} />
         <p className="text-sm text-muted-foreground">
            Billing starts from each student&apos;s enrollment date. The preview uses the academic-year start; the backend calculates each student independently.
         </p>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormInput
               name='feeTypeId'
               type='select'
               icon={Tag}
               formLabel={t('fees.form.feeType') || 'Fee Type'}
               placeholder={t('fees.form.feeTypePlaceholder') || 'Select fee type'}
               items={feeTypes.map(ft => ({ value: ft.id, label: ft.name }))}
               required
            />
            <FormInput
               name='schedule'
               type='select'
               icon={CalendarClock}
               formLabel={t('fees.form.schedule')}
               placeholder={t('fees.form.schedulePlaceholder')}
               items={scheduleOptions}
               required
               disabled={isScheduleDisabled}
            />
            <FormInput
               name='academicYear'
               type='text'
               icon={CalendarDays}
               formLabel={t('fees.form.academicYear') || 'Academic year'}
               placeholder='2026-2027'
            />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormInput
               name='baseAmount'
               type='number'
               icon={DollarSign}
               formLabel={t('fees.form.amount') || 'Amount'}
               placeholder="0.00"
               required
            />
            <FormInput
               name='discountAmount'
               type='number'
               icon={Percent}
               formLabel={t('fees.form.discountAmount')}
               placeholder={t('fees.form.discountAmountPlaceholder')}
            />
            <div className="flex flex-col gap-1">
               <Label className="text-sm font-medium text-muted-foreground">
                  {t('fees.form.netAmount') || 'Net Amount'}
               </Label>
               <div className="h-10 flex items-center rounded-md border border-green-700 bg-green-100 px-3 text-sm font-semibold">
                  {formatMAD(netAmount)}
               </div>
            </div>
         </div>

         <FormInput
            name='notes'
            type='textarea'
            icon={FileText}
            formLabel={t('fees.form.notes') || 'Notes'}
            placeholder={t('fees.form.notesPlaceholder') || 'Optional notes'}
         />

         <InstallmentPreviewTable installments={previewInstallments} />
      </div>
   )
}

export default ClassBulkFeeForm
