'use client'

import React from 'react';
import { Building2, Mail, Phone, Clock, Hamburger } from 'lucide-react';
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
          type="text"
          formLabel={t('settings.school.schoolPhone')}
          icon={Phone}
          placeholder="+212600000000"
          inputMode="tel"
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
