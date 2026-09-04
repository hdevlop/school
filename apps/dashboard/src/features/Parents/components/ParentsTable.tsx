"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { HeartHandshake } from 'lucide-react';
import React from 'react';
import ParentForm from './SimpleParentForm';
import { useParents } from '../hooks/useParents';
import { useTranslation } from 'najm-i18n/react';
import ParentCard from './ParentCard';
import { useParentsTableColumns } from '../hooks/useParentsTableColumns';
import { useParentsTableFilters } from '../hooks/useParentsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useRouter } from 'next/navigation';
import { hasFailedToLoad, tableErrorProps } from '@/shared/TableErrorState';

const getParentRowClassName = (parent) => {
  const isOrphaned = parent?.isOrphaned === true || Number(parent?.totalChildren) === 0;
  return isOrphaned
    ? 'bg-muted/60 text-muted-foreground opacity-80 hover:bg-muted/80'
    : undefined;
};

function ParentsTable() {

  const { t } = useTranslation();
  const router = useRouter();
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const columns = useParentsTableColumns();
  const rawFilters = useParentsTableFilters();

  const {
    parents,
    createParent,
    updateParent,
    deleteParent,
    isBulkDeleting,
    bulkDeleteParents,
    error,
    isParentsLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useParents();

  const { openDialog, confirmDelete } = useConfirmDelete();

  const handleAddClick = () => {
    openDialog({
      title: t('parents.dialogs.createTitle'),
      children: <ParentForm />,
      width:'4xl',
      primaryButton: {
        form: 'parent-form',
        text: t('parents.dialogs.createButton'),
        loading: isCreating,
        onClick: async (parentData) => {
          await createParent(parentData);
        }
      }
    });
  };

  const handleView = (parent) => {
    router.push(`/parents/${parent.id}`);
  };

  const handleEdit = (parent) => {
    openDialog({
      title: `${t('parents.dialogs.editTitle')} - ${parent.name}`,
      children: <ParentForm parent={parent} />,
      width:'4xl',
      primaryButton: {
        form: 'parent-form',
        text: t('parents.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (parentData) => {
          await updateParent(parentData);
        }
      }
    });
  };

  const handleDelete = (parent) => {
    confirmDelete({
      itemName: parent.name,
      confirmText: t('parents.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteParent(parent.id);
      }
    });
  };

  const handleBulkDelete = (ids) => {
    confirmDelete({
      itemName: t('parents.dialogs.bulkDeleteItemName', { count: ids.length }),
      confirmText: t('parents.dialogs.deleteButton'),
      loading: isBulkDeleting,
      onConfirm: async () => {
        await bulkDeleteParents(ids);
        setRowSelection({});
      }
    });
  };

  const total = parents?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={HeartHandshake}
        title={t('navigation.parents')}
        subtitle={hasFailedToLoad(error, parents) ? undefined : t('parents.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={parents}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        loading={isParentsLoading}
        {...tableErrorProps(error, parents)}
        loadingText={t('common.loading')}
        renderCard={ParentCard}
        getRowClassName={getParentRowClassName}
        addButtonText={t('parents.dialogs.createButton')}
        defaultMode='cards'
      />
    </div>
  );
}

export default ParentsTable;
