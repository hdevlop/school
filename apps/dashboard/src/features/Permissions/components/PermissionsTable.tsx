"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useDialog, NPageHeader, NPageHeaderActions, NTable, NErrorState, NForbiddenState, NEmptyState, NButton } from 'najm-kit';
import { KeyRound, Plus, SearchX } from 'lucide-react';
import React from 'react';
import PermissionForm from './PermissionForm';
import { usePermissions } from '../hooks/usePermissions';
import { useTranslation } from 'najm-i18n/react';
import PermissionCard from './PermissionCard';
import { usePermissionsTableColumns } from '../hooks/usePermissionsTableColumns';
import { usePermissionsTableFilters } from '../hooks/usePermissionsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isAuthorizationError } from '@/services/apiError';

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

  const { openDialog, confirmDelete } = useDialog();

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
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
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
        error={hasFailedToLoad(error, permissions) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={PermissionCard}
        addButtonText={t('permissions.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.permissions}
            title={t('emptyStates.permissions.title')}
            description={t('emptyStates.permissions.description')}
            action={(
              <NButton size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('permissions.dialogs.createButton')}
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

export default PermissionsTable;
