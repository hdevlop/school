"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { ClipboardList } from 'lucide-react';
import React from 'react';
import AssessmentForm from './AssessmentForm';
import AssessmentCard from './AssessmentCard';
import { useAssessments } from '../hooks/useAssessments';
import { useTranslation } from '@/hooks/useLanguage';
import { useAssessmentsTableColumns } from '../hooks/useAssessmentsTableColumns';
import { useAssessmentsTableFilters } from '../hooks/useAssessmentsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, tableErrorProps } from '@/shared/TableErrorState';

function AssessmentsTable() {
  const { t } = useTranslation();
  const columns = useAssessmentsTableColumns();
  const rawFilters = useAssessmentsTableFilters();

  const {
    assessments,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    error,
    isAssessmentsLoading,
    isUpdating,
    isCreating,
    isDeleting,
  } = useAssessments();

  const { openDialog, confirmDelete } = useConfirmDelete();

  const handleAddClick = () => {
    openDialog({
      title: t('assessments.dialogs.createTitle'),
      children: <AssessmentForm />,
      primaryButton: {
        form: 'assessment-form',
        text: t('assessments.dialogs.createButton'),
        loading: isCreating,
        onClick: async (data) => {
          await createAssessment(data);
        },
      },
    });
  };

  const handleView = (assessment) => {
    openDialog({
      title: t('assessments.dialogs.viewTitle'),
      children: <AssessmentCard data={assessment} />,
      showButtons: false,
    });
  };

  const handleEdit = (assessment) => {
    openDialog({
      title: `${t('assessments.dialogs.editTitle')} - ${assessment.title}`,
      children: <AssessmentForm assessment={assessment} />,
      primaryButton: {
        form: 'assessment-form',
        text: t('assessments.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (data) => {
          await updateAssessment({ ...data, id: assessment.id });
        },
      },
    });
  };

  const handleDelete = (assessment) => {
    confirmDelete({
      itemName: assessment.title,
      confirmText: t('assessments.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteAssessment(assessment.id);
      },
    });
  };

  const total = assessments?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full min-h-0'>
      <NPageHeader
        icon={ClipboardList}
        title={t('navigation.assessments')}
        subtitle={hasFailedToLoad(error, assessments) ? undefined : t('assessments.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        className='min-h-0 flex-1'
        data={assessments}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isAssessmentsLoading}
        {...tableErrorProps(error, assessments)}
        renderCard={AssessmentCard}
        addButtonText={t('assessments.dialogs.createButton')}
        defaultMode='table'
        dynamicHeight={true}
      />
    </div>
  );
}

export default AssessmentsTable;
