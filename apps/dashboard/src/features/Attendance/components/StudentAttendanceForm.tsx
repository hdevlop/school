'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import React from 'react'
import { CalendarDays, FileText, User, GraduationCap, DoorOpen, BookOpen, Activity } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { attendanceSchema } from '@/lib/validations'
import { useTranslation } from '@/hooks/useLanguage'

const statusOptions = [
  { label: 'Present', value: 'present' },
  { label: 'Absent', value: 'absent' },
  { label: 'Late', value: 'late' },
];

const StudentAttendanceForm = ({ attendanceData = null }) => {
  const { t } = useTranslation();
  const { pop } = useDialog();

  const defaultValues = {
    ...(attendanceData?.id && { id: attendanceData.id }),
    type: 'student',
    studentId: attendanceData?.studentId || '',
    teacherId: attendanceData?.teacherId || '',
    subjectId: attendanceData?.subjectId || '',
    sectionId: attendanceData?.sectionId || '',
    date: attendanceData?.date || new Date().toISOString().split('T')[0],
    status: attendanceData?.status || 'present',
    notes: attendanceData?.notes || '',
  };

  const handleSubmit = async (formData) => {
    pop({ ...formData, type: 'student' });
  };

  return (
    <div className='flex flex-col justify-center items-center w-full'>
      <div className='flex flex-col h-full w-full gap-4'>
        <NForm
          id='attendance-form'
          schema={attendanceSchema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
        >
          <div className='flex flex-col gap-4'>
            <FormSectionHeader
              icon={User}
              title={t('attendance.form.attendanceInfo')}
            />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormInput
                name='studentId'
                type='text'
                formLabel={t('attendance.form.studentId')}
                placeholder={t('attendance.form.studentIdPlaceholder')}
                icon={User}
                required={true}
              />

              <FormInput
                name='teacherId'
                type='text'
                formLabel={t('attendance.form.teacherId')}
                placeholder={t('attendance.form.teacherIdPlaceholder')}
                icon={GraduationCap}
                required={true}
              />

              <FormInput
                name='sectionId'
                type='text'
                formLabel={t('attendance.form.sectionId')}
                placeholder={t('attendance.form.sectionIdPlaceholder')}
                icon={DoorOpen}
                required={true}
              />

              <FormInput
                name='subjectId'
                type='text'
                formLabel={t('attendance.form.subjectId')}
                placeholder={t('attendance.form.subjectIdPlaceholder')}
                icon={BookOpen}
                required={true}
              />

              <FormInput
                name='date'
                type='date'
                formLabel={t('attendance.form.date')}
                icon={CalendarDays}
                required={true}
              />

              <FormInput
                name='status'
                type='select'
                formLabel={t('attendance.form.status')}
                items={statusOptions}
                icon={Activity}
                required={true}
              />
            </div>

            <FormSectionHeader
              icon={FileText}
              title={t('attendance.form.additionalInfo')}
            />

            <div className='grid grid-cols-1 gap-2'>
              <FormInput
                name='notes'
                type='textarea'
                formLabel={t('attendance.form.notes')}
                placeholder={t('attendance.form.notesPlaceholder')}
                icon={FileText}
              />
            </div>
          </div>
        </NForm>
      </div>
    </div>
  );
};

export default StudentAttendanceForm;
