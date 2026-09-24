'use client'

import React from 'react';
import { Card, NPageHeader, NPageHeaderActions } from 'najm-kit';
import { NSkeleton as Skeleton } from 'najm-kit';
import { Loader2, Save, Settings as SettingsIcon } from 'lucide-react';

import { NForm, NButton } from 'najm-kit';
import SchoolSection from './sections/SchoolSection';
import AcademicSection from './sections/AcademicSection';
import SystemSection from './sections/SystemSection';
import SecuritySection from './sections/SecuritySection';
import NotificationSection from './sections/NotificationSection';
import { settingsSchema } from '../config/settingsSchemas';
import { useAdminSettings } from '../hooks/useSettings';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { normalizeLocationValue } from 'najm-kit/location';
import { schoolApp, SCHOOL_DEFAULT_CURRENCY } from '@/najm.config';
import { schoolI18n } from '@sms/contracts/locales';
import { getCurrentAcademicYear } from '@/lib/utils';

// ─── Settings Skeleton ────────────────────────────────────────────────────────

const SectionBlock = ({ rows = 3, switches = false, wide = false }: { rows?: number; switches?: boolean; wide?: boolean }) => (
  <div className="flex w-full flex-col gap-3">
    <Skeleton className="h-4 w-28" />
    <div className={wide ? 'grid gap-2 sm:grid-cols-2 min-[1500px]:grid-cols-3' : 'grid gap-2 sm:grid-cols-2'}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          {switches
            ? <Skeleton className="h-8 w-full rounded-md" />
            : <><Skeleton className="h-3 w-20" /><Skeleton className="h-9 w-full rounded-md" /></>
          }
        </div>
      ))}
    </div>
  </div>
);


const SettingsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 gap-2 min-[1100px]:grid-cols-2 min-[1500px]:grid-cols-3">
    <Card className="flex min-w-0 flex-col gap-3 p-3">
      <SectionBlock rows={7} />
    </Card>
    <Card className="flex min-w-0 flex-col gap-3 p-3">
      <SectionBlock rows={8} />
    </Card>
    <Card className="flex min-w-0 flex-col gap-3 p-3">
      <SectionBlock rows={6} />
    </Card>
    <Card className="flex min-w-0 flex-col gap-3 p-3">
      <SectionBlock rows={6} switches />
    </Card>
    <Card className="flex min-w-0 flex-col gap-3 p-3 min-[1100px]:col-span-2">
      <SectionBlock rows={13} switches wide />
    </Card>
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
    schoolLocation: normalizeLocationValue({
      address: settings?.schoolAddress,
      latitude: settings?.schoolAddressLatitude,
      longitude: settings?.schoolAddressLongitude,
    }),
    schoolAddressPlaceId: settings?.schoolAddressPlaceId || null,
    schoolPhone: settings?.schoolPhone || '',
    schoolEmail: settings?.schoolEmail || '',
    currentAcademicYear: settings?.currentAcademicYear || getCurrentAcademicYear(),
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
    timeZone: settings?.timeZone || schoolApp.preferences.defaultTimeZone,
    language: settings?.language || schoolI18n.defaultLanguage,
    theme: settings?.theme === 'dark' ? ('dark' as const) : ('light' as const),
    dateFormat: settings?.dateFormat || 'MM/DD/YYYY' as const,
    timeFormat: settings?.timeFormat || '12' as const,
    currency: settings?.currency || SCHOOL_DEFAULT_CURRENCY,
  };

  const handleSubmit = async (data) => {
    const { schoolLocation, ...fields } = data;
    await updateSettings({
      ...fields,
      schoolAddress: schoolLocation.address,
      schoolAddressLatitude: schoolLocation.latitude ?? null,
      schoolAddressLongitude: schoolLocation.longitude ?? null,
    });
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
    <div className='flex flex-col gap-2 w-full min-h-0 overflow-y-auto'>
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

      <NForm
        id="settings-form"
        schema={settingsSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-2 min-[1100px]:grid-cols-2 min-[1500px]:grid-cols-3"
      >
        <Card className="flex min-w-0 flex-col gap-3 p-3">
          <SchoolSection />
        </Card>

        <Card className="flex min-w-0 flex-col gap-3 p-3">
          <AcademicSection />
        </Card>

        <Card className="flex min-w-0 flex-col gap-3 p-3">
          <SystemSection />
        </Card>

        <Card className="flex min-w-0 flex-col gap-3 p-3">
          <SecuritySection />
        </Card>

        <Card className="flex min-w-0 flex-col gap-3 p-3 min-[1100px]:col-span-2">
          <NotificationSection />
        </Card>
      </NForm>
    </div>
  );
};

export default SettingsForm;
