"use client"

import { NTable } from 'najm-kit';
import InstallmentCard from './InstallmentCard';
import { useDialog } from 'najm-kit';
import { useInstallmentsTableColumns } from '../hooks/useInstallmentsTableColumns';
import { useInstallmentsTableFilters } from '../hooks/useInstallmentsTableFilters';

function InstallmentsTable({ fee, className = '', onPayInstallment }) {

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
