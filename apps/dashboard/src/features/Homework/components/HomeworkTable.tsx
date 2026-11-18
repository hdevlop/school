"use client"

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ClipboardCheck, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { NEmptyState, NErrorState, NForbiddenState, NPageHeaderActions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { HomeworkCompletionEntry, HomeworkRow } from '@sms/contracts';
import { PermissionButton } from '@/components/PermissionButton';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { HomeworkCardSkeleton } from '@/shared/CardSkeletons';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useDialog } from '@/shared/useDialog';
import { hasFailedToLoad, isAuthorizationError, isCountUnknown } from '@/services/apiError';
import { useClassSectionTableScope } from '@/features/Classes/hooks/useClassSectionTableScope';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useHomework, useSaveHomeworkCompletions, type HomeworkSave } from '../hooks/useHomework';
import { useHomeworkTableColumns } from '../hooks/useHomeworkTableColumns';
import HomeworkCard from './HomeworkCard';
import HomeworkCompletionForm, { HOMEWORK_COMPLETION_FORM_ID } from './HomeworkCompletionForm';
import HomeworkForm from './HomeworkForm';

function HomeworkTable() {
  const { t } = useTranslation();
  // The server lets a teacher write the homework of their own classes and
  // the school-wide roles any; monitors, supervisors and families only read.
  const { role, isFamily, isSchoolWide } = useViewerRole();
  const mayWrite = role === 'teacher' || isSchoolWide;
  // The follow-up cell opens the dialog defined below; a stable callback keeps the columns memoized.
  const followUpRef = useRef<(row: HomeworkRow) => void>(() => {});
  const openFollowUp = useCallback((row: HomeworkRow) => followUpRef.current(row), []);
  const columns = useHomeworkTableColumns(
    role === 'parent' ? 'parent' : role === 'student' ? 'student' : 'staff',
    mayWrite ? openFollowUp : undefined,
  );
  const scope = useClassSectionTableScope();

  const { homework, saveHomework, deleteHomework, error, isHomeworkLoading, isSaving, isDeleting } = useHomework();
  const saveCompletions = useSaveHomeworkCompletions();
  const rows = useMemo(() => (homework || []).filter(scope.matches), [homework, scope.matches]);
  const { openDialog, confirmDelete } = useDialog();

  const handleAddClick = () => {
    openDialog({
      title: t('homework.dialogs.createTitle'),
      // A new homework is for the class and section the list is filtered to.
      children: <HomeworkForm place={{ classId: scope.classId, sectionId: scope.sectionId }} />,
      primaryButton: {
        form: 'homework-form',
        text: t('homework.dialogs.createButton'),
        loading: isSaving,
        onClick: async (data: HomeworkSave) => { await saveHomework(data); },
      },
    });
  };

  const handleView = (row: HomeworkRow) => {
    openDialog({
      title: t('homework.dialogs.viewTitle'),
      children: <HomeworkCard data={row} detailed />,
      showButtons: false,
    });
  };

  const handleEdit = (row: HomeworkRow) => {
    openDialog({
      title: `${t('homework.dialogs.editTitle')} - ${row.title}`,
      children: <HomeworkForm homework={row} />,
      primaryButton: {
        form: 'homework-form',
        text: t('homework.dialogs.updateButton'),
        loading: isSaving,
        onClick: async (data: HomeworkSave) => { await saveHomework({ ...data, id: row.id }); },
      },
    });
  };

  // Who did it: the teacher ticks the few pupils who did not.
  const handleFollowUp = (row: HomeworkRow) => {
    openDialog({
      title: t('homework.completion.title'),
      width: '3xl',
      children: <HomeworkCompletionForm homework={row} />,
      primaryButton: {
        form: HOMEWORK_COMPLETION_FORM_ID,
        text: t('homework.completion.saveButton'),
        loading: saveCompletions.isPending,
        onClick: async (data: { id: string; entries: HomeworkCompletionEntry[] }) => { await saveCompletions.mutateAsync(data); },
      },
    });
  };

  useEffect(() => { followUpRef.current = handleFollowUp; });

  const handleDelete = (row: HomeworkRow) => {
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: row.title,
      confirmText: t('homework.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => { await deleteHomework(row.id); },
    });
  };

  const total = homework?.length ?? 0;
  // An empty list, filtered or not, offers to publish one to whoever may.
  const addAction = mayWrite ? (
    <PermissionButton permission="create:homework" size="sm" onClick={handleAddClick}>
      <Plus className="h-4 w-4" />
      {t('homework.dialogs.createButton')}
    </PermissionButton>
  ) : undefined;

  return (
    <div className='flex flex-col gap-2 w-full h-full min-h-0'>
      <NPageHeader
        icon={FEATURE_ICONS.homework}
        title={t('navigation.homework')}
        subtitle={isCountUnknown(error, homework, isHomeworkLoading) ? undefined : t('homework.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        exportTitle={t('navigation.homework')}
        permissionResource="homework"
        responsiveSkeleton
        className='min-h-0 flex-1'
        data={rows}
        columns={columns}
        filters={scope.filters}
        onCreate={mayWrite ? handleAddClick : undefined}
        onView={handleView}
        onRowClick={handleView}
        onEdit={mayWrite ? handleEdit : undefined}
        onDelete={mayWrite ? handleDelete : undefined}
        menuButton
        menu={{
          row: (row: HomeworkRow) => [
            { label: t('common.view'), icon: Eye, onSelect: () => handleView(row) },
            ...(mayWrite ? [
              { label: t('homework.completion.menu'), permission: 'update:homework', icon: ClipboardCheck, onSelect: () => handleFollowUp(row) },
              { label: t('common.edit'), permission: 'update:homework', icon: Pencil, onSelect: () => handleEdit(row) },
              { label: t('common.delete'), permission: 'delete:homework', icon: Trash2, danger: true, separatorBefore: true, onSelect: () => handleDelete(row) },
            ] : []),
          ],
        }}
        loading={isHomeworkLoading}
        error={hasFailedToLoad(error, homework) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={HomeworkCard}
        renderCardSkeleton={HomeworkCardSkeleton}
        addButtonText={t('homework.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.homework}
            title={scope.hasSelection ? t('emptyStates.filtered.title') : t('emptyStates.homework.title')}
            description={scope.hasSelection ? t('emptyStates.filtered.description') : isFamily ? t('emptyStates.familyDescription') : t('emptyStates.homework.description')}
            action={addAction}
          />
        )}
        // Nothing for the chosen class or section is often what a teacher is about to change.
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.homework}
            title={t('emptyStates.filtered.title')}
            description={t('emptyStates.filtered.description')}
            action={addAction}
          />
        )}
        defaultMode='table'
        dynamicHeight={true}
      />
    </div>
  );
}

export default HomeworkTable;
