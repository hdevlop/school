"use client"

import { NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { Label } from 'najm-kit';
import { useCallback, useMemo } from 'react';
import FeeCard from './FeeCard';
import { useTranslation } from 'najm-i18n/react';
import { useFees } from '../../../hooks/useFees';
import EditFeeForm from '../../EditFeeForm';
import { useFeeTypes } from '../../../../FeeTypes/hooks/useFeeTypes';
import InstallmentsTable from '@/features/Financial/Installment/components/InstallmentsTable';
import { CreditCard, Pencil, Trash2 } from 'lucide-react';

const getFeeBalance = (fee: any) => {
  const explicitBalance = Number(fee?.balance ?? fee?.totalDue ?? fee?.dueAmount);
  if (Number.isFinite(explicitBalance)) return explicitBalance;

  const netAmount = Number(fee?.netAmount ?? 0);
  const paidAmount = Number(fee?.paidAmount ?? fee?.totalPaid ?? 0);
  return Math.max(netAmount - paidAmount, 0);
};

export const FeesOverview = ({ fees, selectedFee, onFeeClick, onPayFee, onPayInstallment, fullWidth = false }) => {

  const { t } = useTranslation();
  const { openDialog, confirmDelete } = useConfirmDelete();
  const { feeTypes } = useFeeTypes();

  const {
    deleteFee,
    updateFee,
    isUpdating,
    isDeleting,
  } = useFees();

  const handleEdit = useCallback((fee: any) => {
    openDialog({
      title: `${t('fees.dialogs.editTitle')} - ${fee.student?.name}`,
      children: <EditFeeForm fee={fee} feeTypes={feeTypes} />,
      width: 'xl',
      primaryButton: {
        form: 'simple-fee-form',
        text: t('fees.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (feeData) => {
          await updateFee(feeData);
        }
      }
    });
  }, [t, openDialog, feeTypes, isUpdating, updateFee]);

  const handleDelete = useCallback((fee) => {
    confirmDelete({
      itemName: fee.name,
      confirmText: t('fees.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteFee(fee.id);
      }
    });
  }, [t, confirmDelete, isDeleting, deleteFee]);

  const cardsClassName = fullWidth
    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 items-start overflow-y-auto gap-3 p-1.5'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-start gap-3 p-1.5';

  const renderFeeCard = useMemo(() => ({ data }: any) => {
    return <FeeCard data={data} />;
  }, []);

  const feeMenu = useCallback((fee: any) => {
    const items: any[] = [];

    if (onPayFee && getFeeBalance(fee) > 0) {
      items.push({
        label: 'Pay',
        icon: CreditCard,
        onSelect: () => onPayFee(fee),
      });
    }

    items.push({
      label: 'Edit',
      icon: Pencil,
      onSelect: () => handleEdit(fee),
    });

    items.push({
      label: 'Delete',
      icon: Trash2,
      danger: true,
      separatorBefore: items.length > 0,
      onSelect: () => handleDelete(fee),
    });

    return items;
  }, [handleDelete, handleEdit, onPayFee]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <NTable
        data={fees}
        columns={[]}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRowClick={onFeeClick}
        menu={feeMenu}
        renderCard={renderFeeCard}
        showAddButton={false}
        showViewToggle={false}
        defaultMode='cards'
        classNames={{ cards: cardsClassName }}
        showPagination={false}
        showColumnVisibility={false}
        showCheckbox={false}
        selectedRowId={selectedFee?.id ?? null}
        noDataText="No fees assigned to this student"
        loadingText={t('fees.card.loadingStudentFees')}
        dynamicHeight={false}
        bordered={false}
        className='h-fit flex-none'
      />

      {selectedFee && (
        <div className='flex min-h-0 flex-1 flex-col gap-2'>
          <Label className="flex shrink-0 items-center gap-2 text-lg text-gray-800">
            <span>📅</span>
            Fee Installments
          </Label>
          <InstallmentsTable
            fee={selectedFee.installments}
            className="min-h-0 flex-1"
            onPayInstallment={onPayInstallment}
          />
        </div>
      )}
    </div>
  );
};
