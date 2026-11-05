"use client"

import { PermissionButton } from '@/components/PermissionButton';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState, useMediaQuery } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { TablePrintButton } from '@/components/TablePrintButton';
import { ClassSectionTableFilters, classSectionTableHeader, PHONE_INLINE_FILTERS } from '@/components/ClassSectionTableFilters';
import { Plus } from 'lucide-react';
import React, { useMemo } from 'react';
import { useClassSectionTableScope } from '@/features/Classes/hooks/useClassSectionTableScope';
import { matchesAnyChild } from '@/features/Classes/hooks/classSectionScope';
import ParentForm from './SimpleParentForm';
import { useParents } from '../hooks/useParents';
import { useTranslation } from 'najm-i18n/react';
import ParentCard from './ParentCard';
import { ParentCardSkeleton } from '@/shared/PersonCardSkeleton';
import { useParentsTableColumns } from '../hooks/useParentsTableColumns';
import { useParentsTableFilters } from '../hooks/useParentsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useRouter } from 'next/navigation';
import { usePermissions } from 'najm-auth/client/react';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';
import { announceInvitation } from '@/shared/invitationNotice';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteParentApi } from '@/services/parentApi';
import { deleteSelection } from '@/shared/deleteSelection';
import { useRememberedTableMode } from '@/hooks/useRememberedTableMode';
import { compareParentActivity, getParentRowClassName } from '../config/parentActivity';

function ParentsTable() {

  const { t } = useTranslation();
  const tableMode = useRememberedTableMode('parents');
  const router = useRouter();
  // A teacher reads parents; only roles that may change them get the actions.
  const { can } = usePermissions();
  const canCreate = can('create:parents');
  // Opening a parent keeps an explicitly viewed year.
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const columns = useParentsTableColumns();
  const scope = useClassSectionTableScope();
  const { filters: parentFilters, searchFilter, viewFilter, matches: matchesParent, hasSelection: hasParentSelection } = useParentsTableFilters();
  const isPhone = useMediaQuery('(max-width: 767px)');
  const rawFilters = useMemo(() => [...scope.filters, ...parentFilters], [scope.filters, parentFilters]);
  // Phones show Class, Section and the view filter in one row, with no filter button;
  // the email column filter stays on wider screens, as search covers name and CIN.
  const tableFilters = useMemo(() => isPhone
    ? rawFilters.filter(filter => ![...PHONE_INLINE_FILTERS, 'email'].includes(filter.name))
    : rawFilters, [rawFilters, isPhone]);
  const sectionFilter = scope.filters.find(filter => filter.name === 'sectionScope');
  const hasSelection = scope.hasSelection || hasParentSelection;

  const {
    parents,
    createParent,
    updateParent,
    deleteParent,
    error,
    isParentsLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useParents();
  const filteredParents = useMemo(() => (parents || []).filter((parent) =>
    matchesAnyChild(parent.childPlacements, scope.classId, scope.sectionId)
      && matchesParent(parent)).sort(compareParentActivity),
  [parents, scope.classId, scope.sectionId, matchesParent]);

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
          const response = await createParent(parentData);
          announceInvitation(response?.data?.emailSent, parentData.email, {
            sent: t('parents.invitation.sent', { email: parentData.email }),
            notSent: t('parents.invitation.notSent', { name: parentData.name }),
          });
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
      onConfirm: async () => {
        const result = await deleteSelection(ids, deleteParentApi);
        setRowSelection(Object.fromEntries(result.failed.map(({ id }) => [id, true])));
        await Promise.all(['parents', 'students'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
        if (result.deleted.length) toast.success(t('common.deletedCount', { count: result.deleted.length }));
        if (result.failed.length) toast.error(t('common.deleteFailedCount', { count: result.failed.length }), {
          description: [...new Set(result.failed.map(item => item.message))].join(' · '),
        });
      }
    });
  };

  const total = filteredParents.length;

  return (
    <div data-list-loading={isParentsLoading || undefined} className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={FEATURE_ICONS.parents}
        title={t('navigation.parents')}
        subtitle={isCountUnknown(error, parents, isParentsLoading) ? undefined : [
          ...scope.filters.filter(filter => filter.value)
            .map(filter => filter.options.find(option => option.value === filter.value)?.label),
          t('parents.subtitle.count', { count: total }),
        ].filter(Boolean).join(' · ')}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        exportTitle={t('navigation.parents')}
        permissionResource="parents"
        dataActions
        toolbarActionDisplay="settings"
        headerSlot={<>
          <ClassSectionTableFilters sectionFilter={sectionFilter} viewFilter={viewFilter} searchFilter={searchFilter} />
          <TablePrintButton loading={isParentsLoading} />
        </>}
        classNames={{ header: classSectionTableHeader }}
        data={filteredParents}
        isFilteredEmpty={filteredParents.length === 0 && !!parents?.length}
        getRowId={(parent) => parent.id}
        columns={columns}
        filters={tableFilters}
        inlinePhoneFilters={false}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        showDeleteSelection
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
        renderCardSkeleton={ParentCardSkeleton}
        getRowClassName={getParentRowClassName}
        addButtonText={t('parents.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.parents}
            title={t(hasSelection ? 'emptyStates.filtered.title' : 'emptyStates.parents.title')}
            description={t(hasSelection ? 'emptyStates.filtered.description' : 'emptyStates.parents.description')}
            action={hasSelection || !canCreate ? undefined : (
              <PermissionButton permission="create:parents" size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('parents.dialogs.createButton')}
              </PermissionButton>
            )}
          />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.parents}
            title={t('emptyStates.filtered.title')}
            description={t('emptyStates.filtered.description')}
          />
        )}
        {...tableMode}
      />
    </div>
  );
}

export default ParentsTable;
