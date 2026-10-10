'use client'

import React from 'react';
import { Globe, Languages, Palette, Calendar, Clock, DollarSign } from 'lucide-react';
import { FormInput, NAJM_CURRENCY_OPTIONS } from 'najm-kit';

import { useTranslation } from 'najm-i18n/react';
import { schoolI18n } from '@sms/contracts/locales';
import { SETTINGS_DATE_FORMAT_VALUES } from '../../config/dateTimeFormats';
import { SettingsGroup } from '../SettingsGroup';

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
    { value: 'light', label: t('settings.system.lightTheme') },
    { value: 'dark', label: t('settings.system.darkTheme') },
  ];

  const dateFormatOptions = SETTINGS_DATE_FORMAT_VALUES.map((value) => ({ value, label: value }));

  const timeFormatOptions = [
    { value: '12', label: t('settings.system.timeFormat12') },
    { value: '24', label: t('settings.system.timeFormat24') },
  ];

  return (
    <>

      <SettingsGroup title={t('settings.editor.groups.languageRegion.title')} description={t('settings.editor.groups.languageRegion.description')}>
        <FormInput
          name="language"
          type="select"
          formLabel={t('settings.system.language')}
          items={languageOptions}
          icon={Languages}
          required={true}
        />

        <FormInput
          name="currency"
          type="select"
          formLabel={t('settings.system.currency')}
          items={NAJM_CURRENCY_OPTIONS}
          icon={DollarSign}
          required={true}
        />

        <div className="sm:col-span-2">
          <FormInput
            name="timeZone"
            type="timeZone"
            formLabel={t('settings.system.timeZone')}
            icon={Globe}
            required={true}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup title={t('settings.editor.groups.display.title')} description={t('settings.editor.groups.display.description')}>
        <FormInput
          name="theme"
          type="select"
          formLabel={t('settings.system.theme')}
          items={themeOptions}
          icon={Palette}
          required={true}
        />

        <FormInput
          name="dateFormat"
          type="select"
          formLabel={t('settings.system.dateFormat')}
          items={dateFormatOptions}
          icon={Calendar}
          required={true}
        />

        <FormInput
          name="timeFormat"
          type="select"
          formLabel={t('settings.system.timeFormat')}
          items={timeFormatOptions}
          icon={Clock}
          required={true}
        />
      </SettingsGroup>
    </>
  );
};

export default SystemSection;
