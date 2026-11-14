"use client"

import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { NEmptyState, NErrorState, NForbiddenState, NPageHeaderActions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { HomeworkRow } from '@sms/contracts';
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
import { useHomework, type HomeworkSave } from '../hooks/useHomework';
import { useHomeworkTableColumns } from '../hooks/useHomeworkTableColumns';
import HomeworkCard from './HomeworkCard';
import HomeworkForm from './HomeworkForm';

function HomeworkTable() {
  const { t } = useTranslation();
  // The server lets a teacher write the homework of their own classes and
  // the school-wide roles any; monitors, supervisors and families only read.
  const { role, isFamily, isSchoolWide } = useViewerRole();
  const mayWrite = role === 'teacher' || isSchoolWide;
  const columns = useHomeworkTableColumns(role === 'parent' ? 'parent' : role === 'student' ? 'student' : 'staff');
  const scope = useClassSectionTableScope();

  const { homework, saveHomework, deleteHomework, error, isHomeworkLoading, isSaving, isDeleting } = useHomework();
  const rows = useMemo(() => (homework || []).filter(scope.matches), [homework, scope.matches]);
  const { openDialog, confirmDelete } = useDialog();

  const handleAddClick = () => {
    openDialog({
      title: t('homework.dialogs.createTitle'),
      children: <HomeworkForm />,
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
        onEdit={mayWrite ? handleEdit : undefined}
        onDelete={mayWrite ? handleDelete : undefined}
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
            action={scope.hasSelection || !mayWrite ? undefined : (
              <PermissionButton permission="create:homework" size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('homework.dialogs.createButton')}
              </PermissionButton>
            )}
          />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.homework}
            title={t('emptyStates.filtered.title')}
            description={t('emptyStates.filtered.description')}
          />
        )}
        defaultMode='table'
        dynamicHeight={true}
      />
    </div>
  );
}

export default HomeworkTable;
