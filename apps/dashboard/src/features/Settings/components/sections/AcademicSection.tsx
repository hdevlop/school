'use client'

import React from 'react';
import { BookOpen, Users, BarChart3, Clock, Award, Calendar, ClipboardCheck } from 'lucide-react';
import { FormInput } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { Label } from 'najm-kit';
import {
  buildAttendanceModeOptions,
  buildCalendarSystemOptions,
} from '../../config/settingsOptions';

const AcademicSection: React.FC<{ activeYear?: string | null }> = ({ activeYear }) => {
  const { t } = useTranslation();

  const calendarSystemOptions = buildCalendarSystemOptions(t);

  const attendanceModeOptions = buildAttendanceModeOptions(t);

  return (
    <div className='flex flex-col gap-3'>
      <div className="flex items-center gap-2 font-semibold text-sm">
        <BookOpen className="h-5 w-5" />
        <Label className='text-lg'> {t('settings.academic.title')} </Label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {/* Shown, never chosen here: the active year moves only when a
            registered year is activated, and the server refuses any other. */}
        <div className="flex flex-col gap-1.5">
          <Label>{t('settings.school.currentAcademicYear')}</Label>
          <div className="flex h-9 items-center gap-2 rounded-md border bg-muted px-3 text-sm">
            <Calendar className="h-4 w-4 shrink-0" style={{ color: '#ec4899' }} aria-hidden />
            {activeYear || '—'}
          </div>
        </div>

        <FormInput
          name="attendanceRequirement"
          type="text"
          formLabel={t('settings.academic.attendanceRequirement')}
          icon={BarChart3}
          iconColor="#3b82f6"
          placeholder="75"
          required={true}
        />

        <FormInput
          name="maxClassSize"
          type="number"
          formLabel={t('settings.academic.maxClassSize')}
          icon={Users}
          iconColor="#10b981"
          required={true}
        />

        <FormInput
          name="gradingPeriods"
          type="number"
          formLabel={t('settings.academic.gradingPeriods')}
          icon={BookOpen}
          iconColor="#f59e0b"
          required={true}
        />

        <FormInput
          name="minimumPassingGrade"
          type="text"
          formLabel={t('settings.academic.minimumPassingGrade')}
          icon={Award}
          iconColor="#ef4444"
          placeholder="60"
          required={true}
        />

        <FormInput
          name="defaultExamDuration"
          type="number"
          formLabel={t('settings.academic.defaultExamDuration')}
          icon={Clock}
          iconColor="#8b5cf6"
          placeholder="120"
          required={true}
        />

        <FormInput
          name="calendarSystem"
          type="select"
          formLabel={t('settings.academic.calendarSystem')}
          placeholder={t('settings.academic.semesterPlaceholder')}
          icon={Calendar}
          items={calendarSystemOptions}
          iconColor="#3b82f6"
          required={true}
        />

        <FormInput
          name="attendanceMode"
          type="select"
          items={attendanceModeOptions}
          formLabel={t('settings.academic.attendanceMode') || 'Attendance Mode'}
          icon={ClipboardCheck}
          iconColor="#8b5cf6"
          required={true}
        />
      </div>
    </div>
  );
};

export default AcademicSection;
