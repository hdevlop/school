"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { FileText } from 'lucide-react';
import React from 'react';
import ExamForm from './ExamForm';
import ExamCard from './ExamCard';
import { useExams } from '../hooks/useExams';
import { useTranslation } from 'najm-i18n/react';
import { useExamsTableColumns } from '../hooks/useExamsTableColumns';
import { useExamsTableFilters } from '../hooks/useExamsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, tableErrorProps } from '@/shared/TableErrorState';

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

  const { openDialog, confirmDelete } = useConfirmDelete();

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
        {...tableErrorProps(error, exams)}
        renderCard={ExamCard}
        addButtonText={t('exams.dialogs.createButton')}
        defaultMode='table'
        dynamicHeight={true}
      />
    </div>
  );
}

export default ExamsTable;
