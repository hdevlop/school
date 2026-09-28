'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { NEmptyState } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import AlertCard from '@/features/Alerts/components/AlertCard';
import { useAlerts } from '@/features/Alerts/hooks/useAlerts';
import type { AlertRecord } from '@/features/Alerts/alertConstants';

/** The viewed year's alerts about this student that the reader may see. */
export default function AlertsTab({ studentId }: { studentId?: string }) {
  const { t } = useTranslation();
  const { alerts, isAlertsLoading } = useAlerts({ studentId, enabled: Boolean(studentId) });
  const rows = (alerts ?? []) as AlertRecord[];

  return (
    <div className="px-0 py-3">
      <h2 className="mb-4 text-xl font-semibold text-slate-900">{t('students.profile.tabs.alerts')}</h2>
      {isAlertsLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : rows.length ? (
        <div className="divide-y rounded-lg border">
          {rows.map((alert) => <AlertCard key={alert.id} data={alert} />)}
        </div>
      ) : (
        <NEmptyState surface="panel" icon={FEATURE_ICONS.alerts} title={t('alerts.page.emptyTitle')} className="min-h-48" />
      )}
    </div>
  );
}
