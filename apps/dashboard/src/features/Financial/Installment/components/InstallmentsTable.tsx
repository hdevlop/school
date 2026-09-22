"use client"

import { SearchX } from 'lucide-react';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { NTable, NEmptyState } from 'najm-kit';
import InstallmentCard from './InstallmentCard';
import { useDialog } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useInstallmentsTableColumns } from '../hooks/useInstallmentsTableColumns';
import { useInstallmentsTableFilters } from '../hooks/useInstallmentsTableFilters';

function InstallmentsTable({ fee, className = '', onPayInstallment }) {
  const { t } = useTranslation();

  const rawFilters = useInstallmentsTableFilters();

  const { openDialog } = useDialog();

  const handleView = (installment) => {
    openDialog({
      title: `Installment #${installment.number}`,
      children: <InstallmentCard data={installment} />,
      showButtons: false,
    });
  };

  const columns = useInstallmentsTableColumns({
    onView: handleView,
    onPay: onPayInstallment,
  });

  return (
    <NTable
      className={className}
      data={fee}
      columns={columns}
      filters={rawFilters}
      renderCard={InstallmentCard}
      defaultMode='table'
      showAddButton={false}
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
          icon={SearchX}
          title={t('emptyStates.filtered.title')}
          description={t('emptyStates.filtered.description')}
        />
      )}
      showViewToggle={false}
      showPagination
      defaultPagination={{ pageIndex: 0, pageSize: 10 }}
      pageSizeOptions={[10, 20, 30, 40, 50]}
      showColumnVisibility={false}
      showCheckbox
      dynamicHeight
    />
  );
}

export default InstallmentsTable;
