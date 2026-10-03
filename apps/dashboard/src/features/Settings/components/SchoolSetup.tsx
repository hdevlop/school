'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, CalendarRange, DollarSign, Globe, Languages, Loader2, LogOut, Mail, Phone, School } from 'lucide-react';
import { Card, FormInput, NAJM_CURRENCY_OPTIONS, NButton, NForm } from 'najm-kit';
import { clearNajmUiPreferences } from 'najm-kit/server';
import { SignOutButton } from 'najm-auth/client/react';
import { useTranslation } from 'najm-i18n/react';
import { schoolI18n } from '@sms/contracts/locales';

import { schoolApp, SCHOOL_DEFAULT_CURRENCY } from '@/najm.config';
import { isConflictError } from '@/services/apiError';
import { schoolSetupSchema, type SchoolSetupValues } from '../config/settingsSchemas';
import { buildSetupAcademicYearOptions } from '../config/settingsOptions';
import { useInstallSchool } from '../hooks/useSettings';

const languageLabels = { en: 'English', fr: 'Français', ar: 'العربية', es: 'Español' };

/**
 * Shown in place of the dashboard while the school has no settings: without
 * them there is no active academic year and every year-scoped page fails.
 * Only administrators can install them; everyone else is told to wait.
 */
const SchoolSetup: React.FC<{ canInstall: boolean }> = ({ canInstall }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { installSchool, isInstalling } = useInstallSchool();

  const yearOptions = buildSetupAcademicYearOptions();
  const defaultValues: SchoolSetupValues = {
    schoolName: '',
    schoolPhone: '',
    schoolEmail: '',
    currentAcademicYear: yearOptions[0].value,
    timeZone: schoolApp.preferences.defaultTimeZone,
    language: schoolI18n.defaultLanguage,
    currency: SCHOOL_DEFAULT_CURRENCY,
  };
  const languageOptions = schoolI18n.supportedLanguages.map((value) => ({ value, label: languageLabels[value] }));

  const handleSubmit = async (data: SchoolSetupValues) => {
    try {
      await installSchool(data);
    } catch (error) {
      // The request has already shown its refusal. A conflict means another
      // administrator or tab installed the school first, so this form's job is
      // done; any other refusal keeps the form open for a correction.
      if (!isConflictError(error)) return;
    }
    await queryClient.invalidateQueries();
    // The layout decides between this screen and the dashboard on the server.
    router.refresh();
  };

  const signOut = (
    <SignOutButton
      onSuccess={async () => {
        await clearNajmUiPreferences();
        router.push('/login');
      }}
    >
      <NButton type="button" variant="ghost">
        <LogOut className="h-4 w-4 mr-2" />
        {t('navigation.logout')}
      </NButton>
    </SignOutButton>
  );

  return (
    <main className="flex min-h-dvh w-full items-center justify-center overflow-y-auto bg-background p-4">
      <Card className="flex w-full max-w-xl flex-col gap-4 p-6">
        <div className="flex items-start gap-3">
          <School className="h-8 w-8 shrink-0 text-primary" />
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">
              {canInstall ? t('settings.setup.title') : t('settings.setup.notReadyTitle')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {canInstall ? t('settings.setup.description') : t('settings.setup.notReadyDescription')}
            </p>
          </div>
        </div>

        {canInstall ? (
          <NForm
            id="school-setup-form"
            schema={schoolSetupSchema}
            defaultValues={defaultValues}
            onSubmit={handleSubmit}
            className="flex flex-col gap-3"
          >
            <FormInput
              name="schoolName"
              type="text"
              formLabel={t('settings.school.schoolName')}
              icon={Building2}
              iconColor="#3b82f6"
              placeholder={t('settings.school.namePlaceholder')}
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormInput
                name="schoolPhone"
                type="text"
                formLabel={t('settings.school.schoolPhone')}
                icon={Phone}
                iconColor="#f59e0b"
                placeholder="+212600000000"
                required
              />
              <FormInput
                name="schoolEmail"
                type="text"
                formLabel={t('settings.school.schoolEmail')}
                icon={Mail}
                iconColor="#8b5cf6"
                placeholder="info@myschool.edu"
              />
            </div>
            <FormInput
              name="currentAcademicYear"
              type="select"
              formLabel={t('settings.setup.academicYear')}
              items={yearOptions}
              icon={CalendarRange}
              iconColor="#10b981"
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormInput
                name="timeZone"
                type="timeZone"
                formLabel={t('settings.system.timeZone')}
                icon={Globe}
                iconColor="#3b82f6"
                required
              />
              <FormInput
                name="currency"
                type="select"
                formLabel={t('settings.system.currency')}
                items={NAJM_CURRENCY_OPTIONS}
                icon={DollarSign}
                iconColor="#ef4444"
                required
              />
              <FormInput
                name="language"
                type="select"
                formLabel={t('settings.system.language')}
                items={languageOptions}
                icon={Languages}
                iconColor="#8b5cf6"
                required
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {signOut}
              <NButton type="submit" disabled={isInstalling}>
                {isInstalling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('settings.setup.submit')}
              </NButton>
            </div>
          </NForm>
        ) : (
          <div className="flex justify-end">{signOut}</div>
        )}
      </Card>
    </main>
  );
};

export default SchoolSetup;
