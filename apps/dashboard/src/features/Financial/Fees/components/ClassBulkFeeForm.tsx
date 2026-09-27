'use client'

import { useEffect, useMemo } from 'react'
import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';
import { GraduationCap, LayoutGrid, Tag, CalendarClock, DollarSign, Percent, FileText } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Label } from 'najm-kit';import { Badge } from 'najm-kit';import { useTranslation } from 'najm-i18n/react'
import { classBulkFeeFormSchema } from '../config/feeSchemas'
import { buildScheduleOptions } from '../config/feeOptions'
import { useDialog } from 'najm-kit'
import { calculateFeeAmounts, buildInstallmentsPreview } from '@/features/Financial/Fees/utils/feeUtils'
import { useQuery } from '@tanstack/react-query'
import { getStudentsOnDateApi } from '@/services/studentApi'
import { useSchoolFormat } from '@/hooks/useSchoolFormat'
import InstallmentPreviewTable from './InstallmentPreviewTable'
import { useViewingAcademicYear, useViewingYearCalendar } from '@/features/AcademicYears/hooks/useViewingAcademicYear'
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope'
import { localDateInput } from 'najm-kit/format'
import type { AcademicYearOption } from '@sms/contracts/academic-years'

function billingDate(date: string, year: AcademicYearOption | undefined) {
   if (!year) return date
   if (date < year.instructionStartsOn) return year.instructionStartsOn
   if (date > year.instructionEndsOn) return year.instructionEndsOn
   return date
}

const StudentCount = ({ classId, sectionId, academicYear, effectiveDate }) => {
   const { t } = useTranslation()

   // The students placed in the class on the roster date of the fee year.
   const { data: students, isError, isLoading } = useQuery({
      queryKey: ['students', 'academicYear', academicYear, 'onDate', effectiveDate],
      queryFn: () => withAcademicYear(academicYear, () => getStudentsOnDateApi(effectiveDate)),
      enabled: !!classId && !!academicYear && !!effectiveDate,
   })

    const filtered = useMemo(() => {
       const studentsList = students?.data ?? []
       return studentsList.filter((student) =>
          student.classId === classId &&
          (!sectionId || student.sectionId === sectionId))
    }, [students, classId, sectionId])

   if (!classId) return null

   return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
         <Label className="text-sm font-medium">
            {t('fees.classBulk.studentsOnDate')}
         </Label>
         <Badge variant="secondary" className="font-semibold">
            {isError
               ? t('fees.classBulk.rosterUnavailable')
               : isLoading ? t('common.loading') : `${filtered.length} ${t('fees.form.students')}`}
         </Badge>
      </div>
   )
}

const ClassBulkFeeForm = ({ classes = [], feeTypes = [] }) => {
   const { pop } = useDialog()
   const { viewingYear } = useViewingAcademicYear()
   const yearCalendar = useViewingYearCalendar()

   const handleSubmit = async (data) => {
      pop(data)
   }

   const defaultValues = {
      classId: '',
      sectionId: '',
      feeTypeId: '',
      schedule: 'monthly' as const,
      academicYear: viewingYear,
      effectiveDate: viewingYear ? billingDate(localDateInput(), yearCalendar) : undefined,
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
   const { viewingYear } = useViewingAcademicYear()
   const yearCalendar = useViewingYearCalendar()
   const academicYear = viewingYear
   const activeClasses = useMemo(() => classes.filter((cls) => cls.academicYear === academicYear), [classes, academicYear])
   const { majorMoney } = useSchoolFormat()
   const { getValues, setValue } = useFormContext()
   const { t } = useTranslation()

   const classId = useWatch({ name: 'classId' })
   const sectionId = useWatch({ name: 'sectionId' })
   const feeTypeId = useWatch({ name: 'feeTypeId' })
   const baseAmount = useWatch({ name: 'baseAmount' }) || 0
   const discountAmount = useWatch({ name: 'discountAmount' }) || 0
   const schedule = useWatch({ name: 'schedule' })
   const effectiveDate = useWatch({ name: 'effectiveDate' })

   useEffect(() => {
      setValue('academicYear', viewingYear)
      if (viewingYear && yearCalendar) {
         const current = getValues('effectiveDate')
         const inYear = current && current >= yearCalendar.instructionStartsOn && current <= yearCalendar.instructionEndsOn
         if (!inYear) setValue('effectiveDate', billingDate(current || localDateInput(), yearCalendar))
      }
   }, [getValues, setValue, viewingYear, yearCalendar])

   const selectedClass = activeClasses.find(cls => cls.id === classId)
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
      ? calculateFeeAmounts(paymentType, baseAmount, schedule, discountAmount, { academicYear, effectiveDate }).netAmount
      : 0

   const previewInstallments = useMemo(() => {
      if (!selectedFeeType || netAmount <= 0) return []
      return buildInstallmentsPreview(netAmount, schedule || 'monthly', { academicYear, effectiveDate })
   }, [academicYear, effectiveDate, netAmount, schedule, selectedFeeType])

   const scheduleOptions = buildScheduleOptions(t)

   return (
      <div className='flex flex-col gap-4'>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormInput
               name='classId'
               type='select'
               icon={GraduationCap}
               formLabel={t('fees.form.class') || 'Class'}
               placeholder={t('fees.form.classPlaceholder') || 'Select class'}
               items={activeClasses.map(cls => ({ value: cls.id, label: cls.name }))}
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

         <FormInput
            name='effectiveDate'
            type='date'
            icon={CalendarClock}
            formLabel={t('fees.classBulk.rosterDate')}
            required
         />

         <StudentCount
            classId={classId}
            sectionId={sectionId}
            academicYear={viewingYear}
            effectiveDate={effectiveDate}
         />
         <p className="text-sm text-muted-foreground">
            {t('fees.classBulk.previewNote')}
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
                  {majorMoney(netAmount)}
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
