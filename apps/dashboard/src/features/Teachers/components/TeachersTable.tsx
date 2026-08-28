"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { Users } from 'lucide-react';
import React from 'react';
import TeacherForm from './TeacherForm';
import { useTeachers } from '../hooks/useTeachers';
import { useTranslation } from '@/hooks/useLanguage';
import TeacherCard from './TeacherCard';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSubjects } from '@/features/Subjects/hooks/useSubjects';
import { useTeachersTableColumns } from '../hooks/useTeachersTableColumns';
import { useTeachersTableFilters } from '../hooks/useTeachersTableFilters';
import { TeacherProfile } from './profile';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

function TeachersTable() {

  const { t } = useTranslation();
  const columns = useTeachersTableColumns();
  const rawFilters = useTeachersTableFilters();

  const {
    teachers,
    createTeacher,
    updateTeacher,
    deleteTeacher,

    isBulkDeleting,
    bulkDeleteTeachers,
    isTeachersLoading,
    isDeleting
  } = useTeachers();

  const { classes } = useClasses();
  const { subjects } = useSubjects();

  const { openDialog, confirmDelete } = useConfirmDelete();

  const handleAddClick = () => {
    openDialog({
      title: t('teachers.dialogs.createTitle'),
      children: (
        <TeacherForm
          classes={classes}
          subjects={subjects}
          onSubmitTeacher={createTeacher}
        />
      ),
      width:'4xl',
      height:'xl',
      showButtons: false,
    });
  };

  const handleView = (teacher) => {
    openDialog({
      title: t('teachers.dialogs.viewTitle'),
      children: <TeacherProfile teacherId={teacher.id} />,
      width: 'full',
      height: 'full',
      showButtons: false,
    });
  };

  const handleEdit = (teacher) => {
    openDialog({
      title: `${t('teachers.dialogs.editTitle')} - ${teacher.name}`,
      children: (
        <TeacherForm
          teacher={teacher}
          classes={classes}
          subjects={subjects}
          onSubmitTeacher={updateTeacher}
        />
      ),
      width:'4xl',
      height:'xxl',
      showButtons: false,
    });
  };

  const handleDelete = (teacher) => {
    confirmDelete({
      itemName: teacher.name,
      confirmText: t('teachers.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteTeacher(teacher.id);
      }
    });
  };

  const handleBulkDelete = (ids) => {
    confirmDelete({
      itemName: t('teachers.dialogs.bulkDeleteItemName', { count: ids.length }),
      confirmText: t('teachers.dialogs.deleteButton'),
      loading: isBulkDeleting,
      onConfirm: async () => {
        await bulkDeleteTeachers(ids);
      }
    });
  };

  const total = teachers?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={Users}
        title={t('navigation.teachers')}
        subtitle={t('teachers.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={teachers}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        loading={isTeachersLoading}
        loadingText={t('common.loading')}
        renderCard={TeacherCard}
        addButtonText={t('teachers.dialogs.createButton')}
        defaultMode='cards'
      />
    </div>
  );
}

export default TeachersTable;
