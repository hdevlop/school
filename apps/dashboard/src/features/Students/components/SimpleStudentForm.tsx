'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query';
import { getStudentEnrollmentsApi } from '@/services/studentEnrollmentApi';
import type { StudentYearEnrollment } from '@/services/studentEnrollmentApi';
import { studentEnrollmentCorrection } from '../config/studentCorrection';
import { isDateOnly } from '@sms/contracts/academic-years';
import { AvatarFormInput, NForm, useDialog } from 'najm-kit';
import { FormInput } from 'najm-kit';
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import { FormLocationInput, normalizeLocationValue } from 'najm-kit/location'
import { IdCard, BookOpen, Hash, User, UserRound, Calendar, CalendarCheck, GraduationCap, DoorOpen, School, Mail, Phone, HeartPulse, Bus } from 'lucide-react'
import { useTranslation } from 'najm-i18n/react'
import { useFormContext, useWatch } from 'react-hook-form'
import { PLACEMENT_FIELDS, studentProfileEditSchema } from '../config/studentSchemas'
import { buildGenderOptions } from '../config/studentOptions'

const sectionHeaderClassName = 'student-form-section-header'

export const getStudentDefaultValues = (student = null, businessDate?: string | null) => {

  const defaultValues = {
    ...(student?.id && { id: student.id }),
    studentCode: student?.studentCode ?? '',
    name: student?.name ?? '',
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

const SimpleStudentForm = ({ student = null, classes = [], canCorrect = false }) => {

  const { pop } = useDialog()
  const { t } = useTranslation();
  const { data: history, isFetching, error } = useQuery({
    queryKey: ['student-enrollments', student?.id],
    queryFn: () => getStudentEnrollmentsApi(student.id),
    enabled: canCorrect && !!student?.enrollment?.id,
    refetchOnMount: 'always', refetchOnWindowFocus: false,
  });
  const [enrollment, setEnrollment] = useState<StudentYearEnrollment | null | undefined>();
  useEffect(() => {
    if (history && !isFetching) setEnrollment((snapshot) => snapshot === undefined
      ? history.find((row) => row.id === student?.enrollment?.id) ?? null : snapshot);
  }, [history, isFetching, student?.enrollment?.id]);
  const latest = enrollment?.placements[0];
  const editable = canCorrect && !!latest;
  if (canCorrect && student?.enrollment?.id && (enrollment === undefined || error)) {
    return <p role={error ? 'alert' : 'status'}>{error ? String(error.message) : t('common.loading')}</p>;
  }

  const handleSubmit = async (studentData) => {
    const enrollmentCorrection = studentEnrollmentCorrection(editable ? enrollment : undefined, studentData);
    const { addressLocation, ...fields } = studentData;
    for (const field of [...PLACEMENT_FIELDS, 'correctionPlacementId', 'yearEnrolledOn', 'yearLeftOn', 'yearStatus',
      'placementValidFrom', 'placementValidTo', 'correctionReason']) delete fields[field];
    pop({
      ...fields,
      ...(enrollmentCorrection ? { enrollmentCorrection } : {}),
      address: addressLocation.address,
      addressLatitude: addressLocation.latitude ?? null,
      addressLongitude: addressLocation.longitude ?? null,
    })
  }

  return (
    <NForm
      id='student-form'
      schema={studentProfileEditSchema.superRefine((values, ctx) => {
        const correction = studentEnrollmentCorrection(editable ? enrollment : undefined, values);
        if (!correction) return;
        if (!correction.reason?.trim()) ctx.addIssue({ code: 'custom', path: ['correctionReason'],
          message: t('students.correction.requiredReason') });
        for (const field of ['yearEnrolledOn', 'placementValidFrom', 'yearLeftOn', 'placementValidTo'] as const) {
          if ((values[field] || field === 'yearEnrolledOn' || field === 'placementValidFrom') && !isDateOnly(values[field])) {
            ctx.addIssue({ code: 'custom', path: [field], message: t('students.correction.invalidDates') });
          }
        }
      })}
      defaultValues={{ ...getStudentDefaultValues(student), ...(editable ? {
        classId: latest.classId, sectionId: latest.sectionId,
        correctionPlacementId: latest.id, yearEnrolledOn: enrollment.enrolledOn,
        yearLeftOn: enrollment.leftOn ?? '', yearStatus: enrollment.status,
        placementValidFrom: latest.validFrom, placementValidTo: latest.validTo ?? '', correctionReason: '',
      } : {}) }}
      onSubmit={handleSubmit}
    >
      <StudentFormContent classes={classes} student={student} placementReadOnly={!editable} />
      {editable && <CorrectionFields enrollment={enrollment} />}
    </NForm>
  )
}

function CorrectionFields({ enrollment }) {
  const { t } = useTranslation();
  const { setValue } = useFormContext();
  return <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
    <FormInput name='correctionPlacementId' type='select' formLabel={t('students.correction.placement')}
      items={enrollment.placements.map((p) => ({ value: p.id,
        label: `${p.className} / ${p.sectionName} (${p.validFrom} – ${p.validTo ?? '…'})` }))}
      onChange={(id) => {
        const p = enrollment.placements.find((row) => row.id === id);
        if (p) for (const [field, value] of Object.entries({ classId: p.classId, sectionId: p.sectionId,
          placementValidFrom: p.validFrom, placementValidTo: p.validTo ?? '' })) setValue(field, value, { shouldDirty: true });
      }} required />
    <FormInput name='yearStatus' type='select' formLabel={t('students.correction.status')}
      items={['active', 'withdrawn', 'graduated', 'transferred'].map((value) => ({ value,
        label: value === 'active' ? t('students.status.active') : t(`students.enrollment.endStatus.${value}`) }))} required />
    <FormInput name='yearEnrolledOn' type='date' formLabel={t('students.form.yearEnrolledOn')} required />
    <FormInput name='yearLeftOn' type='date' formLabel={t('students.correction.leftOn')} />
    <FormInput name='placementValidFrom' type='date' formLabel={t('students.correction.validFrom')} required />
    <FormInput name='placementValidTo' type='date' formLabel={t('students.correction.validTo')} />
    <FormInput name='correctionReason' type='textarea' formLabel={t('students.correction.reason')} />
  </div>;
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

          <FormLocationInput
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
        {placementReadOnly && (
          <p className='text-xs text-muted-foreground md:col-span-2'>{t('students.form.placementReadOnly')}</p>
        )}

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
