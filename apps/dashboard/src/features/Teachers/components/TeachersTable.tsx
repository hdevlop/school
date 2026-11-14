"use client"

import { PermissionButton } from '@/components/PermissionButton';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useResetLogin } from '@/features/Users/hooks/useResetLogin';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { TablePrintButton } from '@/components/TablePrintButton';
import { Eye, Pencil, Trash2, Plus } from 'lucide-react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { announceInvitation } from '@/shared/invitationNotice';
import TeacherForm from './TeacherForm';
import { TeacherRequestsButton } from './TeacherRequests';
import { useTeachers } from '../hooks/useTeachers';
import { useTranslation } from 'najm-i18n/react';
import TeacherCard from './TeacherCard';
import { TeacherCardSkeleton } from '@/shared/PersonCardSkeleton';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSubjects } from '@/features/Subjects/hooks/useSubjects';
import { useTeachersTableColumns } from '../hooks/useTeachersTableColumns';
import { useTeachersTableFilters } from '../hooks/useTeachersTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteTeacherApi, getTeacherDeletionImpactApi } from '@/services/teacherApi';
import { deleteSelection } from '@/shared/deleteSelection';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';

function TeachersTable() {

  const { t } = useTranslation();
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const { viewingYear } = useViewingAcademicYear();
  const { can, role } = useViewerRole();
  const canCreate = can('create:teachers');
  const { canReset, resetItems, openReset } = useResetLogin();
  const router = useRouter();
  const columns = useTeachersTableColumns();

  const {
    teachers,
    createTeacher,
    updateTeacher,
    deleteTeacher,

    error,
    isTeachersLoading,
    isDeleting
  } = useTeachers();
  const { filters, filteredTeachers } = useTeachersTableFilters(teachers);

  const { classes } = useClasses();
  const { subjects } = useSubjects();

  const { openDialog, confirmDelete } = useDialog();

  const createAndInviteTeacher = async (data) => {
    const response = await createTeacher(data);
    announceInvitation(response?.data?.emailSent, data.email, {
      sent: t('teachers.invitation.sent', { email: data.email }),
      notSent: t('teachers.invitation.notSent'),
      notSentAction: canReset && response?.data?.userId ? {
        label: t('users.accessReset.action'),
        onClick: () => openReset(response.data.userId),
      } : undefined,
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

  // An administrator may delete any teacher, and what the teacher recorded goes
  // with them: the confirmation counts it first, so nothing is erased unseen.
  const deletionWarning = async (teacher) => {
    if (role !== 'admin') return t('common.deleteConfirm');
    const impact = await withAcademicYear(viewingYear, () => getTeacherDeletionImpactApi(teacher.id));
    const list = (['exams', 'grades', 'assessments', 'attendance', 'lessons', 'homework'] as const)
      .filter((key) => impact[key] > 0)
      .map((key) => `${t(`teachers.dialogs.history.${key}`)} (${impact[key]})`)
      .join(' · ');
    return list
      ? `${t('teachers.dialogs.deleteWarning')} ${t('teachers.dialogs.deleteHistory', { list })}`
      : t('teachers.dialogs.deleteWarning');
  };

  const handleDelete = async (teacher) => {
    let warningText: string;
    try {
      warningText = await deletionWarning(teacher);
    } catch (error: any) {
      // Without the count there is no honest warning, so nothing opens.
      toast.error(error?.response?.data?.message ?? error?.message ?? t('common.feedback.errorTitle'));
      return;
    }
    confirmDelete({
      title: t('common.delete'),
      warningText,
      cancelText: t('common.cancel'),
      itemName: teacher.name,
      confirmText: t('teachers.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        try {
          await deleteTeacher(teacher.id);
        } catch {
          // The mutation reports the refusal in a toast. Resolve to close this confirmation.
        }
      }
    });
  };

  // NTable's built-in View/Edit/Delete exist only while no `menu.row` is
  // supplied, so they are restated when the access reset joins them.
  const rowMenu = (teacher) => [
    { label: t('common.view'), icon: Eye, onSelect: () => handleView(teacher) },
    { label: t('common.edit'), permission: 'update:teachers', icon: Pencil, onSelect: () => handleEdit(teacher) },
    ...resetItems(teacher.userId, { invitationApproval: teacher.loginStatus === 'pending' }),
    { label: t('common.delete'), permission: 'delete:teachers', icon: Trash2, danger: true, separatorBefore: true, onSelect: () => handleDelete(teacher) },
  ];

  const handleBulkDelete = (ids: string[]) => {
    confirmDelete({
      title: t('common.delete'),
      warningText: t(role === 'admin' ? 'teachers.dialogs.bulkDeleteWarning' : 'common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: t('teachers.dialogs.bulkDeleteItemName', { count: ids.length }),
      confirmText: t('teachers.dialogs.deleteButton'),
      onConfirm: async () => {
        const result = await deleteSelection(ids, id => withAcademicYear(viewingYear, () => deleteTeacherApi(id)));
        setRowSelection(Object.fromEntries(result.failed.map(({ id }) => [id, true])));
        await queryClient.invalidateQueries({ queryKey: ['teachers'] });
        if (result.deleted.length) toast.success(t('common.deletedCount', { count: result.deleted.length }));
        if (result.failed.length) toast.error(t('common.deleteFailedCount', { count: result.failed.length }), {
          description: [...new Set(result.failed.map(item => item.message))].join(' · '),
        });
      }
    });
  };

  const total = teachers?.length ?? 0;

  return (
    <div data-list-loading={isTeachersLoading || undefined} className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        mobileBack
        icon={FEATURE_ICONS.teachers}
        title={t('navigation.teachers')}
        subtitle={isCountUnknown(error, teachers, isTeachersLoading) ? undefined : t('teachers.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          {canCreate && <TeacherRequestsButton />}
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        exportTitle={t('navigation.teachers')}
        permissionResource="teachers"
        dataActions
        toolbarActionDisplay="settings"
        headerSlot={<TablePrintButton loading={isTeachersLoading} />}
        data={filteredTeachers}
        isFilteredEmpty={filteredTeachers.length === 0 && !!teachers?.length}
        getRowId={(teacher) => teacher.id}
        columns={columns}
        filters={filters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        menu={{ row: rowMenu }}
        loading={isTeachersLoading}
        error={hasFailedToLoad(error, teachers) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        loadingText={t('common.loading')}
        renderCard={TeacherCard}
        renderCardSkeleton={TeacherCardSkeleton}
        classNames={{ cards: 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' }}
        addButtonText={t('teachers.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.teachers}
            title={t('emptyStates.teachers.title')}
            description={canCreate ? t('emptyStates.teachers.description') : undefined}
            action={canCreate ? (
              <PermissionButton permission="create:teachers" size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('teachers.dialogs.createButton')}
              </PermissionButton>
            ) : undefined}
          />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.teachers}
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
