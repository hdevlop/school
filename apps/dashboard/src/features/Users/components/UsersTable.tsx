"use client"

import { PermissionButton } from '@/components/PermissionButton';
import { BulkDeleteDialog } from '@/components/BulkDeleteDialog';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { Eye, KeyRound, Pencil, Trash2, Plus } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import UserForm from './UserForm';
import UserView from './UserView';
import ResetAccessDialog from './ResetAccessDialog';
import { useUsers } from '../hooks/useUsers';
import { useTranslation } from 'najm-i18n/react';
import UserCard from './UserCard';
import { UserCardSkeleton } from '@/shared/PersonCardSkeleton';
import { useUsersTableColumns } from '../hooks/useUsersTableColumns';
import { useUsersTableFilters } from '../hooks/useUsersTableFilters';
import { useAccountLinks } from '../hooks/useAccountLinks';
import { useViewerRole } from '../hooks/useViewerRole';
import { getUserRowClassName, matchesLinkedTo, withAccountLinks, type LinkedToFilter } from '../config/accountLinks';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';
import { useAuth } from 'najm-auth/client/react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteUserApi } from '@/services/userApi';
import { deleteSelection, type DeleteSelectionProgress } from '@/shared/deleteSelection';
import { focusTableForKeyboard } from '@/shared/focusTableForKeyboard';
import { removableUserIds } from '../config/bulkRemoval';

function UsersTable() {

  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const columns = useUsersTableColumns();
  const { isSchoolWide } = useViewerRole();
  const links = useAccountLinks(isSchoolWide);
  const [linkedToFilter, setLinkedToFilter] = useState<LinkedToFilter>('__all__');
  const linkedTo = useMemo(
    () => links ? { value: linkedToFilter, onChange: setLinkedToFilter } : undefined,
    [links, linkedToFilter],
  );
  const rawFilters = useUsersTableFilters(linkedTo);

  const {
    users: accounts,
    createUser,
    updateUser,
    deleteUser,
    error,
    isUsersLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useUsers();

  // Each account carries who it belongs to; the 'Linked to' filter narrows the list here.
  const users = useMemo(() => {
    const linked = withAccountLinks(accounts, links);
    return links ? linked?.filter(user => matchesLinkedTo(user, linkedToFilter)) : linked;
  }, [accounts, links, linkedToFilter]);

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
      children: <UserView user={user} />,
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
      width: 'lg',
      // The dialog owns its own confirm: it has to stay open and explain itself
      // when a send fails or the account moved under the confirmation.
      showButtons: false,
    });
  };

  const handleBulkDelete = (ids: string[]) => {
    if (!currentUser?.id) return;
    const selectedIds = removableUserIds(ids, currentUser.id);
    if (!selectedIds.length) {
      toast.info(t('users.dialogs.currentAccountKept'));
      return;
    }
    let warningText = t('common.deleteConfirm');
    if (ids.includes(currentUser.id)) warningText += ` ${t('users.dialogs.currentAccountKept')}`;
    openDialog({
      title: t('common.delete'),
      size: 'sm',
      render: ({ dialog, zIndex, confirm, cancel, onOpenChange }) => (
        <BulkDeleteDialog
          title={dialog.title}
          total={selectedIds.length}
          itemName={t('users.dialogs.bulkDeleteItemName', { count: selectedIds.length })}
          warningText={warningText}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          loading={dialog.primaryButton?.loading}
          zIndex={zIndex}
          onOpenChange={onOpenChange}
          onCancel={() => cancel()}
          onConfirm={onProgress => confirm(onProgress)}
        />
      ),
      primaryButton: {
        onClick: async (onProgress: (progress: DeleteSelectionProgress) => void) => {
          const result = await deleteSelection(selectedIds, deleteUserApi, onProgress);
          setRowSelection(Object.fromEntries(result.failed.map(({ id }) => [id, true])));
          await Promise.all(['users', 'operators', 'students', 'parents', 'staff', 'teachers'].map(key =>
            queryClient.invalidateQueries({ queryKey: [key] })));
          if (result.deleted.length) toast.success(t('common.deletedCount', { count: result.deleted.length }));
          if (result.failed.length) toast.error(t('common.deleteFailedCount', { count: result.failed.length }), {
            description: [...new Set(result.failed.map(item => item.message))].join(' · '),
          });
        },
      },
    });
  };

  // NTable's built-in View/Edit/Delete items exist only while no `menu.row` is
  // supplied — providing one replaces them — so they are restated here, which
  // also gets them translated. One menu now serves the desktop row button, the
  // card button and right-click alike.
  const rowMenu = (user) => [
    { label: t('common.view'), icon: Eye, onSelect: () => handleView(user) },
    { label: t('common.edit'), permission: 'update:users', icon: Pencil, onSelect: () => handleEdit(user) },
    {
      label: t('users.accessReset.action'), permission: 'reset:users',
      icon: KeyRound,
      separatorBefore: true,
      onSelect: () => handleResetAccess(user),
    },
    {
      label: t('common.delete'), permission: 'delete:users',
      icon: Trash2,
      danger: true,
      separatorBefore: true,
      onSelect: () => handleDelete(user),
    },
  ];

  // The header counts every account, like the other filters leave it.
  const total = accounts?.length ?? 0;

  const filteredEmpty = (
    <NEmptyState
      surface="panel"
      icon={FEATURE_ICONS.users}
      title={t('emptyStates.filtered.title')}
      description={t('emptyStates.filtered.description')}
    />
  );

  return (
    <div className='flex flex-col gap-2 w-full h-full' onPointerDownCapture={focusTableForKeyboard}>
      <NPageHeader
        icon={FEATURE_ICONS.users}
        title={t('navigation.users')}
        subtitle={isCountUnknown(error, accounts, isUsersLoading) ? undefined : t('users.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        exportTitle={t('navigation.users')}
        permissionResource="users"
        data={users}
        getRowId={(user) => user.id}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        showDeleteSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        menu={{ row: rowMenu }}
        getRowClassName={getUserRowClassName}
        loading={isUsersLoading}
        error={hasFailedToLoad(error, accounts) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={UserCard}
        renderCardSkeleton={UserCardSkeleton}
        // The cards are compact, so a wide screen fits five per row.
        classNames={{ cards: 'grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' }}
        addButtonText={t('users.dialogs.createButton')}
        // The 'Linked to' filter narrows the rows before the table sees them, so
        // an empty result there is a filtered one, not a school without users.
        renderEmpty={() => linkedToFilter !== '__all__' && accounts?.length ? filteredEmpty : (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.users}
            title={t('emptyStates.users.title')}
            description={t('emptyStates.users.description')}
            action={(
              <PermissionButton permission="create:users" size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('users.dialogs.createButton')}
              </PermissionButton>
            )}
          />
        )}
        renderFilteredEmpty={() => filteredEmpty}
        defaultMode='cards'
      />
    </div>
  );
}

export default UsersTable;
