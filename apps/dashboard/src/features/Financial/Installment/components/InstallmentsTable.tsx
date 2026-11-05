"use client"

import type { ReactNode } from 'react';
import { Download, Printer } from 'lucide-react';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, NButton, NEmptyState, useResolvedToolbarLabels, useTableStore } from 'najm-kit';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import InstallmentCard from './InstallmentCard';
import InstallmentDetails from './InstallmentDetails';
import { useDialog } from '@/shared/useDialog';
import { useTranslation } from 'najm-i18n/react';
import { MobileFeatureActions } from '@/shared/FeatureActions';
import { useInstallmentsTableColumns } from '../hooks/useInstallmentsTableColumns';
import { useInstallmentsTableFilters } from '../hooks/useInstallmentsTableFilters';

/** Keep the visible shortcuts on Najm's current filtered/selected table view. */
function InstallmentTableActions() {
  const actions = useTableStore.use.toolbarActions();
  const labels = useResolvedToolbarLabels(useTableStore.use.toolbarLabels());
  const exportAction = actions.find(action => action.label === (labels.export ?? 'Export'));
  const printAction = actions.find(action => action.label === (labels.print ?? 'Print'));

  return <>
    {printAction && <NButton type="button" variant="outline" size="sm" onClick={() => printAction.onSelect?.()}>
      <Printer aria-hidden="true" className="h-4 w-4" />
      {printAction.label}
    </NButton>}
    {exportAction && <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NButton type="button" variant="outline" size="sm">
          <Download aria-hidden="true" className="h-4 w-4" />
          {exportAction.label}
        </NButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {exportAction.submenu?.map(action => <DropdownMenuItem key={action.label} onSelect={() => action.onSelect?.()}>
          {action.label}
        </DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>}
  </>;
}

interface InstallmentsTableProps {
  fee: any[];
  feeName?: string;
  className?: string;
  onPayInstallment?: (installment: any) => void;
  dynamicHeight?: boolean;
  toolbarActions?: ReactNode;
}

function InstallmentsTable({ fee, feeName = '', className = '', onPayInstallment, dynamicHeight = true, toolbarActions }: InstallmentsTableProps) {
  const { t } = useTranslation();

  const rawFilters = useInstallmentsTableFilters();

  const { openDialog } = useDialog();

  const handleView = (installment) => {
    const installmentTitle = t('fees.studentView.installmentNumber', { number: installment.number });
    openDialog({
      title: feeName ? `${feeName} · ${installmentTitle}` : installmentTitle,
      children: <InstallmentDetails installment={installment} />,
      width: 'md',
      showButtons: false,
    });
  };

  const columns = useInstallmentsTableColumns({
    onView: handleView,
    onPay: onPayInstallment,
  });

  return (
    <NTable
      exportTitle={[feeName, t('fees.card.installments')].filter(Boolean).join(' - ')}
      className={className}
      data={fee}
      columns={columns}
      filters={rawFilters}
      renderCard={InstallmentCard}
      defaultMode='table'
      showAddButton={false}
      showPrintButton
      showExportButton
      toolbarActionDisplay="settings"
      renderToolbar={() => <>
        <h3 className="me-auto flex min-w-0 items-center gap-2 text-lg text-foreground">
          <span aria-hidden="true">📅</span>
          {t('fees.studentView.installments')}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          {toolbarActions && <MobileFeatureActions>{toolbarActions}</MobileFeatureActions>}
          <span className="hidden md:contents"><InstallmentTableActions /></span>
        </div>
      </>}
      renderEmpty={() => (
        <NEmptyState
          surface="panel"
          icon={FEATURE_ICONS.installments}
          title={t('emptyStates.installments.title')}
          description={t('emptyStates.installments.description')}
        />
      )}
      renderFilteredEmpty={() => (
        <NEmptyState
          surface="panel"
          icon={FEATURE_ICONS.installments}
          title={t('emptyStates.filtered.title')}
          description={t('emptyStates.filtered.description')}
        />
      )}
      showViewToggle={false}
      showPagination
      defaultPagination={{ pageIndex: 0, pageSize: 10 }}
      showColumnVisibility={false}
      showCheckbox
      dynamicHeight={dynamicHeight}
    />
  );
}

export default InstallmentsTable;
