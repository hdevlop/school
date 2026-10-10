"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useDialog, NPageHeader, NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState, NButton, NTable } from 'najm-kit';
import { GraduationCap, Plus, SearchX } from 'lucide-react';
import FullStudentForm from './FullStudentForm';
import StudentProfile from './StudentProfile';
import { useStudents } from '../hooks/useStudents';
import { useTranslation } from 'najm-i18n/react';
import StudentCard from './StudentCard';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useFeeTypes } from '@/features/Financial/FeeTypes/hooks/useFeeTypes';
import SimpleStudentForm from './SimpleStudentForm';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import { useStudentsTableColumns } from '../hooks/useStudentsTableColumns';
import { useStudentsTableFilters } from '../hooks/useStudentsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useRouter } from 'next/navigation';
import { useBusinessDate } from '@/features/Settings/hooks/useSettings';
import { useState } from 'react';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';
import { announceInvitation } from '@/shared/invitationNotice';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { usePermissions } from 'najm-auth/client/react';

function StudentsTable() {

  const { t } = useTranslation();
  const router = useRouter();
  // A parent sees their children here and a student themselves, read-only.
  const { role, isFamily } = useViewerRole();
  const { can } = usePermissions();
  const canCreate = !isFamily && can('create:students');
  const canUpdate = !isFamily && can('update:students');
  const canDelete = !isFamily && can('delete:students');
  const title = role === 'parent' ? t('navigation.myChildren')
    : role === 'student' ? t('navigation.myProfile') : t('navigation.students');
  const { classes } = useClasses();
  // A new student is placed in the active year, as the server requires,
  // whichever year is viewed, so the form offers the active year's classes.
  const { viewingYear, activeYear } = useViewingAcademicYear();
  const viewsOtherYear = !!viewingYear && !!activeYear && viewingYear !== activeYear;
  const { classes: activeYearClasses } = useClasses({ academicYear: activeYear, enabled: viewsOtherYear });
  const newStudentClasses = viewsOtherYear ? activeYearClasses : classes;
  // Fee types only fill the new-student form.
  const { feeTypes } = useFeeTypes({ enabled: canCreate });
  const { businessDate, isBusinessDateLoading, refetchBusinessDate } = useBusinessDate();
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const columns = useStudentsTableColumns();

  const {
    students,
    createStudent,
    updateStudent,
    deleteStudent,
    bulkDeleteStudents,
    error,
    isStudentsLoading,
    isUpdating,
    isDeleting,
    isBulkDeleting
  } = useStudents();
  const { filters, filteredStudents } = useStudentsTableFilters(students);

  const { openDialog, confirmDelete, pop } = useDialog();

  // Parents created in the same form are invited too, one notice each.
  const createAndInviteStudent = async (data) => {
    const response = await createStudent(data);
    announceInvitation(response?.data?.emailSent, {
      sent: t('students.invitation.sent', { email: data.email }),
      notSent: t('students.invitation.notSent'),
    });
    for (const parent of response?.data?.parentInvitations ?? []) {
      announceInvitation(parent.emailSent, {
        sent: t('parents.invitation.sent', { email: parent.email }),
        notSent: t('parents.invitation.notSent', { name: parent.name }),
      });
    }
    return response;
  };

  const handleAddClick = async () => {
    const resolvedBusinessDate = isBusinessDateLoading
      ? await refetchBusinessDate()
      : businessDate;

    openDialog({
      title: viewsOtherYear
        ? t('students.dialogs.createTitleForYear', { year: activeYear })
        : t('students.dialogs.createTitle'),
      children: (
        <FullStudentForm
          classes={newStudentClasses}
          feeTypes={feeTypes || []}
          businessDate={resolvedBusinessDate}
          onSubmitStudent={(data) => withAcademicYear(activeYear, () => createAndInviteStudent(data))}
        />
      ),
      width: '4xl',
      height: 'full',
      showButtons: false,
    });
  };

  const handleView = (student) => {
    openDialog({
      children: (
        <StudentProfile
          studentId={student.id}
          onClose={() => pop()}
          onOpenFeeRecord={async (feeId?: string) => {
            await pop();
            const query = feeId ? `?feeId=${encodeURIComponent(feeId)}` : '';
            router.push(`/students/${student.id}/fees${query}`);
          }}
        />
      ),
      width: 'full',
      height: 'full',
      showButtons: false,
      padding: 'none',
      className: 'student-profile-dialog',
    });
  };

  const handleEdit = (student) => {
    openDialog({
      title: `${t('students.dialogs.editTitle')} - ${student.name}`,
      children: <SimpleStudentForm student={student} classes={classes} canCorrect={role === 'admin' || role === 'principal'} />,
      width: '4xl',
      height: 'full',
      primaryButton: {
        form: 'student-form',
        text: t('students.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (combinedData) => {
          await withAcademicYear(viewingYear, () => updateStudent(combinedData));
        }
      }
    });
  };

  const handleDelete = (student) => {
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: student.name,
      confirmText: t('students.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteStudent(student.id);
      }
    });
  };

  const handleBulkDelete = (ids) => {
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: t('students.dialogs.bulkDeleteItemName', { count: ids.length }),
      confirmText: t('students.dialogs.deleteButton'),
      loading: isBulkDeleting,
      onConfirm: async () => {
        await bulkDeleteStudents(ids);
        setRowSelection({});
      }
    });
  };

  const total = students?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full min-h-0'>
      <NPageHeader
        icon={GraduationCap}
        title={title}
        subtitle={isCountUnknown(error, students, isStudentsLoading) ? undefined : t('students.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        className='min-h-0 flex-1'
        data={filteredStudents}
        getRowId={(student) => student.id}
        columns={columns}
        filters={filters}
        isFilteredEmpty={filteredStudents.length === 0 && !!students?.length}
        onCreate={canCreate ? handleAddClick : undefined}
        onView={handleView}
        onRowClick={handleView}
        onEdit={canUpdate ? handleEdit : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        onBulkDelete={canDelete ? handleBulkDelete : undefined}
        rowSelection={canDelete ? rowSelection : undefined}
        onRowSelectionChange={canDelete ? setRowSelection : undefined}
        loading={isStudentsLoading}
        error={hasFailedToLoad(error, students) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        loadingText={t('common.loading')}
        renderCard={StudentCard}
        addButtonText={t('students.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.students}
            title={t('emptyStates.students.title')}
            description={t('emptyStates.students.description')}
            action={canCreate ? (
              <NButton size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('students.dialogs.createButton')}
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
        dynamicHeight={true}
      />
    </div>
  );
}

export default StudentsTable;
