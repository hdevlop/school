'use client'

import React from 'react';
import { Building2, CalendarDays, FileBadge, Mail, MapPin, Phone, Clock, Hamburger, Printer } from 'lucide-react';
import { FormInput } from 'najm-kit';
import { FormLocationInput } from 'najm-kit/location';

import { useTranslation } from 'najm-i18n/react';
import { useFormContext, useWatch } from 'react-hook-form';
import { SettingsGroup } from '../SettingsGroup';

const SchoolSection: React.FC = () => {
  const { t } = useTranslation();
  const { setValue } = useFormContext();
  const schoolLocation = useWatch({ name: 'schoolLocation' });
  const schoolPlaceId = useWatch({ name: 'schoolAddressPlaceId' });

  return (
    <>

      <SettingsGroup title={t('settings.editor.groups.identity.title')} description={t('settings.editor.groups.identity.description')}>
        <div className="sm:col-span-2">
          <FormInput
            name="schoolName"
            type="text"
            formLabel={t('settings.school.schoolName')}
            icon={Building2}
            placeholder={t('settings.school.namePlaceholder')}
            required={true}
          />
        </div>

        <FormInput
          name="schoolEmail"
          type="text"
          formLabel={t('settings.school.schoolEmail')}
          icon={Mail}
          placeholder="contact@school.ma"
          inputMode="email"
          required={true}
        />

        <FormInput
          name="schoolPhone"
          type="phone"
          formLabel={t('settings.school.schoolPhone')}
          icon={Phone}
          placeholder="+212600000000"
          required={true}
        />

        <div className="sm:col-span-2">
          <FormLocationInput
            name="schoolLocation"
            formLabel={t('settings.school.schoolAddress')}
            placeholder={t('settings.editor.addressPlaceholder')}
            required
            classNames={{ status: 'hidden' }}
            providerMeta={schoolLocation && schoolPlaceId
              ? { provider: 'google', placeId: schoolPlaceId, ...schoolLocation }
              : null}
            onProviderMetaChange={(meta) => setValue('schoolAddressPlaceId', meta?.placeId ?? null, { shouldDirty: true })}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup title={t('settings.editor.groups.officialIdentity.title')} description={t('settings.editor.groups.officialIdentity.description')}>
        <div className="sm:col-span-2">
          <FormInput name="schoolNameAr" type="text" formLabel={t('settings.school.schoolNameAr')} icon={Building2} dir="rtl" lang="ar" />
        </div>
        <div className="sm:col-span-2">
          <FormInput name="schoolAddressAr" type="text" formLabel={t('settings.school.schoolAddressAr')} icon={MapPin} dir="rtl" lang="ar" />
        </div>
        {[1, 2, 3].map((number) => (
          <FormInput key={number} name={`schoolPhones.${number - 1}`} type="text" formLabel={t(`settings.school.officialPhone${number}`)}
            icon={Phone} placeholder="0522000000" inputMode="tel" dir="ltr" />
        ))}
        <FormInput name="schoolLicenseNumber" type="text" formLabel={t('settings.school.licenseNumber')} icon={FileBadge} dir="ltr" />
        <FormInput name="schoolLicenseDate" type="date" formLabel={t('settings.school.licenseDate')} icon={CalendarDays} />
      </SettingsGroup>

      <SettingsGroup title={t('settings.receipts.title')} description={t('settings.receipts.description')}>
        <FormInput
          name="receiptLanguage"
          type="select"
          formLabel={t('settings.receipts.language')}
          items={[{ value: 'fr', label: 'Français' }, { value: 'ar', label: 'العربية' }]}
          icon={Printer}
          required
        />
      </SettingsGroup>

      <SettingsGroup title={t('settings.editor.groups.schoolDay.title')} description={t('settings.editor.groups.schoolDay.description')}>
        <FormInput
          name="schoolStartTime"
          type="time"
          formLabel={t('settings.school.schoolStartTime')}
          icon={Clock}
          required={true}
        />

        <FormInput
          name="schoolEndTime"
          type="time"
          formLabel={t('settings.school.schoolEndTime')}
          icon={Clock}
          required={true}
        />

        <FormInput
          name="lunchBreakDuration"
          type="number"
          formLabel={t('settings.school.lunchBreakDuration')}
          icon={Hamburger}
          required={true}
        />
      </SettingsGroup>
    </>
  );
};

export default SchoolSection;
