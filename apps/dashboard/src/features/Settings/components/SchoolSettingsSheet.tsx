'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useFormState, type Control } from 'react-hook-form';
import { AlertCircle, BookOpen, Building2, Check, Circle, RotateCcw, Save, Settings as SettingsIcon } from 'lucide-react';
import { NButton, NConfirmDialog, NForm, NSheet, NSkeleton as Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, useNForm } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { normalizeLocationValue } from 'najm-kit/location';
import { schoolI18n } from '@sms/contracts/locales';

import { schoolApp, SCHOOL_DEFAULT_CURRENCY } from '@/najm.config';
import SchoolSection from './sections/SchoolSection';
import AcademicSection from './sections/AcademicSection';
import SystemSection from './sections/SystemSection';
import SecuritySection from './sections/SecuritySection';
import NotificationSection from './sections/NotificationSection';
import { settingsSchema } from '../config/settingsSchemas';
import { useAdminSettings } from '../hooks/useSettings';

const SETTINGS_FORM_ID = 'settings-form';

const tabs = [
  { id: 'school', label: 'settings.editor.schoolTab', icon: Building2 },
  { id: 'academic', label: 'settings.editor.academicTab', icon: BookOpen },
  { id: 'system', label: 'settings.editor.generalTab', icon: SettingsIcon },
] as const;

type SettingsTab = typeof tabs[number]['id'];

type AdminSettings = ReturnType<typeof useAdminSettings>['settings'];

// The API returns numeric columns as strings ("85.00"); the form holds numbers.
function settingsFormDefaults(settings: AdminSettings) {
  return {
    schoolName: settings?.schoolName || '',
    schoolLocation: normalizeLocationValue({
      address: settings?.schoolAddress,
      latitude: settings?.schoolAddressLatitude,
      longitude: settings?.schoolAddressLongitude,
    }),
    schoolAddressPlaceId: settings?.schoolAddressPlaceId || null,
    schoolPhone: settings?.schoolPhone || '',
    schoolEmail: settings?.schoolEmail || '',
    attendanceRequirement: Number(settings?.attendanceRequirement ?? 75),
    attendanceMode: (settings?.attendanceMode as 'daily' | 'per_class') || 'daily',
    maxClassSize: Number(settings?.maxClassSize ?? 34),
    minimumPassingGrade: Number(settings?.minimumPassingGrade ?? 60),
    defaultExamDuration: Number(settings?.defaultExamDuration ?? 120),
    calendarSystem: settings?.calendarSystem || 'SEMESTER' as const,
    gradingPeriods: Number(settings?.gradingPeriods ?? 4),
    schoolStartTime: settings?.schoolStartTime || '08:00',
    schoolEndTime: settings?.schoolEndTime || '15:00',
    lunchBreakDuration: Number(settings?.lunchBreakDuration ?? 30),
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
}

type SettingsFormDefaults = ReturnType<typeof settingsFormDefaults>;

function SettingsFooter({ control, ready, saveFailed, onDiscard }: {
  control: Control<any>;
  ready: boolean;
  saveFailed: boolean;
  onDiscard: () => void;
}) {
  const { t } = useTranslation();
  const { isDirty, isSubmitting, errors } = useFormState({ control });
  const hasErrors = Object.keys(errors).length > 0;
  const failed = hasErrors || saveFailed;
  const StatusIcon = failed ? AlertCircle : isDirty ? Circle : Check;
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2 text-sm" role="status" aria-live="polite">
        <StatusIcon className={'h-4 w-4 shrink-0 ' + (failed ? 'text-destructive' : isDirty ? 'fill-primary text-primary' : 'text-muted-foreground')} aria-hidden />
        <span className={'truncate ' + (failed ? 'text-destructive' : isDirty ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          {saveFailed ? t('settings.editor.saveFailed') : hasErrors ? t('settings.editor.validationErrors') : isDirty ? t('settings.editor.unsaved') : t('settings.editor.upToDate')}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <NButton
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('settings.editor.discard')}
          title={t('settings.editor.discard')}
          disabled={!ready || !isDirty || isSubmitting}
          onClick={onDiscard}
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
        </NButton>
        <NButton type="submit" form={SETTINGS_FORM_ID} disabled={!ready || !isDirty || isSubmitting} loading={isSubmitting} loadingText={t('common.saving')}>
          <Save className="h-4 w-4" aria-hidden />{t('settings.saveSettings')}
        </NButton>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4 pt-1" aria-busy="true">
      {[4, 3].map((rows, index) => (
        <div key={index} className="flex flex-col gap-4 py-2">
          <div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-64" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-10 w-full rounded-md" /></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The school settings, edited in one sheet with one form: a single save writes
 * every tab at once, and closing with unsaved changes asks first.
 *
 * `onLeave` closes the sheet when a link inside it navigates away. It is
 * separate from `onOpenChange` so the `/settings` route, which closes by
 * navigating home, does not race the link's own navigation.
 */
export function SchoolSettingsSheet({ open, onOpenChange, onLeave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeave?: () => void;
}) {
  const { t } = useTranslation();
  const admin = useAdminSettings(open);
  const { isSettingsLoading, isError, refetch, updateSettings, isUpdating } = admin;
  // Until the query has data the CRUD hook hands back a fresh `[]` on every
  // render; unwrapped, that is `undefined`, and the loaded record keeps its
  // identity, so the reset below runs once per load instead of every render.
  const settings: AdminSettings = Array.isArray(admin.settings) ? admin.settings[0] : admin.settings;
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('school');
  const handledSubmit = useRef(0);
  const form = useNForm({ schema: settingsSchema, defaultValues: settingsFormDefaults(settings) });
  const { errors, submitCount, isDirty } = form.formState;
  const ready = Boolean(settings);

  // Follow the saved values while nothing is being edited: the first load,
  // and the refetch after a save or a change made elsewhere.
  useEffect(() => {
    if (settings && !form.formState.isDirty) form.reset(settingsFormDefaults(settings));
  }, [form, settings]);

  // A refused save opens the tab holding the first invalid field.
  useEffect(() => {
    if (submitCount === handledSubmit.current) return;
    handledSubmit.current = submitCount;
    const field = Object.keys(errors)[0];
    if (!field) return;
    const input = document.querySelector<HTMLElement>(`#${SETTINGS_FORM_ID} [name="${field}"], #${SETTINGS_FORM_ID} [name^="${field}."]`);
    const tab = input?.closest('[data-settings-section]')?.getAttribute('data-settings-section') ?? (field.startsWith('school') ? 'school' : null);
    if (!tab) return;
    setActiveTab(tab as SettingsTab);
    const frame = requestAnimationFrame(() => input?.focus());
    return () => cancelAnimationFrame(frame);
  }, [errors, submitCount]);

  const discard = () => {
    form.reset(settingsFormDefaults(settings));
    setSaveFailed(false);
  };

  const closeNow = () => {
    discard();
    setConfirmClose(false);
    onOpenChange(false);
  };

  const requestOpenChange = (next: boolean) => {
    if (next) return onOpenChange(true);
    if (isDirty) return setConfirmClose(true);
    closeNow();
  };

  const handleSubmit = async (data: SettingsFormDefaults) => {
    setSaveFailed(false);
    const { schoolLocation, ...fields } = data;
    try {
      await updateSettings({
        ...fields,
        schoolAddress: schoolLocation.address,
        schoolAddressLatitude: schoolLocation.latitude ?? null,
        schoolAddressLongitude: schoolLocation.longitude ?? null,
      });
      form.reset(data);
    } catch {
      // The mutation shows the server error; retain the draft for a retry.
      setSaveFailed(true);
    }
  };

  return (
    <>
      <NSheet
        open={open}
        onOpenChange={requestOpenChange}
        icon={SettingsIcon}
        title={t('navigation.settings')}
        description={t('settings.editor.description')}
        width={640}
        classNames={{ body: 'px-4 pt-0', content: 'bg-background' }}
        footer={<SettingsFooter control={form.control} ready={ready} saveFailed={saveFailed} onDiscard={discard} />}
      >
        <NForm id={SETTINGS_FORM_ID} schema={settingsSchema} form={form} onSubmit={handleSubmit} className="gap-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)} className="gap-0">
            <div className="sticky top-0 z-10 -mx-4 bg-background px-4 pb-2 pt-3">
              <TabsList aria-label={t('settings.editor.sections')} className="grid h-auto w-full grid-cols-3">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <TabsTrigger key={id} value={id} className="min-h-9 min-w-0 gap-2">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{t(label)}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {isSettingsLoading && !settings ? <SettingsSkeleton /> : !settings ? (
              <div role="alert" className="flex flex-col items-start gap-3 py-6 text-sm">
                <p className="flex items-center gap-2 text-destructive"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden />{t('settings.editor.loadFailed')}</p>
                <NButton type="button" variant="outline" onClick={() => refetch()}>{t('academicYearMigration.retry')}</NButton>
              </div>
            ) : (
              <fieldset disabled={isUpdating || form.formState.isSubmitting} className="min-w-0">
                {isError && (
                  <div role="alert" className="flex flex-wrap items-center gap-2 pt-2 text-sm text-destructive">
                    <p>{t('settings.editor.loadFailed')}</p>
                    <NButton type="button" variant="ghost" size="sm" onClick={() => refetch()}>{t('academicYearMigration.retry')}</NButton>
                  </div>
                )}
                {tabs.map(({ id }) => (
                  <TabsContent
                    key={id}
                    value={id}
                    forceMount
                    data-settings-section={id}
                    className="m-0 flex flex-col divide-y divide-border/60 rounded-md data-[state=inactive]:hidden"
                  >
                    {id === 'school' && <SchoolSection />}
                    {id === 'academic' && <AcademicSection activeYear={settings?.currentAcademicYear} onLeave={onLeave} />}
                    {id === 'system' && <><SystemSection /><SecuritySection /><NotificationSection /></>}
                  </TabsContent>
                ))}
              </fieldset>
            )}
          </Tabs>
        </NForm>
      </NSheet>
      <NConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title={t('settings.editor.discardTitle')}
        description={t('settings.editor.discardDescription')}
        confirmLabel={t('settings.editor.discard')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onConfirm={closeNow}
      />
    </>
  );
}
