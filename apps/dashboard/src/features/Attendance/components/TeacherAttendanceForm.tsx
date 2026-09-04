'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import React from 'react'
import { CalendarDays, FileText, User, Activity } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { useTranslation } from 'najm-i18n/react'
import { z } from 'zod'

const staffAttendanceFormSchema = z.object({
  staffId: z.preprocess((val) => val ?? "", z.string().min(1, "Staff ID is required")),
  date: z.string().regex(/^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/, 'Date must be in YYYY-MM-DD format'),
  status: z.enum(['present', 'absent', 'late']).default('present'),
  notes: z.string().max(500, 'Notes too long').optional(),
});

const statusOptions = [
  { label: 'Present', value: 'present' },
  { label: 'Absent', value: 'absent' },
  { label: 'Late', value: 'late' },
];

const TeacherAttendanceForm = ({ attendanceData = null }) => {
  const { t } = useTranslation();
  const { pop } = useDialog();

  const defaultValues = {
    ...(attendanceData?.id && { id: attendanceData.id }),
    staffId: attendanceData?.staffId || '',
    date: attendanceData?.date || new Date().toISOString().split('T')[0],
    status: attendanceData?.status || 'present',
    notes: attendanceData?.notes || '',
  };

  const handleSubmit = async (formData) => {
    pop({ ...formData, type: 'staff' });
  };

  return (
    <div className='flex flex-col justify-center items-center w-full'>
      <div className='flex flex-col h-full w-full gap-4'>
        <NForm
          id='attendance-form'
          schema={staffAttendanceFormSchema}
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
                name='staffId'
                type='text'
                formLabel={t('attendance.form.staffId')}
                placeholder={t('attendance.form.staffIdPlaceholder')}
                icon={User}
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

export default TeacherAttendanceForm;
