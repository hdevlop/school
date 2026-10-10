'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { ComponentProps, ComponentType, ReactNode } from 'react'
import { WizardForm, useDialog } from 'najm-kit'
import type { StepConfig } from 'najm-kit'
import { Loader2 } from 'lucide-react'
import { getStudentDefaultValues, StudentFormContent } from './SimpleStudentForm'
import { BulkParentFormContent } from '@/features/Parents/components/BulkParentForm'
import { fullStudentSchema, studentWithoutFeesSchema, studentWithTransportSchema } from '../config/fullStudentSchemas'
import { firstYearEnrolledOn } from '../config/newStudentEnrollment'
import { parentsSchema } from '@/features/Parents/config/parentSchemas'
import { feesSchema } from '@/features/Financial/Fees/config/feeSchemas'
import { transportSchema } from '@/features/Transport/config/transportSchemas'
import { BulkFeeFormContent } from '@/features/Financial/Fees/components/BulkFeeForm'
import { FeeFactory } from '@/features/Financial/Fees/utils/feeUtils'
import { useTranslation } from 'najm-i18n/react'
import { StudentTransportFormContent } from '@/features/Transport/components/StudentTransportFormContent'
import { normalizeLocationValue } from 'najm-kit/location'
import { useViewerRole } from '@/features/Users/hooks/useViewerRole'

type StudentWizardFormProps = Omit<ComponentProps<typeof WizardForm>, 'submitLabel'> & {
  submitLabel?: ReactNode
}

const StudentWizardForm = WizardForm as ComponentType<StudentWizardFormProps>

const FullStudentForm = ({
  classes = [],
  feeTypes = [],
  businessDate = null,
  onSubmitStudent,
}) => {
  const { pop } = useDialog()
  const { t } = useTranslation()
  const { role } = useViewerRole()
  const canCreateFees = ['admin', 'principal', 'accounting'].includes(role ?? '')
  const canAssignTransport = role === 'admin'
  const formSchema = canCreateFees ? fullStudentSchema : studentWithoutFeesSchema
  const [transportSelected, setTransportSelected] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submissionPromiseRef = useRef<Promise<unknown> | null>(null)
  const initialStudentValues = useMemo(() => getStudentDefaultValues(null, businessDate), [businessDate])

  const defaultFees = useMemo(() => {
    if (!canCreateFees || !feeTypes?.length) return []
    const tuition = feeTypes.filter((ft: any) => ft.category === 'tuition' && ft.paymentType === 'recurring' && ft.status === 'active')
    const candidates = tuition.length > 0 ? tuition : feeTypes.filter((ft: any) => ft.paymentType === 'recurring' && ft.status === 'active')
    return candidates.map((ft: any) => FeeFactory.createFromFeeType(ft))
  }, [canCreateFees, feeTypes])

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
      render: () => (
        <StudentFormContent
          classes={classes}
          showTransportToggle={canAssignTransport}
          onTransportToggle={setTransportSelected}
        />
      ),
    },
    {
      id: 'parents',
      title: parentsStepTitle,
      schema: parentsSchema,
      fields: ['parents'],
      render: () => (
        <BulkParentFormContent />
      ),
    },
    ...(canCreateFees ? [{
      id: 'fees',
      title: feesStepTitle,
      schema: feesSchema,
      fields: ['fees'],
      render: () => (
        <BulkFeeFormContent
          feeTypes={feeTypes}
          showInstallmentPreview={false}
          showEffectiveDateField={false}
        />
      ),
    }] : []),
    ...(canAssignTransport && transportSelected ? [{
      id: 'transport',
      title: transportStepTitle,
      schema: transportSchema,
      fields: [
        'transportEnabled',
        'transportAssignment',
        'addressLocation',
        'addressPlaceId',
        'enrollmentDate',
      ],
      render: () => (
        <StudentTransportFormContent feeTypes={feeTypes} />
      ),
    }] : []),
  ], [canCreateFees, canAssignTransport, classes, feeTypes, feesStepTitle, parentsStepTitle, studentStepTitle, transportSelected, transportStepTitle])

  const defaultValues = useMemo(() => ({
    ...initialStudentValues,
    parents: [],
    fees: defaultFees,
    transportEnabled: false,
    transportAssignment: {
      vehicleId: '',
      assignmentDate: '',
      pickup: normalizeLocationValue(),
      pickupPlaceId: null,
      dropoff: normalizeLocationValue(),
      dropoffPlaceId: null,
      notes: '',
    },
  }), [defaultFees, initialStudentValues])

  const handleSubmit = useCallback(async (data) => {
    const { transportEnabled, ...studentData } = data
    const { transportAssignment, ...studentFields } = studentData
    const fees = transportEnabled
      ? (studentData.fees || []).filter((fee: any) => {
          const feeType = feeTypes.find((candidate: any) => candidate.id === fee.feeTypeId)
          return feeType?.category !== 'transport'
        })
      : studentData.fees

    const { addressLocation, ...flatStudentFields } = studentFields
    const flatTransportAssignment = canAssignTransport && transportEnabled && transportAssignment
      ? (() => {
          const { pickup, dropoff, ...fields } = transportAssignment
          return {
            ...fields,
            pickupLocation: pickup.address,
            pickupLatitude: pickup.latitude ?? null,
            pickupLongitude: pickup.longitude ?? null,
            dropoffLocation: dropoff.address,
            dropoffLatitude: dropoff.latitude ?? null,
            dropoffLongitude: dropoff.longitude ?? null,
          }
        })()
      : null

    const studentClass: any = classes.find((candidate: any) => candidate.id === flatStudentFields.classId)
    const payload = {
      ...flatStudentFields,
      yearEnrolledOn: firstYearEnrolledOn(flatStudentFields.enrollmentDate, studentClass?.academicYear),
      address: addressLocation.address,
      addressLatitude: addressLocation.latitude ?? null,
      addressLongitude: addressLocation.longitude ?? null,
      fees: canCreateFees ? fees : [],
      transportAssignment: flatTransportAssignment,
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
  }, [canCreateFees, canAssignTransport, classes, feeTypes, onSubmitStudent, pop])

  return (
    <div className='h-full min-h-0' aria-busy={isSubmitting}>
      <StudentWizardForm
        steps={steps}
        schema={formSchema}
        defaultValues={defaultValues}
        onStepComplete={(stepIndex, data) => {
          if (stepIndex === 0) setTransportSelected(canAssignTransport && Boolean(data.transportEnabled))
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
