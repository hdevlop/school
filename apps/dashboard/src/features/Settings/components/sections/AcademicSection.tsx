'use client'

import React from 'react';
import Link from 'next/link';
import { BookOpen, Users, BarChart3, Clock, Award, Calendar, CalendarCheck2, ClipboardCheck, ArrowUpRight } from 'lucide-react';
import { FormInput, NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import {
  buildAttendanceModeOptions,
  buildCalendarSystemOptions,
} from '../../config/settingsOptions';
import { SettingsGroup } from '../SettingsGroup';

const AcademicSection: React.FC<{ activeYear?: string | null; onLeave?: () => void }> = ({ activeYear, onLeave }) => {
  const { t } = useTranslation();

  const calendarSystemOptions = buildCalendarSystemOptions(t);

  const attendanceModeOptions = buildAttendanceModeOptions(t);

  return (
    <>

      <SettingsGroup
        title={t('settings.editor.groups.academicYear.title')}
        description={t('settings.editor.groups.academicYear.description')}
        className="gap-3 sm:grid-cols-1"
        action={(
          <NButton asChild variant="outline" size="sm">
            <Link href="/academic-year-migration" onClick={onLeave}>{t('academicYearMigration.title')}<ArrowUpRight className="h-4 w-4" aria-hidden /></Link>
          </NButton>
        )}
      >
        {/* Shown, never chosen here: the active year moves only when a
            registered year is activated, and the server refuses any other. */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarCheck2 className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t('settings.school.currentAcademicYear')}</p>
            <p className="text-lg font-semibold tabular-nums leading-tight">{activeYear || '—'}</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t('settings.editor.activeYearHint')}</p>
      </SettingsGroup>

      <SettingsGroup title={t('settings.editor.groups.grading.title')} description={t('settings.editor.groups.grading.description')}>
        <FormInput
          name="minimumPassingGrade"
          type="number"
          step={0.01}
          formLabel={t('settings.academic.minimumPassingGrade')}
          icon={Award}
          placeholder="60"
          required={true}
        />

        <FormInput
          name="gradingPeriods"
          type="number"
          formLabel={t('settings.academic.gradingPeriods')}
          icon={BookOpen}
          required={true}
        />

        <FormInput
          name="calendarSystem"
          type="select"
          formLabel={t('settings.academic.calendarSystem')}
          placeholder={t('settings.academic.semesterPlaceholder')}
          icon={Calendar}
          items={calendarSystemOptions}
          required={true}
        />
      </SettingsGroup>

      <SettingsGroup title={t('settings.editor.groups.attendance.title')} description={t('settings.editor.groups.attendance.description')}>
        <FormInput
          name="attendanceRequirement"
          type="number"
          step={0.01}
          formLabel={t('settings.academic.attendanceRequirement')}
          icon={BarChart3}
          placeholder="75"
          required={true}
        />

        <FormInput
          name="attendanceMode"
          type="select"
          items={attendanceModeOptions}
          formLabel={t('settings.academic.attendanceMode')}
          icon={ClipboardCheck}
          required={true}
        />
      </SettingsGroup>

      <SettingsGroup title={t('settings.editor.groups.classesExams.title')} description={t('settings.editor.groups.classesExams.description')}>
        <FormInput
          name="maxClassSize"
          type="number"
          formLabel={t('settings.academic.maxClassSize')}
          icon={Users}
          required={true}
        />

        <FormInput
          name="defaultExamDuration"
          type="number"
          formLabel={t('settings.academic.defaultExamDuration')}
          icon={Clock}
          placeholder="120"
          required={true}
        />
      </SettingsGroup>
    </>
  );
};

export default AcademicSection;
