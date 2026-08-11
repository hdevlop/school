'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { ComponentProps, ComponentType, ReactNode } from 'react'
import { WizardForm, useDialog } from 'najm-kit'
import type { StepConfig } from 'najm-kit'
import { Loader2 } from 'lucide-react'
import { getStudentDefaultValues, StudentFormContent } from './SimpleStudentForm'
import { BulkParentFormContent } from '@/features/Parents/components/BulkParentForm'
import { feesSchema, fullStudentSchema, parentSchema, parentsSchema, studentSchema, transportSchema } from '@/lib/validations'
import { BulkFeeFormContent } from '@/features/Financial/Fees/components/BulkFeeForm'
import { FeeFactory } from '@/features/Financial/Fees/utils/feeUtils'
import { useTranslation } from '@/hooks/useLanguage'
import { buildFill, isDevFill, pick } from '@/lib/devFill'
import { chance } from '@/fakers/fakers'
import { StudentTransportFormContent } from '@/features/Transport/components/StudentTransportFormContent'

const ALWAYS_FEE_CATEGORIES = ['registration', 'tuition']
const OPTIONAL_FEE_PROBABILITY = 0.8
const SECOND_PARENT_PROBABILITY = 0.8
const studentWithTransportSchema = studentSchema.extend({
  transportEnabled: fullStudentSchema.shape.transportEnabled,
})

type StudentWizardFormProps = Omit<ComponentProps<typeof WizardForm>, 'submitLabel'> & {
  submitLabel?: ReactNode
}

const StudentWizardForm = WizardForm as ComponentType<StudentWizardFormProps>

const getAcademicYearStartDate = (academicYear?: string | null, referenceDate?: string | null) => {
  const startYear = academicYear?.match(/^\d{4}/)?.[0]
  if (startYear) return `${startYear}-09-01`

  const today = referenceDate ? new Date(`${referenceDate}T00:00:00`) : new Date()
  const year = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1
  return `${year}-09-01`
}

const FullStudentForm = ({
  classes = [],
  feeTypes = [],
  businessDate = null,
  onSubmitStudent,
}) => {
  const { pop } = useDialog()
  const { t } = useTranslation()
  const [transportSelected, setTransportSelected] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submissionPromiseRef = useRef<Promise<unknown> | null>(null)
  const initialStudentValues = useMemo(
    () => getStudentDefaultValues(null, businessDate),
    [businessDate],
  )

  const defaultFees = useMemo(() => {
    if (!feeTypes?.length) return []
    const tuition = feeTypes.filter((ft: any) => ft.category === 'tuition' && ft.paymentType === 'recurring' && ft.status === 'active')
    const candidates = tuition.length > 0 ? tuition : feeTypes.filter((ft: any) => ft.paymentType === 'recurring' && ft.status === 'active')
    return candidates.map((ft: any) => FeeFactory.createFromFeeType(ft))
  }, [feeTypes])

  const fillStudent = useCallback(() => {
    const selectedClass: any = pick(classes)
    const selectedSection: any = pick(selectedClass?.sections ?? [])

    return buildFill(studentSchema, {
      classId: selectedClass?.id ?? '',
      sectionId: selectedSection?.id ?? '',
      enrollmentDate: getAcademicYearStartDate(selectedClass?.academicYear, businessDate),
    })
  }, [businessDate, classes])

  const fillFees = useCallback(() => {
    const active = (feeTypes ?? []).filter((ft: any) => ft.status === 'active')
    const selected = active.filter((ft: any) =>
      ALWAYS_FEE_CATEGORIES.includes(ft.category) || chance(OPTIONAL_FEE_PROBABILITY),
    )
    return { fees: selected.map((ft: any) => FeeFactory.createFromFeeType(ft)) }
  }, [feeTypes])

  const fillAll = useCallback(() => {
    const student = fillStudent()
    const [, ...studentLastNameParts] = String(student.name ?? '').split(' ')
    const studentLastName = studentLastNameParts.join(' ')

    const makeParent = (gender: 'M' | 'F', relationshipType: 'father' | 'mother') => {
      const generated = buildFill(parentSchema, {
        gender,
        relationshipType,
        address: student.address,
      })
      const [firstName = '', ...lastNameParts] = String(generated.name ?? '').split(' ')
      const lastName = studentLastName || lastNameParts.join(' ')
      return { ...generated, name: `${firstName} ${lastName}`.trim() }
    }

    const parents = [makeParent('M', 'father')]
    if (chance(SECOND_PARENT_PROBABILITY)) parents.push(makeParent('F', 'mother'))

    return {
      ...student,
      parents,
      ...fillFees(),
    }
  }, [fillFees, fillStudent])

  // The wizard's own dev tools own the F8 shortcut, the step reset, and the
  // seeding. Only the transport step is School's to reset: it is derived from a
  // field the fill rewrites, and nothing in the package knows that.
  const devTools = useMemo(
    () => ({
      enabled: isDevFill,
      fill: () => {
        setTransportSelected(false)
        return fillAll()
      },
    }),
    [fillAll],
  )

  const studentStepTitle = t('students.form.studentInformation')
  const parentsStepTitle = t('students.form.parentsInformation')
  const feesStepTitle = t('students.form.feesInformation')
  const transportStepTitle = t('transport.form.stepTitle')

  const steps: StepConfig[] = useMemo(() => [
    {
      id: 'student',
      title: studentStepTitle,
      schema: studentWithTransportSchema,
      fields: Object.keys(studentWithTransportSchema.shape),
      render: ({ form }) => (
        <StudentFormContent
          classes={classes}
          form={form}
          showTransportToggle
          onTransportToggle={setTransportSelected}
        />
      ),
    },
    {
      id: 'parents',
      title: parentsStepTitle,
      schema: parentsSchema,
      fields: ['parents'],
      render: ({ form }) => (
        <BulkParentFormContent form={form} />
      ),
    },
    {
      id: 'fees',
      title: feesStepTitle,
      schema: feesSchema,
      fields: ['fees'],
      render: ({ form }) => (
        <BulkFeeFormContent
          feeTypes={feeTypes}
          showInstallmentPreview={false}
          showEffectiveDateField={false}
          form={form}
        />
      ),
    },
    ...(transportSelected ? [{
      id: 'transport',
      title: transportStepTitle,
      schema: transportSchema,
      fields: [
        'transportEnabled',
        'transportAssignment',
        'address',
        'addressPlaceId',
        'addressLatitude',
        'addressLongitude',
        'enrollmentDate',
      ],
      render: ({ form }) => (
        <StudentTransportFormContent form={form} feeTypes={feeTypes} />
      ),
    }] : []),
  ], [classes, feeTypes, feesStepTitle, parentsStepTitle, studentStepTitle, transportSelected, transportStepTitle])

  const defaultValues = useMemo(() => ({
    ...initialStudentValues,
    parents: [],
    fees: defaultFees,
    transportEnabled: false,
    transportAssignment: {
      vehicleId: '',
      assignmentDate: '',
      pickupLocation: '',
      pickupPlaceId: null,
      pickupLatitude: null,
      pickupLongitude: null,
      dropoffLocation: '',
      dropoffPlaceId: null,
      dropoffLatitude: null,
      dropoffLongitude: null,
      notes: '',
    },
  }), [defaultFees, initialStudentValues])

  const handleSubmit = useCallback(async (data) => {
    const { transportEnabled, ...studentData } = data
    const fees = transportEnabled
      ? (studentData.fees || []).filter((fee: any) => {
          const feeType = feeTypes.find((candidate: any) => candidate.id === fee.feeTypeId)
          return feeType?.category !== 'transport'
        })
      : studentData.fees

    const payload = {
      ...studentData,
      fees,
      transportAssignment: transportEnabled ? studentData.transportAssignment : null,
    }

    if (submissionPromiseRef.current) {
      await submissionPromiseRef.current
      return
    }

    setIsSubmitting(true)
    const submission = Promise.resolve().then(() => onSubmitStudent(payload))
    submissionPromiseRef.current = submission

    try {
      await submission
      await pop()
    } catch (error) {
      submissionPromiseRef.current = null
      setIsSubmitting(false)
      throw error
    }
  }, [feeTypes, onSubmitStudent, pop])

  return (
    <div className='h-full min-h-0' aria-busy={isSubmitting}>
      <StudentWizardForm
        steps={steps}
        schema={fullStudentSchema}
        defaultValues={defaultValues}
        devTools={devTools}
        onStepComplete={(stepIndex, data) => {
          if (stepIndex === 0) setTransportSelected(Boolean(data.transportEnabled))
        }}
        onSubmit={handleSubmit}
        className={isSubmitting ? 'pointer-events-none select-none' : undefined}
        classNames={{
          root: 'h-full min-h-0',
          step: 'pb-4',
          footer: 'sticky bottom-0 z-10 bg-background pt-3',
        }}
        nextLabel={t('common.next')}
        previousLabel={t('common.previous')}
        submitLabel={isSubmitting ? (
          <span className='inline-flex items-center gap-2'>
            <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' />
            {t('common.processing')}
          </span>
        ) : t('common.confirm')}
      />
    </div>
  )
}

export default FullStudentForm
