'use client'

import React from 'react';
import { Card, NPageHeader, NPageHeaderActions } from 'najm-kit';
import { NSkeleton as Skeleton } from 'najm-kit';
import { Loader2, Save, Settings as SettingsIcon } from 'lucide-react';

import { NForm, NButton } from 'najm-kit';
import DatabaseSection from './sections/DatabaseSection';
import SchoolSection from './sections/SchoolSection';
import AcademicSection from './sections/AcademicSection';
import SystemSection from './sections/SystemSection';
import SecuritySection from './sections/SecuritySection';
import NotificationSection from './sections/NotificationSection';
import { Separator } from 'najm-kit';
import { settingsSchema } from '@/lib/validations';
import { useAdminSettings } from '../hooks/useSettings';
import { useTranslation } from '@/hooks/useLanguage';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

// ─── Settings Skeleton ────────────────────────────────────────────────────────

const SectionBlock = ({ rows = 3, hasLabel = true }: { rows?: number; hasLabel?: boolean }) => (
  <div className="flex flex-col gap-3 w-full">
    {hasLabel && <Skeleton className="h-4 w-28" />}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    ))}
  </div>
);


const SettingsSkeleton: React.FC = () => (
  <div className="grid grid-cols-8 gap-2">
    {/* Database column */}
    <Card className="flex flex-col p-4 gap-4 col-span-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="h-3 w-48" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-16" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
        <Skeleton className="h-3 w-40" />
      </div>
    </Card>

    {/* Main form columns */}
    <div className="col-span-6 grid grid-cols-6 gap-2">
      {/* Left big card */}
      <Card className="flex flex-col p-4 gap-4 col-span-4">
        <SectionBlock rows={4} />
        <Skeleton className="h-px w-full" />
        <SectionBlock rows={4} />
        <Skeleton className="h-px w-full" />
        <SectionBlock rows={3} />
      </Card>

      {/* Right small card */}
      <Card className="flex flex-col p-4 gap-4 col-span-2">
        <SectionBlock rows={3} />
        <Skeleton className="h-px w-full" />
        <SectionBlock rows={5} />
      </Card>
    </div>
  </div>
);

const SettingsForm: React.FC = () => {
  const { t } = useTranslation();

  const {
    settings,
    isSettingsLoading,
    updateSettings,
    isUpdating,
  } = useAdminSettings()

  const defaultValues = {
    schoolName: settings?.schoolName || '',
    schoolAddress: settings?.schoolAddress || '',
    schoolAddressPlaceId: settings?.schoolAddressPlaceId || null,
    schoolAddressLatitude: settings?.schoolAddressLatitude ?? null,
    schoolAddressLongitude: settings?.schoolAddressLongitude ?? null,
    schoolPhone: settings?.schoolPhone || '',
    schoolEmail: settings?.schoolEmail || '',
    currentAcademicYear: settings?.currentAcademicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    gradingScale: settings?.gradingScale || '',
    attendanceRequirement: settings?.attendanceRequirement || 75,
    attendanceMode: (settings?.attendanceMode as 'daily' | 'per_class') || 'daily',
    maxClassSize: settings?.maxClassSize || 34,
    minimumPassingGrade: settings?.minimumPassingGrade || 60,
    defaultExamDuration: settings?.defaultExamDuration || 120,
    calendarSystem: settings?.calendarSystem || 'SEMESTER' as const,
    gradingPeriods: settings?.gradingPeriods || 4,
    schoolStartTime: settings?.schoolStartTime || '08:00',
    schoolEndTime: settings?.schoolEndTime || '15:00',
    lunchBreakDuration: settings?.lunchBreakDuration || 30,
    academicAlerts: settings?.academicAlerts ?? true,
    attendanceAlerts: settings?.attendanceAlerts ?? true,
    eventAlerts: settings?.eventAlerts ?? true,
    homeworkAlerts: settings?.homeworkAlerts ?? true,
    feesReminder: settings?.feesReminder ?? true,
    feesOverdueAlerts: settings?.feesOverdueAlerts ?? true,
    emailNotifications: settings?.emailNotifications ?? true,
    smsNotifications: settings?.smsNotifications ?? false,
    parentNotifications: settings?.parentNotifications ?? true,
    lowGradeAlerts: settings?.lowGradeAlerts ?? true,
    allowLateSubmission: settings?.allowLateSubmission ?? true,
    examResultsAlerts: settings?.examResultsAlerts ?? true,
    disciplinaryAlerts: settings?.disciplinaryAlerts ?? true,
    achievementAlerts: settings?.achievementAlerts ?? true,
    twoFactorEnabled: settings?.twoFactorEnabled ?? false,
    sessionTimeout: settings?.sessionTimeout || '60',
    passwordRequireSymbols: settings?.passwordRequireSymbols ?? true,
    loginNotifications: settings?.loginNotifications ?? true,
    parentAccessEnabled: settings?.parentAccessEnabled ?? true,
    teacherAccessEnabled: settings?.teacherAccessEnabled ?? true,
    studentAccessEnabled: settings?.studentAccessEnabled ?? true,
    timeZone: settings?.timeZone || 'UTC',
    language: settings?.language || 'en' as const,
    theme: settings?.theme || 'system' as const,
    dateFormat: settings?.dateFormat || 'MM/DD/YYYY' as const,
    timeFormat: settings?.timeFormat || '12' as const,
    currency: settings?.currency || 'USD',
  };

  const handleSubmit = async (data) => {
    await updateSettings(data);
  };

  if (isSettingsLoading) {
    return (
      <div className='flex flex-col gap-2 w-full'>
        <NPageHeader
          icon={SettingsIcon}
          title={t('navigation.settings')}
        >
          <NPageHeaderActions>
            <PageHeaderGlobalActions />
          </NPageHeaderActions>
        </NPageHeader>
        <SettingsSkeleton />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-2 w-full'>
      <NPageHeader
        icon={SettingsIcon}
        title={t('navigation.settings')}
      >
        <NPageHeaderActions>
          <NButton
            type="submit"
            form="settings-form"
            disabled={isUpdating}
          >
            {isUpdating
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
              : <><Save className="h-4 w-4 mr-2" />Save Settings</>
            }
          </NButton>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <div className='grid grid-cols-8 gap-2'>
        {/* DatabaseSection is intentionally outside NForm — its buttons must not submit settings */}
        <div className="flex flex-col col-span-2 gap-2">
          <DatabaseSection />
        </div>

        <NForm
          id="settings-form"
          schema={settingsSchema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          className="col-span-6 grid grid-cols-6 gap-2"
        >
          <Card className="flex p-4 gap-3 col-span-4">
            <SchoolSection />
            <Separator className='bg-tertiary' />
            <AcademicSection />
            <Separator className='bg-tertiary' />
            <SystemSection />
          </Card>

          <Card className="flex p-4 gap-3 col-span-2">
            <SecuritySection />
            <Separator className='bg-tertiary' />
            <NotificationSection />
          </Card>
        </NForm>
      </div>
    </div>
  );
};

export default SettingsForm;
