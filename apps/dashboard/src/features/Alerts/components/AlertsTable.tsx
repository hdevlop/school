'use client';

import { CheckCheck, CircleCheck, CircleSlash, SearchX, Trash2 } from 'lucide-react';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { NEmptyState, NErrorState, NForbiddenState, NPageHeader, NPageHeaderActions, NTable, useDialog } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { AlertStatus } from '@sms/contracts';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useViewerRole } from '@/shared/useViewerRole';
import { hasFailedToLoad, isAuthorizationError } from '@/services/apiError';
import { useAlerts } from '../hooks/useAlerts';
import { useAlertsTableColumns } from '../hooks/useAlertsTableColumns';
import { isAboutSomeone, type AlertRecord } from '../alertConstants';
import AlertCard from './AlertCard';

const STATUS_ACTIONS: Array<{ status: AlertStatus; action: 'acknowledge' | 'resolve' | 'dismiss'; icon: typeof CheckCheck }> = [
  { status: 'acknowledged', action: 'acknowledge', icon: CheckCheck },
  { status: 'resolved', action: 'resolve', icon: CircleCheck },
  { status: 'dismissed', action: 'dismiss', icon: CircleSlash },
];

/**
 * The alerts the signed-in person may see. What they may do mirrors the
 * server: parents and students acknowledge alerts about themselves or their
 * child, teachers handle alerts about someone, and other staff handle all.
 */
export default function AlertsTable() {
  const { t } = useTranslation();
  const { role, isFamily } = useViewerRole();
  const columns = useAlertsTableColumns();
  const { confirmDelete } = useDialog();
  const { alerts, isAlertsLoading, error, updateAlertStatus, deleteAlert, isDeleting } = useAlerts();
  const rows = (alerts ?? []) as AlertRecord[];

  const statusActions = (alert: AlertRecord) => {
    const allowed = isFamily
      ? (isAboutSomeone(alert) && alert.status === 'active' ? ['acknowledged'] : [])
      : role === 'teacher' && !isAboutSomeone(alert)
        ? []
        : STATUS_ACTIONS.map((item) => item.status);
    return STATUS_ACTIONS
      .filter((item) => allowed.includes(item.status) && item.status !== alert.status)
      .map((item) => ({
        label: t(`alerts.page.actions.${item.action}`),
        icon: item.icon,
        onSelect: () => updateAlertStatus({ id: alert.id, status: item.status }),
      }));
  };

  const handleDelete = (alert: AlertRecord) => confirmDelete({
    title: t('common.delete'),
    warningText: t('common.deleteConfirm'),
    cancelText: t('common.cancel'),
    itemName: alert.title,
    confirmText: t('common.delete'),
    loading: isDeleting,
    onConfirm: async () => { await deleteAlert(alert.id); },
  });

  const failed = hasFailedToLoad(error, rows);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={FEATURE_ICONS.alerts}
        title={t('alerts.page.title')}
        subtitle={failed ? undefined : t('alerts.page.subtitle', { count: rows.length })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        className="min-h-0 flex-1"
        data={rows}
        columns={columns}
        loading={isAlertsLoading}
        error={failed ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        menuButton
        menu={{
          row: (alert: AlertRecord) => [
            ...statusActions(alert),
            ...(role === 'admin'
              ? [{ label: t('common.delete'), icon: Trash2, danger: true, separatorBefore: true, onSelect: () => handleDelete(alert) }]
              : []),
          ],
        }}
        renderCard={AlertCard as any}
        loadingText={t('common.loading')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.alerts}
            title={t('alerts.page.emptyTitle')}
            description={t('alerts.page.emptyDescription')}
          />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={SearchX}
            title={t('emptyStates.filtered.title')}
            description={t('emptyStates.filtered.description')}
          />
        )}
        defaultMode="table"
        showViewToggle={false}
        defaultSorting={[{ id: 'createdAt', desc: true }]}
        dynamicHeight
      />
    </div>
  );
}
