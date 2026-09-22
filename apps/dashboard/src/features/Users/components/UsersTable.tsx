"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useDialog, NPageHeader, NPageHeaderActions, NTable, NErrorState, NForbiddenState, NEmptyState, NButton } from 'najm-kit';
import { Eye, KeyRound, Pencil, Trash2, UserCog, Plus, SearchX } from 'lucide-react';
import React from 'react';
import UserForm from './UserForm';
import ResetAccessDialog from './ResetAccessDialog';
import { useUsers } from '../hooks/useUsers';
import { useTranslation } from 'najm-i18n/react';
import UserCard from './UserCard';
import { useUsersTableColumns } from '../hooks/useUsersTableColumns';
import { useUsersTableFilters } from '../hooks/useUsersTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isAuthorizationError } from '@/services/apiError';

function UsersTable() {

  const { t } = useTranslation();
  const columns = useUsersTableColumns();
  const rawFilters = useUsersTableFilters();

  const {
    users,
    createUser,
    updateUser,
    deleteUser,
    error,
    isUsersLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useUsers();

  const { openDialog, confirmDelete } = useDialog();

  const handleAddClick = () => {
    openDialog({
      title: t('users.dialogs.createTitle'),
      children: <UserForm />,
      primaryButton: {
        form: 'user-form',
        text: t('users.dialogs.createButton'),
        loading: isCreating,
        onClick: async (userData) => {
          await createUser(userData);
        }
      }
    });
  };

  const handleView = (user) => {
    openDialog({
      title: t('users.dialogs.viewTitle'),
      children: <UserForm user={user} />,
      showButtons: false,
    });
  };

  const handleEdit = (user) => {
    openDialog({
      title: `${t('users.dialogs.editTitle')} - ${user.name}`,
      children: <UserForm user={user} />,
      primaryButton: {
        form: 'user-form',
        text: t('users.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (userData) => {
          await updateUser(userData);
        }
      }
    });
  };

  const handleDelete = (user) => {
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: user.name,
      confirmText: t('users.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteUser(user.id);
      }
    });
  };

  const handleResetAccess = (user) => {
    openDialog({
      title: t('users.accessReset.title'),
      children: <ResetAccessDialog user={user} />,
      // The dialog owns its own confirm: it has to stay open and explain itself
      // when a send fails or the account moved under the confirmation.
      showButtons: false,
    });
  };

  // NTable's built-in View/Edit/Delete items exist only while no `menu.row` is
  // supplied — providing one replaces them — so they are restated here, which
  // also gets them translated. One menu now serves the desktop row button, the
  // card button and right-click alike.
  const rowMenu = (user) => [
    { label: t('common.view'), icon: Eye, onSelect: () => handleView(user) },
    { label: t('common.edit'), icon: Pencil, onSelect: () => handleEdit(user) },
    {
      label: t('users.accessReset.action'),
      icon: KeyRound,
      separatorBefore: true,
      onSelect: () => handleResetAccess(user),
    },
    {
      label: t('common.delete'),
      icon: Trash2,
      danger: true,
      separatorBefore: true,
      onSelect: () => handleDelete(user),
    },
  ];

  const total = users?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={UserCog}
        title={t('navigation.users')}
        subtitle={hasFailedToLoad(error, users) ? undefined : t('users.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={users}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        menu={{ row: rowMenu }}
        loading={isUsersLoading}
        error={hasFailedToLoad(error, users) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={UserCard}
        addButtonText={t('users.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.users}
            title={t('emptyStates.users.title')}
            description={t('emptyStates.users.description')}
            action={(
              <NButton size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('users.dialogs.createButton')}
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
        defaultMode='cards'
      />
    </div>
  );
}

export default UsersTable;
