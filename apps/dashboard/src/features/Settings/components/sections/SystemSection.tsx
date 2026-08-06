'use client'

import React from 'react';
import { Settings, Globe, Languages, Palette, Calendar, Clock, DollarSign } from 'lucide-react';
import { FormInput } from 'najm-kit';

import { useTranslation } from '@/hooks/useLanguage';
import { Label } from 'najm-kit';

const SystemSection: React.FC = () => {
  const { t } = useTranslation();

  const timeZoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Africa/Casablanca', label: 'Casablanca' },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
    { value: 'ar', label: 'العربية' },
    { value: 'es', label: 'Español' },
  ];

  const themeOptions = [
    { value: 'light', label: t('settings.system.lightTheme') || 'Light' },
    { value: 'dark', label: t('settings.system.darkTheme') || 'Dark' },
    { value: 'system', label: t('settings.system.systemTheme') || 'System' },
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

  const currencyOptions = [
    { value: 'USD', label: 'USD - US Dollar ($)' },
    { value: 'EUR', label: 'EUR - Euro (€)' },
    { value: 'GBP', label: 'GBP - British Pound (£)' },
    { value: 'CAD', label: 'CAD - Canadian Dollar (C$)' },
    { value: 'AUD', label: 'AUD - Australian Dollar (A$)' },
    { value: 'JPY', label: 'JPY - Japanese Yen (¥)' },
    { value: 'CNY', label: 'CNY - Chinese Yuan (¥)' },
    { value: 'INR', label: 'INR - Indian Rupee (₹)' },
    { value: 'MAD', label: 'MAD - Moroccan Dirham (د.م.)' },
    { value: 'AED', label: 'AED - UAE Dirham (د.إ)' },
    { value: 'SAR', label: 'SAR - Saudi Riyal (﷼)' },
    { value: 'EGP', label: 'EGP - Egyptian Pound (E£)' },
  ];

  return (
    <div className='flex flex-col gap-4'>
      <div className="flex items-center gap-2 font-semibold text-sm">
        <Settings className="h-5 w-5" />
        <Label className='text-lg'> {t('settings.system.title')} </Label>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        <FormInput
          name="timeZone"
          type="select"
          formLabel={t('settings.system.timeZone') || 'Time Zone'}
          items={timeZoneOptions}
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
          items={currencyOptions}
          icon={DollarSign}
          iconColor="#ef4444"
          required={true}
        />
      </div>
    </div>
  );
};

export default SystemSection;