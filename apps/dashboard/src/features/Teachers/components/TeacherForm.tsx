'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { ComponentProps, ComponentType, ReactNode } from 'react'
import { WizardForm, useDialog } from 'najm-kit'
import type { StepConfig } from 'najm-kit'
import { FormInput } from 'najm-kit';
import { NFormSectionHeader as FormHeader } from 'najm-kit';
import { Briefcase, IdCard, User, UserRound, Mail, Activity, UserPlus, BookOpen, Award, Calendar, DollarSign, Landmark, Clock, GraduationCap, Phone, MapPin, Loader2 } from 'lucide-react'
import { useTranslation } from 'najm-i18n/react'
import {
  teacherPersonalSchema,
  teacherProfessionalSchema,
  assignmentsSchema,
  teacherFullSchema,
} from '@/lib/validations'
import { useEnum } from '@/hooks/useEnum'
import { AssignmentFormContent } from './BulkAssignmentForm'
import { buildFill, isDevFill, pick } from '@/lib/devFill'

type TeacherWizardFormProps = Omit<ComponentProps<typeof WizardForm>, 'submitLabel'> & {
   submitLabel?: ReactNode
}

const TeacherWizardForm = WizardForm as ComponentType<TeacherWizardFormProps>

// ============================================
// Default Values Helper Functions
// ============================================
export const getTeacherPersonalDefaultValues = (teacher = null) => ({
   ...(teacher?.id && { id: teacher.id }),
   name: teacher?.name ?? '',
   cin: teacher?.cin ?? '',
   email: teacher?.email ?? '',
   phone: teacher?.phone ?? '',
   address: teacher?.address ?? '',
   gender: teacher?.gender ?? 'M',
   emergencyContact: teacher?.emergencyContact ?? '',
   emergencyPhone: teacher?.emergencyPhone ?? '',
   status: teacher?.status ?? 'active',
   image: teacher?.image ?? null,
})

export const getTeacherProfessionalDefaultValues = (teacher = null) => ({
   specialization: teacher?.specialization ?? '',
   yearsOfExperience: teacher?.yearsOfExperience ?? 0,
   salary: teacher?.salary ?? '',
   hireDate: teacher?.hireDate ?? new Date().toISOString().split('T')[0],
   bankAccount: teacher?.bankAccount ?? '',
   employmentType: teacher?.employmentType ?? 'fullTime',
   workloadHours: teacher?.workloadHours ?? 40,
   academicDegrees: teacher?.academicDegrees ?? '',
})

export const getTeacherAssignmentsDefaultValues = (teacher = null) => ({
   assignments: teacher?.assignments ?? []
})

const TeacherForm = ({ teacher = null, classes = [], subjects = [], onSubmitTeacher }) => {
   const { pop } = useDialog()
   const { t } = useTranslation()
   const [isSubmitting, setIsSubmitting] = useState(false)
   const submissionPromiseRef = useRef<Promise<unknown> | null>(null)

   const fillPersonal = useCallback(() => buildFill(teacherPersonalSchema), [])
   const fillProfessional = useCallback(() => buildFill(teacherProfessionalSchema, {
      employmentType: 'fullTime',
   }), [])
   const fillAssignments = useCallback(() => {
      const selectedClass: any = pick(classes)
      const selectedSection: any = pick(selectedClass?.sections ?? [])
      const selectedSubject: any = pick(subjects)

      return {
         assignments: [{
            classId: selectedClass?.id ?? '',
            sectionIds: selectedSection?.id ? [selectedSection.id] : [],
            subjectIds: selectedSubject?.id ? [selectedSubject.id] : [],
         }],
      }
   }, [classes, subjects])

   const fillAll = useCallback(() => ({
      ...getTeacherPersonalDefaultValues(teacher),
      ...getTeacherProfessionalDefaultValues(teacher),
      ...getTeacherAssignmentsDefaultValues(teacher),
      ...fillPersonal(),
      ...fillProfessional(),
      ...fillAssignments(),
      ...(teacher?.id && { id: teacher.id }),
      image: teacher?.image ?? null,
   }), [fillAssignments, fillPersonal, fillProfessional, teacher])

   // The wizard's own dev tools own the F8 shortcut, the step reset, and the
   // seeding; School only supplies the values.
   const devTools = useMemo(
      () => ({ enabled: isDevFill, fill: fillAll }),
      [fillAll],
   )

   const steps: StepConfig[] = useMemo(() => [
      {
         id: 'personal',
         title: 'Personal Information',
         schema: teacherPersonalSchema,
         fields: Object.keys(teacherPersonalSchema.shape),
         render: ({ form }) => (
            <>
               <PersonalInfoContent form={form} />
            </>
         ),
      },
      {
         id: 'professional',
         title: 'Professional Information',
         schema: teacherProfessionalSchema,
         fields: Object.keys(teacherProfessionalSchema.shape),
         render: () => (
            <>
               <ProfessionalInfoContent />
            </>
         ),
      },
      {
         id: 'assignments',
         title: 'Assignments',
         schema: assignmentsSchema,
         fields: ['assignments'],
         render: () => (
            <>
               <AssignmentFormContent classes={classes} subjects={subjects} />
            </>
         ),
      },
   ], [classes, subjects])

   const defaultValues = useMemo(() => ({
      ...getTeacherPersonalDefaultValues(teacher),
      ...getTeacherProfessionalDefaultValues(teacher),
      ...getTeacherAssignmentsDefaultValues(teacher),
   }), [teacher])

   const handleSubmit = useCallback(async (data) => {
      if (submissionPromiseRef.current) {
         await submissionPromiseRef.current
         return
      }

      setIsSubmitting(true)
      const submission = Promise.resolve().then(() => onSubmitTeacher(data))
      submissionPromiseRef.current = submission

      try {
         await submission
         await pop()
      } catch (error) {
         submissionPromiseRef.current = null
         setIsSubmitting(false)
         throw error
      }
   }, [onSubmitTeacher, pop])

   return (
      <div className='h-full min-h-0' aria-busy={isSubmitting}>
         <TeacherWizardForm
            steps={steps}
            schema={teacherFullSchema}
            defaultValues={defaultValues}
            devTools={devTools}
            onSubmit={handleSubmit}
            className={isSubmitting ? 'pointer-events-none select-none' : undefined}
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

// ============================================
// Step 1: Personal Information
// ============================================
export const PersonalInfoContent = ({ form }: { form: any }) => {
   const { t } = useTranslation()
   const gender = form.watch('gender')
   const genderOptions = useEnum('gender')
   const statusOptions = useEnum('teacherStatus')

   const defaultImage = gender === 'M'
      ? '/images/teacher_male.png'
      : '/images/teacher_female.png'

   return (
      <>
         <FormHeader
            icon={IdCard}
            title={t('teachers.form.personalInformation')}
         />

         <div className='grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4'>
            <div className='flex items-start justify-center'>
               <FormInput
                  name='image'
                  type='image'
                  formLabel={t('teachers.form.image')}
                  showPreview={true}
                  previewPosition='top'
                  imageSize='xl'
                  allowClear={true}
                  defaultImage={defaultImage}
               />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-4'>
               <FormInput
                  name='name'
                  type='text'
                  formLabel={t('teachers.form.fullName')}
                  placeholder={t('teachers.form.fullNamePlaceholder')}
                  icon={User}
                  required={true}
               />

               <FormInput
                  name='cin'
                  type='text'
                  formLabel={t('teachers.form.cin')}
                  placeholder={t('teachers.form.cinPlaceholder')}
                  icon={IdCard}
                  required={true}
               />

               <FormInput
                  name='gender'
                  type='select'
                  formLabel={t('teachers.form.gender')}
                  items={genderOptions}
                  icon={UserRound}
               />

               <FormInput
                  name='email'
                  type='text'
                  formLabel={t('teachers.form.email')}
                  placeholder={t('teachers.form.emailPlaceholder')}
                  icon={Mail}
                  required={true}
               />

               <FormInput
                  name='phone'
                  type='phone'
                  formLabel={t('teachers.form.phone')}
                  placeholder={t('teachers.form.phonePlaceholder')}
                  icon={Phone}
                  required={true}
               />

               <FormInput
                  name='status'
                  type='select'
                  formLabel={t('teachers.form.status')}
                  items={statusOptions}
                  icon={Activity}
               />

               <FormInput
                  name='emergencyContact'
                  type='text'
                  formLabel={t('teachers.form.emergencyContactName')}
                  placeholder={t('teachers.form.emergencyContactNamePlaceholder')}
                  icon={UserPlus}
               />

               <FormInput
                  name='emergencyPhone'
                  type='phone'
                  formLabel={t('teachers.form.emergencyPhone')}
                  placeholder={t('teachers.form.emergencyPhonePlaceholder')}
                  icon={Phone}
               />

                <div className='md:col-span-2'>
                   <FormInput
                      name='address'
                      type='textarea'
                      formLabel={t('teachers.form.address')}
                      placeholder={t('teachers.form.addressPlaceholder')}
                      icon={MapPin}
                   />
                </div>
            </div>
         </div>
      </>
   )
}

// ============================================
// Step 2: Professional Information
// ============================================
export const ProfessionalInfoContent = () => {
   const { t } = useTranslation()
   const employmentTypeOptions = useEnum('employmentType')

   return (
      <>
         <FormHeader
            icon={Briefcase}
            title={t('teachers.form.professionalInformation')}
         />

         <div className='grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-4'>
            <FormInput
               name='specialization'
               type='text'
               formLabel={t('teachers.form.specialization')}
               placeholder={t('teachers.form.specializationPlaceholder')}
               icon={BookOpen}
            />

            <FormInput
               name='yearsOfExperience'
               type='number'
               formLabel={t('teachers.form.yearsOfExperience')}
               placeholder={t('teachers.form.yearsOfExperiencePlaceholder')}
               icon={Award}
            />

            <FormInput
               name='hireDate'
               type='date'
               formLabel={t('teachers.form.hireDate')}
               icon={Calendar}
               required={true}
            />

            <FormInput
               name='salary'
               type='number'
               formLabel={t('teachers.form.salary')}
               placeholder={t('teachers.form.salaryPlaceholder')}
               icon={DollarSign}
            />

            <FormInput
               name='bankAccount'
               type='text'
               formLabel={t('teachers.form.bankAccount')}
               placeholder={t('teachers.form.bankAccountPlaceholder')}
               icon={Landmark}
            />

            <FormInput
               name='employmentType'
               type='select'
               formLabel={t('teachers.form.employmentType')}
               placeholder={t('teachers.form.employmentTypePlaceholder')}
               items={employmentTypeOptions}
               icon={Briefcase}
            />

            <FormInput
               name='workloadHours'
               type='number'
               formLabel={t('teachers.form.workloadHours')}
               placeholder={t('teachers.form.workloadHoursPlaceholder')}
               icon={Clock}
            />

            <FormInput
               name='academicDegrees'
               type='text'
               formLabel={t('teachers.form.academicDegrees')}
               placeholder={t('teachers.form.academicDegreesPlaceholder')}
               icon={GraduationCap}
            />
         </div>
      </>
   )
}

export default TeacherForm
