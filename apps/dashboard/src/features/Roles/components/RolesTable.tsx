"use client"

import { useDialog, NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { Shield } from 'lucide-react';
import React from 'react';
import RoleForm from './RoleForm';
import RolePermissionsDialog from './RolePermissionsDialog';
import { useRoles } from '../hooks/useRoles';
import { useTranslation } from 'najm-i18n/react';
import RoleCard from './RoleCard';
import { useRolesTableColumns } from '../hooks/useRolesTableColumns';
import { useRolesTableFilters } from '../hooks/useRolesTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, tableErrorProps } from '@/shared/TableErrorState';

import { tableEmptyProps } from '@/shared/TableEmptyState';
function RolesTable() {

  const { t } = useTranslation();
  const rawFilters = useRolesTableFilters();
  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const { openDialog, confirmDelete } = useDialog();

  const handleManagePermissions = (role) => {
    openDialog({
      title: `${tf('permissions.manage.title', 'Manage Permissions')} - ${role.name}`,
      children: <RolePermissionsDialog role={role} />,
      width: 'lg',
      showButtons: false,
    });
  };

  const columns = useRolesTableColumns(handleManagePermissions);

  const {
    roles,
    createRole,
    updateRole,
    deleteRole,
    error,
    isRolesLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useRoles();

  const handleAddClick = () => {
    openDialog({
      title: t('roles.dialogs.createTitle'),
      children: <RoleForm />,
      primaryButton: {
        form: 'role-form',
        text: t('roles.dialogs.createButton'),
        loading: isCreating,
        onClick: async (roleData) => {
          await createRole(roleData);
        }
      }
    });
  };

  const handleView = (role) => {
    openDialog({
      title: t('roles.dialogs.viewTitle'),
      children: <RoleForm role={role} />,
      showButtons: false,
    });
  };

  const handleEdit = (role) => {
    openDialog({
      title: `${t('roles.dialogs.editTitle')} - ${role.name}`,
      children: <RoleForm role={role} />,
      primaryButton: {
        form: 'role-form',
        text: t('roles.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (roleData) => {
          await updateRole(roleData);
        }
      }
    });
  };

  const handleDelete = (role) => {
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: role.name,
      confirmText: t('roles.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteRole(role.id);
      }
    });
  };

  const total = roles?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={Shield}
        title={t('navigation.roles')}
        subtitle={hasFailedToLoad(error, roles) ? undefined : t('roles.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={roles}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isRolesLoading}
        {...tableErrorProps(error, roles)}
        renderCard={RoleCard}
        addButtonText={t('roles.dialogs.createButton')}
        {...tableEmptyProps({
          feature: 'roles',
          onCreate: handleAddClick,
          createLabel: t('roles.dialogs.createButton'),
        })}
        defaultMode='table'
      />
    </div>
  );
}

export default RolesTable;
