'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, RefreshCw } from 'lucide-react';
import { NButton, NCard, NSkeletonEventList, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { getFinancialAuditApi } from '@/services/financialOperationsApi';
import { isAuthorizationError } from '@/services/apiError';

const list = (value: any) => {
  const payload = value?.data?.data ?? value?.data ?? value;
  return Array.isArray(payload) ? payload : payload?.items ?? [];
};

/**
 * The latest financial changes across every school year. The audit API is
 * admin-only, so the Reports page renders this card for admins alone.
 */
const FinancialAuditCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { displayDateTime } = useSchoolFormat();
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['financial-audit'],
    queryFn: () => getFinancialAuditApi(),
  });
  const entries = list(data);

  const auditLabel = (action: string) => {
    const key = `financialOperations.auditActions.${action}`;
    const label = t(key);
    return label === key ? t('financialOperations.otherAction') : label;
  };

  return (
    <NCard
      title={t('financialOperations.auditTitle')}
      description={t('financialOperations.auditDescription')}
      icon={History}
      className={cn('flex w-full', className)}
      loading={isLoading}
      error={error ?? null}
      errorText={t(
        // `NCard` has no forbidden state of its own, so the distinction is made in words.
        isAuthorizationError(error)
          ? 'common.feedback.forbiddenDescription'
          : 'common.feedback.errorMessage',
      )}
      skeleton={<NSkeletonEventList />}
      noData={!isLoading && entries.length === 0}
      noDataText={t('financialOperations.noAuditEntries')}
      onRetry={() => refetch()}
    >
      <div className="mb-3 flex justify-end">
        <NButton size="sm" variant="outline" disabled={isFetching} onClick={() => refetch()}>
          <RefreshCw className="me-2 h-4 w-4" />{t('common.refresh')}
        </NButton>
      </div>
      <div className="max-h-96 overflow-auto rounded-lg border">
        <table className="w-full text-start text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr>
              <th className="p-3 text-start">{t('common.actions')}</th>
              <th className="p-3 text-start">{t('financialOperations.entity')}</th>
              <th className="p-3 text-start">{t('financialOperations.actor')}</th>
              <th className="p-3 text-start">{t('financialOperations.time')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry: any) => (
              <tr key={entry.id} className="border-t">
                <td className="p-3 font-medium">{auditLabel(entry.action)}</td>
                <td className="p-3">{entry.entityType} · {entry.entityId}</td>
                <td className="p-3">{entry.actorId || t('financialOperations.system')}</td>
                <td className="p-3 text-muted-foreground">{entry.createdAt ? displayDateTime(entry.createdAt) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </NCard>
  );
};

export default FinancialAuditCard;
