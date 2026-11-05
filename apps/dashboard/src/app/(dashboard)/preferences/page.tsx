'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';

import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { NPageHeaderActions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { PushOptIn } from '@/features/Notifications';
import { ViewingYearSelector } from '@/features/AcademicYears/components/ViewingYearSelector';

export default function PreferencesPage() {
  const { t } = useTranslation();
  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <NPageHeader icon={FEATURE_ICONS.notifications} title={t('notifications.pushTitle')}>
        <NPageHeaderActions><ViewingYearSelector /></NPageHeaderActions>
      </NPageHeader>
      <div className="max-w-xl"><PushOptIn /></div>
    </div>
  );
}
