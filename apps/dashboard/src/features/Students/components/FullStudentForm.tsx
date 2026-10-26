'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { ComponentProps, ComponentType, ReactNode } from 'react'
import { NButton, NEmptyState, WizardForm } from 'najm-kit'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDialog } from '@/shared/useDialog'
import type { StepConfig } from 'najm-kit'
import { GraduationCap, Loader2 } from 'lucide-react'
import { getStudentDefaultValues, StudentFormContent } from './SimpleStudentForm'
import { BulkParentFormContent } from '@/features/Parents/components/BulkParentForm'
import { createFullStudentSchemas } from '../config/fullStudentSchemas'
import { firstYearEnrolledOn } from '../config/newStudentEnrollment'
import { BulkFeeFormContent } from '@/features/Financial/Fees/components/BulkFeeForm'
import { FeeFactory } from '@/features/Financial/Fees/utils/feeUtils'
import { getDefaultStudentFeeTypes } from '@/features/Financial/FeeTypes/config/feeTypeOptions'
import { useTranslation } from 'najm-i18n/react'
import { StudentTransportFormContent } from '@/features/Transport/components/StudentTransportFormContent'
import { normalizeLocationValue } from 'najm-kit/location'
import { useViewerRole } from '@/features/Users/hooks/useViewerRole'
import { useSetViewingYear, useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear'
import { validateStudentAdmissionApi } from '@/services/studentApi'
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope'

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
  const router = useRouter()
  const setViewingYear = useSetViewingYear()
  const { activeYear } = useViewingAcademicYear()
  const { t } = useTranslation()
  const { isSchoolWide, can } = useViewerRole()
  const canCreateFees = isSchoolWide && can('create:fees')
  const canAssignTransport = isSchoolWide && can('create:student-routes')
  const {
    fees: feesSchema, parents: parentsSchema, transport: transportSchema,
    fullStudent, studentWithoutFees, studentWithTransport: studentWithTransportSchema,
  } = useMemo(() => createFullStudentSchemas(t), [t])
  const formSchema = canCreateFees ? fullStudent : studentWithoutFees
  // Each wizard step receives only its declared fields. Carry the admission
  // date into Fees so its preview uses the same date as the final request,
  // including edits made before navigating through the step header.
  const studentFeesSchema = useMemo(() => feesSchema.extend({
    enrollmentDate: studentWithTransportSchema.shape.enrollmentDate,
  }), [feesSchema, studentWithTransportSchema])
  const [transportSelected, setTransportSelected] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const submissionPromiseRef = useRef<Promise<unknown> | null>(null)
  const initialStudentValues = useMemo(() => getStudentDefaultValues(null, businessDate), [businessDate])
  const admissionStepSchema = useMemo(() => studentWithTransportSchema.superRefine(async (data, context) => {
    if (!studentWithTransportSchema.safeParse(data).success) return
    try {
      const schoolClass = classes.find((candidate: any) => candidate.id === data.classId)
      const response = await withAcademicYear(activeYear, () => validateStudentAdmissionApi({
        studentCode: data.studentCode, classId: data.classId, sectionId: data.sectionId,
        yearEnrolledOn: firstYearEnrolledOn(data.enrollmentDate, schoolClass?.academicYear),
      }))
      const result = response?.data ?? response
      for (const issue of result.issues) {
        context.addIssue({ code: 'custom', path: [issue.field], message: issue.message })
      }
    } catch (error) {
      context.addIssue({ code: 'custom', path: ['studentCode'], message: error instanceof Error ? error.message : t('students.form.saveFailed') })
    }
  }), [activeYear, classes, studentWithTransportSchema, t])

  const defaultFees = useMemo(() => {
    if (!canCreateFees || !feeTypes?.length) return []
    return getDefaultStudentFeeTypes(feeTypes).map((ft: any) => FeeFactory.createFromFeeType(ft))
  }, [canCreateFees, feeTypes])

  const studentStepTitle = t('students.form.studentInformation')
  const parentsStepTitle = t('students.form.parentsInformation')
  const feesStepTitle = t('students.form.feesInformation')
  const transportStepTitle = t('transport.form.stepTitle')

  const steps: StepConfig[] = useMemo(() => [
    {
      id: 'student',
      title: studentStepTitle,
      schema: admissionStepSchema,
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
      schema: studentFeesSchema,
      fields: ['fees', 'enrollmentDate'],
      render: () => (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t('students.form.feesOptional')}</p>
          {feeTypes.length === 0 && (
            <p className="rounded-lg border bg-muted/30 p-3 text-sm">
              {t('students.form.noFeeTypesHint')}{' '}
              {can('create:feeTypes') && (
                <Link href="/fee-types" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4">
                  {t('students.form.manageFeeTypes')}
                </Link>
              )}
            </p>
          )}
        <BulkFeeFormContent
          feeTypes={feeTypes}
          academicYear={activeYear}
          showInstallmentPreview={false}
          showEffectiveDateField={false}
        />
        </div>
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
  ], [activeYear, admissionStepSchema, can, canCreateFees, canAssignTransport, classes, feeTypes, studentFeesSchema, feesStepTitle, parentsSchema, parentsStepTitle, studentWithTransportSchema, studentStepTitle, transportSchema, transportSelected, transportStepTitle, t])

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
    setSubmissionError(null)
    const submission = Promise.resolve().then(() => onSubmitStudent(payload))
    submissionPromiseRef.current = submission

    try {
      await submission
      await pop()
    } catch (error) {
      submissionPromiseRef.current = null
      setIsSubmitting(false)
      if ([400, 409, 422].includes((error as { status?: number }).status ?? 0)) {
        setSubmissionError(error instanceof Error ? error.message : t('students.form.saveFailed'))
        return
      }
      throw error
    }
  }, [canCreateFees, canAssignTransport, classes, feeTypes, onSubmitStudent, pop, t])

  if (classes.length === 0) {
    return (
      <NEmptyState
        surface='panel'
        icon={GraduationCap}
        title={t('students.form.noClassesTitle')}
        description={t(can('create:classes') ? 'students.form.noClassesHint' : 'students.form.noClassesAdminHint')}
        action={can('create:classes') ? (
          <NButton onClick={async () => {
            await pop()
            setViewingYear(activeYear)
            router.push('/classes')
          }}>
            {t('students.form.manageClasses')}
          </NButton>
        ) : undefined}
      />
    )
  }

  return (
    <div className='h-full min-h-0' aria-busy={isSubmitting}>
      {submissionError && <p role="alert" className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{submissionError}</p>}
      <StudentWizardForm
        steps={steps}
        schema={formSchema}
        defaultValues={defaultValues}
        onStepComplete={(stepIndex, data) => {
          if (stepIndex === 0) {
            setTransportSelected(canAssignTransport && Boolean(data.transportEnabled))
          }
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
