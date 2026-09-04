'use client';

import { useTranslation } from 'najm-i18n/react';

export default function AcademicsTab() {
  const { t } = useTranslation();

  return (
    <div className="px-0 py-3">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('students.profile.academic')}</h2>
      <p className="text-slate-600">{t('students.profile.academicsPlaceholder')}</p>
    </div>
  );
}
