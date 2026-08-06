'use client';

import { useTranslation } from '@/hooks/useLanguage';

export default function AlertsTab() {
  const { t } = useTranslation();

  return (
    <div className="px-0 py-3">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('students.profile.tabs.alerts')}</h2>
      <p className="text-slate-600">{t('students.profile.alertsPlaceholder')}</p>
    </div>
  );
}
