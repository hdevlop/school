"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useDialog, NPageHeader, NPageHeaderActions, NTable, NErrorState, NForbiddenState, NEmptyState, NButton } from 'najm-kit';
import { HeartHandshake, Plus, SearchX } from 'lucide-react';
import React, { useMemo } from 'react';
import { useClassSectionTableScope } from '@/shared/useClassSectionTableScope';
import { matchesAnyChild } from '@/shared/classSectionScope';
import ParentForm from './SimpleParentForm';
import { useParents } from '../hooks/useParents';
import { useTranslation } from 'najm-i18n/react';
import ParentCard from './ParentCard';
import { useParentsTableColumns } from '../hooks/useParentsTableColumns';
import { useParentsTableFilters } from '../hooks/useParentsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useRouter } from 'next/navigation';
import { usePermissions } from 'najm-auth/client/react';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';

const getParentRowClassName = (parent) => {
  const isOrphaned = parent?.isOrphaned === true || Number(parent?.totalChildren) === 0;
  return isOrphaned
    ? 'bg-muted/60 text-muted-foreground opacity-80 hover:bg-muted/80'
    : undefined;
};

function ParentsTable() {

  const { t } = useTranslation();
  const router = useRouter();
  // A teacher reads parents; only roles that may change them get the actions.
  const { can } = usePermissions();
  const canCreate = can('create:parents');
  const canUpdate = can('update:parents');
  const canDelete = can('delete:parents');
  // Opening a parent keeps an explicitly viewed year.
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const columns = useParentsTableColumns();
  const scope = useClassSectionTableScope();
  const parentFilters = useParentsTableFilters();
  const rawFilters = useMemo(() => [...parentFilters, ...scope.filters], [parentFilters, scope.filters]);

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
  const filteredParents = useMemo(() => (parents || []).filter((parent) =>
    matchesAnyChild(parent.childPlacements, scope.classId, scope.sectionId)),
  [parents, scope.classId, scope.sectionId]);

  const { openDialog, confirmDelete } = useDialog();

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
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
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
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
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
        subtitle={isCountUnknown(error, parents, isParentsLoading) ? undefined : t('parents.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={filteredParents}
        columns={columns}
        filters={rawFilters}
        onCreate={canCreate ? handleAddClick : undefined}
        onView={handleView}
        onEdit={canUpdate ? handleEdit : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        onBulkDelete={canDelete ? handleBulkDelete : undefined}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        loading={isParentsLoading}
        error={hasFailedToLoad(error, parents) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        loadingText={t('common.loading')}
        renderCard={ParentCard}
        getRowClassName={getParentRowClassName}
        addButtonText={t('parents.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={scope.hasSelection ? SearchX : FEATURE_ICONS.parents}
            title={t(scope.hasSelection ? 'emptyStates.filtered.title' : 'emptyStates.parents.title')}
            description={t(scope.hasSelection ? 'emptyStates.filtered.description' : 'emptyStates.parents.description')}
            action={scope.hasSelection || !canCreate ? undefined : (
              <NButton size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('parents.dialogs.createButton')}
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

export default ParentsTable;
