'use client'

import React from 'react';
import { Settings, Globe, Languages, Palette, Calendar, Clock, DollarSign } from 'lucide-react';
import { FormInput, NAJM_CURRENCY_OPTIONS } from 'najm-kit';

import { useTranslation } from 'najm-i18n/react';
import { Label } from 'najm-kit';
import { schoolI18n } from '@sms/contracts/locales';

const SystemSection: React.FC = () => {
  const { t } = useTranslation();

  const languageLabels = { en: 'English', fr: 'Français', ar: 'العربية', es: 'Español' };
  const languageOptions = schoolI18n.supportedLanguages.map((value) => ({
    value,
    label: languageLabels[value],
  }));

  // No `system` option: Najm Kit's mode is `light | dark`, and an option that
  // silently rendered as light would be a lie in the one place a user looks to
  // check it.
  const themeOptions = [
    { value: 'light', label: t('settings.system.lightTheme') || 'Light' },
    { value: 'dark', label: t('settings.system.darkTheme') || 'Dark' },
  ];

  const dateFormatOptions = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  ];

  const timeFormatOptions = [
    { value: '12', label: '12-hour' },
    { value: '24', label: '24-hour' },
  ];

  return (
    <div className='flex flex-col gap-3'>
      <div className="flex items-center gap-2 font-semibold text-sm">
        <Settings className="h-5 w-5" />
        <Label className='text-lg'> {t('settings.system.title')} </Label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <FormInput
          name="timeZone"
          type="timeZone"
          formLabel={t('settings.system.timeZone') || 'Time Zone'}
          icon={Globe}
          iconColor="#3b82f6"
          required={true}
        />

        <FormInput
          name="language"
          type="select"
          formLabel={t('settings.system.language') || 'Language'}
          items={languageOptions}
          icon={Languages}
          iconColor="#8b5cf6"
          required={true}
        />

        <FormInput
          name="theme"
          type="select"
          formLabel={t('settings.system.theme') || 'Theme'}
          items={themeOptions}
          icon={Palette}
          iconColor="#ec4899"
          required={true}
        />

        <FormInput
          name="dateFormat"
          type="select"
          formLabel={t('settings.system.dateFormat') || 'Date Format'}
          items={dateFormatOptions}
          icon={Calendar}
          iconColor="#10b981"
          required={true}
        />

        <FormInput
          name="timeFormat"
          type="select"
          formLabel={t('settings.system.timeFormat') || 'Time Format'}
          items={timeFormatOptions}
          icon={Clock}
          iconColor="#f59e0b"
          required={true}
        />

        <FormInput
          name="currency"
          type="select"
          formLabel={t('settings.system.currency') || 'Currency'}
          items={NAJM_CURRENCY_OPTIONS}
          icon={DollarSign}
          iconColor="#ef4444"
          required={true}
        />
      </div>
    </div>
  );
};

export default SystemSection;
