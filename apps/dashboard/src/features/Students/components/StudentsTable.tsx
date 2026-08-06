"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { GraduationCap } from 'lucide-react';
import FullStudentForm from './FullStudentForm';
import StudentProfile from './StudentProfile';
import { useStudents } from '../hooks/useStudents';
import { useTranslation } from '@/hooks/useLanguage';
import StudentCard from './StudentCard';
import { useClasses } from '@/hooks/useClasses';
import { useFeeTypes } from '@/features/Financial/FeeTypes/hooks/useFeeTypes';
import SimpleStudentForm from './SimpleStudentForm';
import { useStudentsTableColumns } from '../hooks/useStudentsTableColumns';
import { useStudentsTableFilters } from '../hooks/useStudentsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useRouter } from 'next/navigation';
import { useBusinessDate } from '@/features/Settings/hooks/useSettings';
import { useState } from 'react';

function StudentsTable() {

  const { t } = useTranslation();
  const router = useRouter();
  const { classes } = useClasses();
  const { feeTypes } = useFeeTypes();
  const { businessDate, isBusinessDateLoading, refetchBusinessDate } = useBusinessDate();
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const columns = useStudentsTableColumns();
  const rawFilters = useStudentsTableFilters(classes);

  const {
    students,
    createStudent,
    updateStudent,
    deleteStudent,
    bulkDeleteStudents,
    isStudentsLoading,
    isUpdating,
    isDeleting,
    isBulkDeleting
  } = useStudents();

  const { openDialog, confirmDelete, pop } = useConfirmDelete();

  const handleAddClick = async () => {
    const resolvedBusinessDate = isBusinessDateLoading
      ? await refetchBusinessDate()
      : businessDate;

    openDialog({
      title: t('students.dialogs.createTitle'),
      children: (
        <FullStudentForm
          classes={classes}
          feeTypes={feeTypes || []}
          businessDate={resolvedBusinessDate}
          onSubmitStudent={createStudent}
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
      children: <SimpleStudentForm student={student} classes={classes} />,
      width: '4xl',
      height: 'full',
      primaryButton: {
        form: 'student-form',
        text: t('students.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (combinedData) => {
          await updateStudent(combinedData);
        }
      }
    });
  };

  const handleDelete = (student) => {
    confirmDelete({
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
        title={t('navigation.students')}
        subtitle={t('students.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        className='min-h-0 flex-1'
        data={students}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onRowClick={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        loading={isStudentsLoading}
        loadingText={t('common.loading')}
        renderCard={StudentCard}
        addButtonText={t('students.dialogs.createButton')}
        defaultMode='cards'
        dynamicHeight={true}
      />
    </div>
  );
}

export default StudentsTable;
