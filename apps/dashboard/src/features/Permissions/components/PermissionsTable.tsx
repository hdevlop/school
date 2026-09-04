"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { KeyRound } from 'lucide-react';
import React from 'react';
import PermissionForm from './PermissionForm';
import { usePermissions } from '../hooks/usePermissions';
import { useTranslation } from 'najm-i18n/react';
import PermissionCard from './PermissionCard';
import { usePermissionsTableColumns } from '../hooks/usePermissionsTableColumns';
import { usePermissionsTableFilters } from '../hooks/usePermissionsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, tableErrorProps } from '@/shared/TableErrorState';

function PermissionsTable() {

  const { t } = useTranslation();
  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const columns = usePermissionsTableColumns();
  const rawFilters = usePermissionsTableFilters();

  const {
    permissions,
    createPermission,
    updatePermission,
    deletePermission,
    error,
    isPermissionsLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = usePermissions();

  const { openDialog, confirmDelete } = useConfirmDelete();

  const handleAddClick = () => {
    openDialog({
      title: t('permissions.dialogs.createTitle'),
      children: <PermissionForm />,
      primaryButton: {
        form: 'permission-form',
        text: t('permissions.dialogs.createButton'),
        loading: isCreating,
        onClick: async (permissionData) => {
          await createPermission(permissionData);
        }
      }
    });
  };

  const handleView = (permission) => {
    openDialog({
      title: t('permissions.dialogs.viewTitle'),
      children: <PermissionForm permission={permission} />,
      showButtons: false,
    });
  };

  const handleEdit = (permission) => {
    openDialog({
      title: `${t('permissions.dialogs.editTitle')} - ${permission.name}`,
      children: <PermissionForm permission={permission} mode='update' />,
      primaryButton: {
        form: 'permission-form',
        text: t('permissions.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (permissionData) => {
          await updatePermission(permissionData);
        }
      }
    });
  };

  const handleDelete = (permission) => {
    confirmDelete({
      itemName: permission.name,
      confirmText: t('permissions.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deletePermission(permission.id);
      }
    });
  };

  const total = permissions?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={KeyRound}
        title={tf('navigation.permissions', 'Permissions')}
        subtitle={hasFailedToLoad(error, permissions) ? undefined : t('permissions.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={permissions}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isPermissionsLoading}
        {...tableErrorProps(error, permissions)}
        renderCard={PermissionCard}
        addButtonText={t('permissions.dialogs.createButton')}
        defaultMode='table'
      />
    </div>
  );
}

export default PermissionsTable;
