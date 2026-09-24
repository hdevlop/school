'use client'

import React from 'react';
import { BookOpen, Users, BarChart3, Clock, Award, Calendar, ClipboardCheck } from 'lucide-react';
import { FormInput } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { Label } from 'najm-kit';
import { useWatch } from 'react-hook-form';
import { getCurrentAcademicYear } from '@/lib/utils';
import {
  buildAttendanceModeOptions,
  buildCalendarSystemOptions,
} from '../../config/settingsOptions';

const AcademicSection: React.FC = () => {
  const { t } = useTranslation();

  const calendarSystemOptions = buildCalendarSystemOptions(t);

  const attendanceModeOptions = buildAttendanceModeOptions(t);
  const selectedYear = useWatch({ name: 'currentAcademicYear' });
  const currentStartYear = Number(getCurrentAcademicYear().slice(0, 4));
  const academicYears = Array.from(new Set([
    ...Array.from({ length: 5 }, (_, index) => currentStartYear + 1 - index),
    Number(selectedYear?.slice(0, 4)),
  ].filter(Number.isInteger))).sort((a, b) => b - a);

  return (
    <div className='flex flex-col gap-3'>
      <div className="flex items-center gap-2 font-semibold text-sm">
        <BookOpen className="h-5 w-5" />
        <Label className='text-lg'> {t('settings.academic.title')} </Label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <FormInput
          name="currentAcademicYear"
          type="select"
          formLabel={t('settings.school.currentAcademicYear')}
          icon={Calendar}
          iconColor="#ec4899"
          items={academicYears.map((year) => ({ value: `${year}-${year + 1}`, label: `${year}-${year + 1}` }))}
          required={true}
        />

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
