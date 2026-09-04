"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { UserCog } from 'lucide-react';
import React from 'react';
import UserForm from './UserForm';
import { useUsers } from '../hooks/useUsers';
import { useTranslation } from 'najm-i18n/react';
import UserCard from './UserCard';
import { useUsersTableColumns } from '../hooks/useUsersTableColumns';
import { useUsersTableFilters } from '../hooks/useUsersTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, tableErrorProps } from '@/shared/TableErrorState';

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

  const { openDialog, confirmDelete } = useConfirmDelete();

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
      itemName: user.name,
      confirmText: t('users.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteUser(user.id);
      }
    });
  };

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
        loading={isUsersLoading}
        {...tableErrorProps(error, users)}
        renderCard={UserCard}
        addButtonText={t('users.dialogs.createButton')}
        defaultMode='cards'
      />
    </div>
  );
}

export default UsersTable;
