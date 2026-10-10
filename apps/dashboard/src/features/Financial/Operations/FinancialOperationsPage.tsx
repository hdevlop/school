'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RowSelectionState } from '@tanstack/react-table';
import {
  NButton,
  NEmptyState,
  NErrorState,
  NForbiddenState,
  NPageHeader,
  NPageHeaderActions,
  useDialog,
  NTable,
} from 'najm-kit';
import { toast } from 'sonner';
import { Ban, CheckCircle2, Landmark, RotateCw, SearchX, Undo2 } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { getPendingChecksApi, updateCheckStatusApi, voidPaymentApi } from '@/services/paymentApi';
import { hasFailedToLoad, isAuthorizationError } from '@/services/apiError';
import CheckCard from './components/CheckCard';
import CheckReasonForm, { CHECK_REASON_FORM_ID } from './components/CheckReasonForm';
import RolloverDialogContent from './components/RolloverDialogContent';
import { CHECK_STATUS_FILTER_VALUES, nextCheckStep } from './config/checkStatus';
import { usePendingChecksTableColumns } from './hooks/usePendingChecksTableColumns';

const list = (value: any) => {
  const payload = value?.data?.data ?? value?.data ?? value;
  return Array.isArray(payload) ? payload : payload?.items ?? [];
};

/**
 * Checks recorded as payments that have not cleared yet. A pending check
 * reserves the installments it pays until it is settled, bounced or voided.
 */
export default function FinancialOperationsPage() {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const { openDialog } = useDialog();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['payments', 'pending-checks'], queryFn: getPendingChecksApi });
  const rows = useMemo(() => list(data), [data]);
  const failed = hasFailedToLoad(error, rows);

  const runOnCheck = useCallback(async (payment: any, action: () => Promise<unknown>, success: string) => {
    setBusyId(payment.id);
    try {
      await action();
      toast.success(success);
      await refetch();
    } catch (actionError: any) {
      toast.error(actionError?.message || t('financialOperations.failed'));
    } finally {
      setBusyId(null);
    }
  }, [refetch, t]);

  const advance = useCallback((payment: any) => {
    const step = nextCheckStep(payment.status);
    if (!step) return;
    return runOnCheck(
      payment,
      () => updateCheckStatusApi(payment.id, { status: step.status }),
      t('payments.success.checkMarked', { status: t(`financialOperations.checkStatuses.${step.status}`) }),
    );
  }, [runOnCheck, t]);

  // Selected checks that can still move forward; each takes its own next step.
  const selectedChecks = useMemo(
    () => rows.filter((payment: any) => rowSelection[payment.id] && nextCheckStep(payment.status)),
    [rows, rowSelection],
  );
  const selectedSteps = new Set<string>(selectedChecks.map((payment: any) => nextCheckStep(payment.status)!.labelKey));
  const bulkLabelKey = selectedSteps.size === 1 ? [...selectedSteps][0] : 'financialOperations.advanceSelected';

  const advanceSelected = useCallback(async () => {
    if (selectedChecks.length === 0) return;
    setIsBulkBusy(true);
    let done = 0;
    try {
      // One request per check, so each keeps its own audit entry and a refusal
      // stops only that check.
      for (const payment of selectedChecks) {
        const step = nextCheckStep(payment.status);
        if (!step) continue;
        try {
          await updateCheckStatusApi(payment.id, { status: step.status });
          done += 1;
        } catch {
          // Counted below; the rest of the selection still moves.
        }
      }
      if (done === selectedChecks.length) {
        toast.success(t('financialOperations.bulkUpdated', { count: done }));
      } else {
        toast.error(t('financialOperations.bulkPartial', { done, total: selectedChecks.length }));
      }
      setRowSelection({});
      await refetch();
    } finally {
      setIsBulkBusy(false);
    }
  }, [selectedChecks, refetch, t]);

  const askReason = (payment: any, kind: 'bounce' | 'void') => openDialog({
    title: t(kind === 'bounce' ? 'financialOperations.bounceTitle' : 'financialOperations.voidTitle'),
    description: `${payment.student?.name ?? ''} · ${payment.checkNumber} · ${majorMoney(Number(payment.amount || 0))}`,
    children: <CheckReasonForm label={t(kind === 'bounce' ? 'financialOperations.bounceReason' : 'financialOperations.voidReason')} />,
    width: 'md',
    primaryButton: {
      form: CHECK_REASON_FORM_ID,
      text: t(kind === 'bounce' ? 'financialOperations.bounce' : 'financialOperations.void'),
      variant: 'destructive',
      onClick: async ({ reason }: { reason: string }) => kind === 'bounce'
        ? runOnCheck(payment, () => updateCheckStatusApi(payment.id, { status: 'bounced', reason }),
          t('payments.success.checkMarked', { status: t('financialOperations.checkStatuses.bounced') }))
        : runOnCheck(payment, () => voidPaymentApi(payment.id, reason), t('payments.success.voided')),
    },
    secondaryButton: { text: t('common.cancel') },
  });

  const openRollover = () => openDialog({
    title: t('financialOperations.rolloverTitle'),
    description: t('financialOperations.rolloverDescription'),
    children: <RolloverDialogContent />,
    width: 'lg',
    showButtons: false,
  });

  const columns = usePendingChecksTableColumns({ busyId, disabled: isBulkBusy, onAdvance: advance });
  const filters = useMemo(() => [
    { name: 'checkSearch', placeholder: t('financialOperations.searchPlaceholder'), type: 'search', className: 'w-full lg:w-72' },
    {
      name: 'status',
      placeholder: t('payments.table.status'),
      type: 'select',
      showIcon: false,
      options: CHECK_STATUS_FILTER_VALUES.map((value) => ({ value, label: t(`financialOperations.checkStatuses.${value}`) })),
    },
  ], [t]);

  const rowMenu = (payment: any) => {
    const step = nextCheckStep(payment.status);
    return [
      ...(step ? [{ label: t(step.labelKey), icon: step.status === 'deposited' ? Landmark : CheckCircle2, onSelect: () => advance(payment) }] : []),
      { label: t('financialOperations.bounce'), icon: Undo2, separatorBefore: Boolean(step), onSelect: () => askReason(payment, 'bounce') },
      { label: t('financialOperations.void'), icon: Ban, danger: true, onSelect: () => askReason(payment, 'void') },
    ];
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={FEATURE_ICONS.financialOperations}
        title={t('financialOperations.title')}
        subtitle={failed || isLoading ? undefined : t('financialOperations.subtitle', { count: rows.length })}
      >
        <NPageHeaderActions>
          {/* Icon only at phone width, where the label left no room for the title. */}
          <NButton
            variant="outline"
            onClick={openRollover}
            aria-label={t('financialOperations.rolloverButton')}
            title={t('financialOperations.rolloverButton')}
          >
            <RotateCw className="h-4 w-4 sm:me-2" aria-hidden />
            <span className="max-sm:hidden">{t('financialOperations.rolloverButton')}</span>
          </NButton>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        responsiveSkeleton
        className="min-h-0 flex-1"
        data={rows}
        columns={columns}
        getRowId={(payment: any) => payment.id}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        headerSlot={
          <NButton
            disabled={selectedChecks.length === 0 || isBulkBusy || busyId !== null}
            onClick={advanceSelected}
            className="gap-2"
          >
            <Landmark className="h-4 w-4" />
            {t(bulkLabelKey)} ({selectedChecks.length})
          </NButton>
        }
        filters={filters}
        loading={isLoading}
        error={failed ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        menuButton
        menu={{ row: rowMenu }}
        renderCard={CheckCard as any}
        loadingText={t('common.loading')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.financialOperations}
            title={t('financialOperations.noChecks')}
            description={t('financialOperations.checksDescription')}
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
        showAddButton={false}
        showCheckbox
        defaultSorting={[{ id: 'checkDueDate', desc: false }]}
        dynamicHeight
      />
    </div>
  );
}
