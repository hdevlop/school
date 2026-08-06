"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { Tag } from 'lucide-react';
import React from 'react';
import FeeTypeForm from './FeeTypeForm';
import { useFeeTypes } from '../hooks/useFeeTypes';
import { useTranslation } from '@/hooks/useLanguage';
import FeeTypeCard from './FeeTypeCard';
import { useFeeTypesTableColumns } from '../hooks/useFeeTypesTableColumns';
import { useFeeTypesTableFilters } from '../hooks/useFeeTypesTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

function FeeTypesTable() {

  const { t } = useTranslation();
  const columns = useFeeTypesTableColumns();
  const rawFilters = useFeeTypesTableFilters();

  const {
    feeTypes,
    createFeeType,
    updateFeeType,
    deleteFeeType,
    isFeeTypesLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useFeeTypes();

  const { openDialog, confirmDelete } = useConfirmDelete();

  const handleAddClick = () => {
    openDialog({
      title: t('feeTypes.dialogs.createTitle'),
      children: <FeeTypeForm />,
      primaryButton: {
        form: 'fee-type-form',
        text: t('feeTypes.dialogs.createButton'),
        loading: isCreating,
        onClick: async (feeTypeData) => {
          await createFeeType(feeTypeData);
        }
      }
    });
  };

  const handleView = (feeType) => {
    openDialog({
      title: t('feeTypes.dialogs.viewTitle'),
      children: <FeeTypeCard data={feeType} />,
      showButtons: false,
    });
  };

  const handleEdit = (feeType) => {
    openDialog({
      title: `${t('feeTypes.dialogs.editTitle')} - ${feeType.name}`,
      children: <FeeTypeForm feeType={feeType} />,
      primaryButton: {
        form: 'fee-type-form',
        text: t('feeTypes.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (feeTypeData) => {
          await updateFeeType(feeTypeData);
        }
      }
    });
  };

  const handleDelete = (feeType) => {
    confirmDelete({
      itemName: feeType.name,
      confirmText: t('feeTypes.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteFeeType(feeType.id);
      }
    });
  };

  const total = feeTypes?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={Tag}
        title={t('navigation.feeTypes')}
        subtitle={`${total} ${total === 1 ? 'fee type' : 'fee types'}`}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={feeTypes}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isFeeTypesLoading}
        renderCard={FeeTypeCard}
        addButtonText={t('feeTypes.dialogs.createButton')}
        defaultMode='table'
      />
    </div>
  );
}

export default FeeTypesTable;
