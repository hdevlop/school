'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { NForm, useDialog } from 'najm-kit';
import { FormInput } from 'najm-kit';
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import { IdCard, BookOpen, Hash, User, UserRound, Calendar, CalendarCheck, GraduationCap, DoorOpen, School, Mail, Phone, HeartPulse, Bus } from 'lucide-react'
import { useTranslation } from '@/hooks/useLanguage'
import { useActiveForm } from '@/hooks/useActiveForm'
import { studentSchema } from '@/lib/validations'
import { buildFill, isDevFill, pick } from '@/lib/devFill'
import { useEnum } from '@/hooks/useEnum'
import { LocationField } from '@/components/location/LocationField'

const getAcademicYearStartDate = (academicYear?: string | null, referenceDate?: string | null) => {
  const startYear = academicYear?.match(/^\d{4}/)?.[0]
  if (startYear) return `${startYear}-09-01`

  const today = referenceDate ? new Date(`${referenceDate}T00:00:00`) : new Date()
  const year = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1
  return `${year}-09-01`
}

const sectionHeaderClassName = 'student-form-section-header'

export const getStudentDefaultValues = (student = null, businessDate?: string | null) => {

  const defaultValues = {
    ...(student?.id && { id: student.id }),
    studentCode: student?.studentCode ?? '',
    name: student?.name ?? '',
    email: student?.email ?? '',
    phone: student?.phone ?? '',
    address: student?.address ?? '',
    addressPlaceId: student?.addressPlaceId ?? null,
    addressLatitude: student?.addressLatitude ?? null,
    addressLongitude: student?.addressLongitude ?? null,
    dateOfBirth: student?.dateOfBirth ?? '',
    gender: student?.gender ?? 'M',
    classId: student?.classId ?? '',
    sectionId: student?.sectionId ?? '',
    enrollmentDate: student?.enrollmentDate ?? businessDate ?? new Date().toISOString().split('T')[0],
    medicalConditions: student?.medicalConditions ?? '',
    previousSchool: student?.previousSchool ?? '',
    image: student?.image ?? null,
    status: student?.status ?? 'active',
  };

  return defaultValues;
}

const SimpleStudentForm = ({ student = null, classes = [] }) => {

  const { pop } = useDialog()

  const handleSubmit = async (studentData) => {
    pop(studentData)
  }

  const fill = () => {
    const cls: any = pick(classes || []);
    const sec: any = pick(cls?.sections || []);
    return buildFill(studentSchema, {
      classId: cls?.id ?? '',
      sectionId: sec?.id ?? '',
      enrollmentDate: getAcademicYearStartDate(cls?.academicYear),
    });
  };

  return (
    <NForm
      id='student-form'
      schema={studentSchema}
      defaultValues={getStudentDefaultValues(student)}
      onSubmit={handleSubmit}
      devTools={{ enabled: isDevFill, fill }}
    >
      <StudentFormContent classes={classes} student={student} />
    </NForm>
  )
}
export const StudentFormContent = ({ classes = [], prefix = '', student: _student = null, form = null, showTransportToggle = false, onTransportToggle }: {
  classes?: any[]
  prefix?: string
  student?: any
  form?: any
  showTransportToggle?: boolean
  onTransportToggle?: (enabled: boolean) => void
}) => {

  const { t } = useTranslation();
  const activeForm = useActiveForm(form);
  const fieldName = useCallback((field) => prefix ? `${prefix}.${field.charAt(0)}${field.slice(1)}` : field, [prefix]);

  const selectedClassId = activeForm.watch(fieldName('classId'));
  const selectedSectionId = activeForm.watch(fieldName('sectionId'));
  const gender = activeForm.watch(fieldName('gender'))

  const classOptions = classes.map(cls => ({
    value: cls.id,
    label: cls.name
  }))

  const sectionOptions = useMemo(() => {
    const selectedClass = classes.find(cls => cls.id === selectedClassId);
    return selectedClass?.sections?.map(section => ({
      value: section.id,
      label: section.name
    })) ?? [];
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (!selectedSectionId || sectionOptions.some(section => section.value === selectedSectionId)) {
      return;
    }

    activeForm.setValue(fieldName('sectionId'), '');
  }, [activeForm, fieldName, sectionOptions, selectedSectionId]);

  const genderOptions = useEnum('gender')

  const defaultImage = gender === 'M'
    ? '/images/student_male.png' : '/images/student_female.png'

  return (
    <>

      <FormSectionHeader
        icon={IdCard}
        title={t('students.form.personalData')}
        className={sectionHeaderClassName}
      />

      <div className='grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6'>
        <div className='flex items-start justify-center'>
          <FormInput
            name='image'
            type='image'
            formLabel={t('students.form.studentImage')}
            showPreview={true}
            previewPosition='top'
            imageSize='lg'
            allowClear={true}
            defaultImage={defaultImage}
          />
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <FormInput
            name='studentCode'
            type='text'
            formLabel={t('students.form.studentCode')}
            placeholder={t('students.form.studentCodePlaceholder')}
            icon={Hash}
            required={true}
          />

          <FormInput
            name='name'
            type='text'
            formLabel={t('students.form.fullName')}
            placeholder={t('students.form.fullNamePlaceholder')}
            icon={User}
            required={true}
          />

          <FormInput
            name='gender'
            type='select'
            formLabel={t('students.form.gender')}
            items={genderOptions}
            icon={UserRound}
            required={true}
          />

          <FormInput
            name='dateOfBirth'
            type='date'
            formLabel={t('students.form.dateOfBirth')}
            placeholder={t('students.form.dateOfBirthPlaceholder')}
            icon={Calendar}
          />

          <FormInput
            name='email'
            type='text'
            formLabel={t('students.form.email')}
            placeholder={t('students.form.emailPlaceholder')}
            icon={Mail}
          />

          <FormInput
            name='phone'
            type='phone'
            formLabel={t('students.form.phone')}
            placeholder={t('students.form.phonePlaceholder')}
            icon={Phone}
          />

          <LocationField
            form={activeForm}
            names={{
              address: fieldName('address'),
              placeId: fieldName('addressPlaceId'),
              latitude: fieldName('addressLatitude'),
              longitude: fieldName('addressLongitude'),
            }}
            label={t('students.form.address')}
            placeholder={t('students.form.addressPlaceholder')}
            rows={4}
            compact
          />

          <FormInput
            name='medicalConditions'
            type='text'
            formLabel={t('students.form.medicalConditions')}
            placeholder={t('students.form.medicalConditionsPlaceholder')}
            icon={HeartPulse}
          />
        </div>
      </div>

      <FormSectionHeader
        icon={BookOpen}
        title={t('students.form.academicInformation')}
        className={sectionHeaderClassName}
      />

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <FormInput
          name='classId'
          type='select'
          formLabel={t('students.form.class')}
          placeholder={t('students.form.classPlaceholder')}
          items={classOptions}
          icon={GraduationCap}
          required={true}
        />

        <FormInput
          name='sectionId'
          type='select'
          formLabel={t('students.form.section')}
          placeholder={t('students.form.sectionPlaceholder')}
          items={sectionOptions}
          icon={DoorOpen}
          disabled={!selectedClassId || sectionOptions.length === 0}
          required={true}
        />

        <FormInput
          name='enrollmentDate'
          type='date'
          formLabel={t('students.form.enrollmentDate')}
          placeholder={t('students.form.enrollmentDatePlaceholder')}
          icon={CalendarCheck}
          required={true}
        />
        <FormInput
          name='previousSchool'
          type='text'
          formLabel={t('students.form.previousSchool')}
          placeholder={t('students.form.previousSchoolPlaceholder')}
          icon={School}
        />

        {showTransportToggle ? (
          <FormInput
            name='transportEnabled'
            type='switch'
            label={t('transport.form.usesTransport')}
            helper={t('transport.form.optionalDescription')}
            icon={Bus}
            iconPosition='label'
            bordered
            className='min-h-14 rounded-xl px-4'
            classNames={{ item: 'md:col-span-2' }}
            onChange={(enabled) => onTransportToggle?.(Boolean(enabled))}
          />
        ) : null}

      </div>
    </>
  )
}

export default SimpleStudentForm
