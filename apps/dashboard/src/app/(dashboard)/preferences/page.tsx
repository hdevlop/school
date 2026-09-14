'use client';

import { Bell } from 'lucide-react';
import { NPageHeader } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { PushOptIn } from '@/features/Notifications';

export default function PreferencesPage() {
  const { t } = useTranslation();
  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <NPageHeader icon={Bell} title={t('notifications.pushTitle')} />
      <div className="max-w-xl"><PushOptIn /></div>
    </div>
  );
}
