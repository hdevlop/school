"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useDialog, NPageHeader, NPageHeaderActions, NTable, NErrorState, NForbiddenState, NEmptyState, NButton } from 'najm-kit';
import { FileText, Plus, SearchX } from 'lucide-react';
import React from 'react';
import ExamForm from './ExamForm';
import ExamCard from './ExamCard';
import { useExams } from '../hooks/useExams';
import { useTranslation } from 'najm-i18n/react';
import { useExamsTableColumns } from '../hooks/useExamsTableColumns';
import { useExamsTableFilters } from '../hooks/useExamsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isAuthorizationError } from '@/services/apiError';

function ExamsTable() {
  const { t } = useTranslation();
  const columns = useExamsTableColumns();
  const rawFilters = useExamsTableFilters();

  const {
    exams,
    createExam,
    updateExam,
    deleteExam,
    error,
    isExamsLoading,
    isUpdating,
    isCreating,
    isDeleting,
  } = useExams();

  const { openDialog, confirmDelete } = useDialog();

  const handleAddClick = () => {
    openDialog({
      title: t('exams.dialogs.createTitle'),
      children: <ExamForm />,
      primaryButton: {
        form: 'exam-form',
        text: t('exams.dialogs.createButton'),
        loading: isCreating,
        onClick: async (data) => {
          await createExam(data);
        },
      },
    });
  };

  const handleView = (exam) => {
    openDialog({
      title: t('exams.dialogs.viewTitle'),
      children: <ExamCard data={exam} />,
      showButtons: false,
    });
  };

  const handleEdit = (exam) => {
    openDialog({
      title: `${t('exams.dialogs.editTitle')} - ${exam.title}`,
      children: <ExamForm exam={exam} />,
      primaryButton: {
        form: 'exam-form',
        text: t('exams.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (data) => {
          await updateExam({ ...data, id: exam.id });
        },
      },
    });
  };

  const handleDelete = (exam) => {
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: exam.title,
      confirmText: t('exams.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteExam(exam.id);
      },
    });
  };

  const total = exams?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full min-h-0'>
      <NPageHeader
        icon={FileText}
        title={t('navigation.exams')}
        subtitle={hasFailedToLoad(error, exams) ? undefined : t('exams.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        className='min-h-0 flex-1'
        data={exams}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isExamsLoading}
        error={hasFailedToLoad(error, exams) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={ExamCard}
        addButtonText={t('exams.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.exams}
            title={t('emptyStates.exams.title')}
            description={t('emptyStates.exams.description')}
            action={(
              <NButton size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('exams.dialogs.createButton')}
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
        dynamicHeight={true}
      />
    </div>
  );
}

export default ExamsTable;
