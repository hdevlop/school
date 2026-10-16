"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useResetLogin } from '@/features/Users/hooks/useResetLogin';
import { useDialog, NPageHeader, NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState, NButton } from 'najm-kit';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { Eye, Pencil, Trash2, Users, Plus, SearchX } from 'lucide-react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { announceInvitation } from '@/shared/invitationNotice';
import TeacherForm from './TeacherForm';
import { useTeachers } from '../hooks/useTeachers';
import { useTranslation } from 'najm-i18n/react';
import TeacherCard from './TeacherCard';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSubjects } from '@/features/Subjects/hooks/useSubjects';
import { useTeachersTableColumns } from '../hooks/useTeachersTableColumns';
import { useTeachersTableFilters } from '../hooks/useTeachersTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';

function TeachersTable() {

  const { t } = useTranslation();
  const { can } = useViewerRole();
  const canCreate = can('create:teachers');
  const canUpdate = can('update:teachers');
  const canDelete = can('delete:teachers');
  const { canReset, resetItems } = useResetLogin();
  const router = useRouter();
  const columns = useTeachersTableColumns();
  const rawFilters = useTeachersTableFilters();

  const {
    teachers,
    createTeacher,
    updateTeacher,
    deleteTeacher,

    isBulkDeleting,
    bulkDeleteTeachers,
    error,
    isTeachersLoading,
    isDeleting
  } = useTeachers();

  const { classes } = useClasses();
  const { subjects } = useSubjects();

  const { openDialog, confirmDelete } = useDialog();

  const createAndInviteTeacher = async (data) => {
    const response = await createTeacher(data);
    announceInvitation(response?.data?.emailSent, data.email, {
      sent: t('teachers.invitation.sent', { email: data.email }),
      notSent: t('teachers.invitation.notSent'),
    });
    return response;
  };

  const handleAddClick = () => {
    openDialog({
      title: t('teachers.dialogs.createTitle'),
      children: (
        <TeacherForm
          classes={classes}
          subjects={subjects}
          onSubmitTeacher={createAndInviteTeacher}
        />
      ),
      width:'4xl',
      height:'xl',
      showButtons: false,
    });
  };

  const handleView = (teacher) => {
    router.push(`/teachers/${teacher.id}`);
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
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: teacher.name,
      confirmText: t('teachers.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteTeacher(teacher.id);
      }
    });
  };

  // NTable's built-in View/Edit/Delete exist only while no `menu.row` is
  // supplied, so they are restated when the access reset joins them.
  const rowMenu = (teacher) => [
    { label: t('common.view'), icon: Eye, onSelect: () => handleView(teacher) },
    ...(canUpdate ? [{ label: t('common.edit'), icon: Pencil, onSelect: () => handleEdit(teacher) }] : []),
    ...resetItems(teacher.userId),
    ...(canDelete ? [{ label: t('common.delete'), icon: Trash2, danger: true, separatorBefore: true, onSelect: () => handleDelete(teacher) }] : []),
  ];

  const handleBulkDelete = (ids) => {
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
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
        subtitle={isCountUnknown(error, teachers, isTeachersLoading) ? undefined : t('teachers.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={teachers}
        columns={columns}
        filters={rawFilters}
        onCreate={canCreate ? handleAddClick : undefined}
        onView={handleView}
        onEdit={canUpdate ? handleEdit : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        onBulkDelete={canDelete ? handleBulkDelete : undefined}
        menu={canReset ? { row: rowMenu } : undefined}
        loading={isTeachersLoading}
        error={hasFailedToLoad(error, teachers) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        loadingText={t('common.loading')}
        renderCard={TeacherCard}
        addButtonText={t('teachers.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.teachers}
            title={t('emptyStates.teachers.title')}
            description={t('emptyStates.teachers.description')}
            action={canCreate ? (
              <NButton size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('teachers.dialogs.createButton')}
              </NButton>
            ) : undefined}
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

export default TeachersTable;
