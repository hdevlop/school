"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { BookOpen } from 'lucide-react';
import React from 'react';
import SubjectForm from './SubjectForm';
import { useSubjects } from '../hooks/useSubjects';
import { useTranslation } from 'najm-i18n/react';
import SubjectCard from './SubjectCard';
import { useSubjectsTableColumns } from '../hooks/useSubjectsTableColumns';
import { useSubjectsTableFilters } from '../hooks/useSubjectsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, tableErrorProps } from '@/shared/TableErrorState';

function SubjectsTable() {

  const { t } = useTranslation();
  const columns = useSubjectsTableColumns();
  const rawFilters = useSubjectsTableFilters();

  const {
    subjects,
    createSubject,
    updateSubject,
    deleteSubject,
    error,
    isSubjectsLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useSubjects();

  const { openDialog, confirmDelete } = useConfirmDelete();

  const handleAddClick = () => {
    openDialog({
      title: t('subjects.dialogs.createTitle'),
      children: <SubjectForm />,
      primaryButton: {
        form: 'subject-form',
        text: t('subjects.dialogs.createButton'),
        loading: isCreating,
        onClick: async (subjectData) => {
          await createSubject(subjectData);
        }
      }
    });
  };

  const handleView = (subject) => {
    openDialog({
      title: t('subjects.dialogs.viewTitle'),
      children: <SubjectCard data={subject} />,
      showButtons: false,
    });
  };

  const handleEdit = (subject) => {
    openDialog({
      title: `${t('subjects.dialogs.editTitle')} - ${subject.name}`,
      children: <SubjectForm subject={subject} />,
      primaryButton: {
        form: 'subject-form',
        text: t('subjects.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (subjectData) => {
          await updateSubject(subjectData);
        }
      }
    });
  };

  const handleDelete = (subject) => {
    confirmDelete({
      itemName: subject.name,
      confirmText: t('subjects.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteSubject(subject.id);
      }
    });
  };

  const total = subjects?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={BookOpen}
        title={t('navigation.subjects')}
        subtitle={hasFailedToLoad(error, subjects) ? undefined : t('subjects.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={subjects}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isSubjectsLoading}
        {...tableErrorProps(error, subjects)}
        renderCard={SubjectCard}
        addButtonText={t('subjects.dialogs.createButton')}
        defaultMode='table'
      />
    </div>
  );
}

export default SubjectsTable;
