'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { AvatarFormInput, NForm } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { FormInput } from 'najm-kit';
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import { FormLocationInput, normalizeLocationValue } from 'najm-kit/location'
import { IdCard, BookOpen, Hash, User, UserRound, Calendar, CalendarCheck, GraduationCap, DoorOpen, School, Mail, Phone, HeartPulse, Bus } from 'lucide-react'
import { useTranslation } from 'najm-i18n/react'
import { useFormContext, useWatch } from 'react-hook-form'
import { PLACEMENT_FIELDS, createStudentSchemas } from '../config/studentSchemas'
import { buildGenderOptions } from '../config/studentOptions'
import { StudentParentsSection } from './StudentParentsSection'

const sectionHeaderClassName = 'student-form-section-header'

export const getStudentDefaultValues = (student = null, businessDate?: string | null) => {

  const defaultValues = {
    ...(student?.id && { id: student.id }),
    studentCode: student?.studentCode ?? '',
    name: student?.name ?? '',
    arabicName: student?.arabicName ?? '',
    email: student?.email ?? '',
    phone: student?.phone ?? '',
    addressLocation: normalizeLocationValue({
      address: student?.address,
      latitude: student?.addressLatitude,
      longitude: student?.addressLongitude,
    }),
    addressPlaceId: student?.addressPlaceId ?? null,
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

  const { t } = useTranslation()
  const studentProfileEditSchema = useMemo(() => createStudentSchemas(t).profileEdit, [t])
  const { pop } = useDialog()
  const handleSubmit = async (studentData) => {
    const { addressLocation, ...fields } = studentData;
    for (const field of PLACEMENT_FIELDS) delete fields[field];
    pop({
      ...fields,
      address: addressLocation.address,
      addressLatitude: addressLocation.latitude ?? null,
      addressLongitude: addressLocation.longitude ?? null,
    })
  }

  return (
    <>
      <NForm
        id='student-form'
        schema={studentProfileEditSchema}
        defaultValues={getStudentDefaultValues(student)}
        onSubmit={handleSubmit}
      >
        <StudentFormContent classes={classes} student={student} placementReadOnly />
      </NForm>
      {student?.id && <StudentParentsSection studentId={student.id} />}
    </>
  )
}

export const StudentFormContent = ({ classes = [], prefix = '', student: _student = null, showTransportToggle = false, placementReadOnly = false, onTransportToggle }: {
  classes?: any[]
  placementReadOnly?: boolean
  prefix?: string
  student?: any
  showTransportToggle?: boolean
  onTransportToggle?: (enabled: boolean) => void
}) => {

  const { t } = useTranslation();
  const { setValue } = useFormContext();
  const fieldName = useCallback((field) => prefix ? `${prefix}.${field.charAt(0)}${field.slice(1)}` : field, [prefix]);

  const selectedClassId = useWatch({ name: fieldName('classId') });
  const selectedSectionId = useWatch({ name: fieldName('sectionId') });
  const addressLocation = useWatch({ name: fieldName('addressLocation') })
  const addressPlaceId = useWatch({ name: fieldName('addressPlaceId') })

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

    setValue(fieldName('sectionId'), '');
  }, [fieldName, sectionOptions, selectedSectionId, setValue]);

  const genderOptions = buildGenderOptions(t)

  return (
    <>

      <FormSectionHeader
        icon={IdCard}
        title={t('students.form.personalData')}
        className={sectionHeaderClassName}
      />

      <div className='grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6'>
        <AvatarFormInput
          name='image'
          formLabel={t('students.form.studentImage')}
          radius='xl'
          allowClear
          previewStyle={{ width: 180, height: 200 }}
        />

        <div className='grid min-w-0 grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='grid min-w-0 grid-cols-1 gap-4 md:col-span-2 md:grid-cols-3'>
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
              name='arabicName'
              type='text'
              formLabel={t('students.form.arabicName')}
              icon={User}
              dir='rtl'
              lang='ar'
            />
          </div>

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

          <FormLocationInput
            classNames={{ status: "hidden" }}
            name={fieldName('addressLocation')}
            formLabel={t('students.form.address')}
            placeholder={t('students.form.addressPlaceholder')}
            providerMeta={addressLocation && addressPlaceId
              ? { provider: 'google', placeId: addressPlaceId, ...addressLocation }
              : null}
            onProviderMetaChange={(meta) => setValue(fieldName('addressPlaceId'), meta?.placeId ?? null, { shouldDirty: true })}
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

      {!placementReadOnly && selectedClassId && sectionOptions.length === 0 && (
        <p role='status' className='text-sm text-muted-foreground'>
          {t('students.form.noSectionsHint')}
        </p>
      )}

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <FormInput
          name='classId'
          type='select'
          formLabel={t('students.form.class')}
          placeholder={t('students.form.classPlaceholder')}
          items={classOptions}
          icon={GraduationCap}
          required={!placementReadOnly}
          disabled={placementReadOnly}
        />

        <FormInput
          name='sectionId'
          type='select'
          formLabel={t('students.form.section')}
          placeholder={t('students.form.sectionPlaceholder')}
          items={sectionOptions}
          icon={DoorOpen}
          disabled={placementReadOnly || !selectedClassId || sectionOptions.length === 0}
          required={!placementReadOnly}
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
