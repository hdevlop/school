"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useDialog, NPageHeader, NPageHeaderActions, NTable, NEmptyState, NButton } from 'najm-kit';
import { Tag, Plus, SearchX } from 'lucide-react';
import React from 'react';
import FeeTypeForm from './FeeTypeForm';
import { useFeeTypes } from '../hooks/useFeeTypes';
import { useTranslation } from 'najm-i18n/react';
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

  const { openDialog, confirmDelete } = useDialog();

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
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
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
        subtitle={t('feeTypes.subtitle.count', { count: total })}
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
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.feeTypes}
            title={t('emptyStates.feeTypes.title')}
            description={t('emptyStates.feeTypes.description')}
            action={(
              <NButton size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('feeTypes.dialogs.createButton')}
              </NButton>
            )}
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
        defaultMode='table'
      />
    </div>
  );
}

export default FeeTypesTable;
