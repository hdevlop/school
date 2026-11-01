"use client"

import { PermissionButton } from '@/components/PermissionButton';
import { BulkDeleteDialog } from '@/components/BulkDeleteDialog';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { NPageHeader, NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState, useTableStore, useResolvedToolbarLabels, type ContextMenuItem } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { TablePrintButton } from '@/components/TablePrintButton';
import { Eye, Pencil, Trash2, LogOut, Plus, Upload } from 'lucide-react';
import FullStudentForm from './FullStudentForm';
import { useStudents } from '../hooks/useStudents';
import { useTranslation } from 'najm-i18n/react';
import StudentCard from './StudentCard';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useFeeTypes } from '@/features/Financial/FeeTypes/hooks/useFeeTypes';
import { getAvailableFeeTypes } from '@/features/Financial/FeeTypes/config/feeTypeOptions';
import { getFeeTypesApi } from '@/services/feeTypeApi';
import SimpleStudentForm from './SimpleStudentForm';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import { useStudentsTableColumns } from '../hooks/useStudentsTableColumns';
import { useStudentsTableFilters } from '../hooks/useStudentsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useRouter } from 'next/navigation';
import { useBusinessDate } from '@/features/Settings/hooks/useSettings';
import { useMemo, useRef, useState } from 'react';
import type { Table } from '@tanstack/react-table';
import { useStudentsPrint } from '../hooks/useStudentsPrint';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';
import { importStudentApi, deleteStudentApi } from '@/services/studentApi';
import { deleteSelection, type DeleteSelectionProgress } from '@/shared/deleteSelection';
import { buildStudentImport, type StudentImportFeeType } from '../config/studentImport';
import { announceInvitation } from '@/shared/invitationNotice';
import { useAcademicYearOptions, useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { teachingDateWithinYear } from '@/features/AcademicYears/utils/viewingYear';
import { localDateInput } from 'najm-kit/format';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { usePermissions } from 'najm-auth/client/react';
import { useRememberedTableMode } from '@/hooks/useRememberedTableMode';
import { focusTableForKeyboard } from '@/shared/focusTableForKeyboard';

import { useDisableStudent } from '../hooks/useDisableStudent';
import { getStudentRowClassName, isStudentDisabled } from '../config/studentActivity';

interface StudentImportProgress {
  phase: 'checking' | 'importing' | 'refreshing';
  total: number;
  processed: number;
  created: number;
  failed: number;
}

function StudentsImportButton() {
  const { t } = useTranslation();
  const actions: ContextMenuItem[] = useTableStore.use.toolbarActions();
  const labels = useResolvedToolbarLabels(useTableStore.use.toolbarLabels());
  const importAction = actions.find(action => action.label === (labels.import ?? 'Import'));
  if (!importAction) return null;

  return (
    <PermissionButton
      permission="create:students"
      type="button"
      variant="outline"
      size="sm"
      onClick={() => importAction.onSelect?.()}
    >
      <Upload aria-hidden="true" className="h-4 w-4" />
      {t('students.import.button')}
    </PermissionButton>
  );
}

function StudentsTable() {

  const { t } = useTranslation();
  const tableMode = useRememberedTableMode('students');
  const router = useRouter();
  // A parent sees their children here and a student themselves, read-only.
  const { role, isFamily } = useViewerRole();
  const { can } = usePermissions();
  const canCreate = !isFamily && can('create:students');
  const title = role === 'parent' ? t('navigation.myChildren')
    : role === 'student' ? t('navigation.myProfile') : t('navigation.students');
  const { classes, refetch: refetchClasses } = useClasses();
  // A new student is placed in the active year, as the server requires,
  // whichever year is viewed, so the form offers the active year's classes.
  const { viewingYear, activeYear } = useViewingAcademicYear();
  const disableStudent = useDisableStudent(viewingYear ?? activeYear);
  const viewsOtherYear = !!viewingYear && !!activeYear && viewingYear !== activeYear;
  const { classes: activeYearClasses, refetch: refetchActiveYearClasses } = useClasses({ academicYear: activeYear, enabled: viewsOtherYear });
  const newStudentClasses = viewsOtherYear ? activeYearClasses : classes;
  // Fee types fill the new-student form and match the fees of an imported file.
  const { feeTypes } = useFeeTypes({ enabled: canCreate });
  const { businessDate, isBusinessDateLoading, refetchBusinessDate } = useBusinessDate();
  const { data: registeredYears } = useAcademicYearOptions();
  const activeYearCalendar = registeredYears?.years.find((year) => year.label === activeYear);
  const columns = useStudentsTableColumns();

  const {
    students,
    createStudent,
    updateStudent,
    deleteStudent,
    error,
    isStudentsLoading,
    isUpdating,
    isDeleting,
  } = useStudents();
  const { filters, filteredStudents } = useStudentsTableFilters(students);
  const printTable = useRef<Table<any> | null>(null);
  const printDetails = filters.filter(filter => ['classScope', 'sectionScope'].includes(filter.name) && filter.value)
    .map(filter => ({
      label: filter.name === 'classScope' ? t('students.table.class') : t('students.table.section'),
      value: ('options' in filter ? filter.options?.find(option => option.value === filter.value)?.label : '') ?? '',
    }));
  const printStudents = useStudentsPrint({ title, academicYear: viewingYear ?? activeYear, details: printDetails });
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [importProgress, setImportProgress] = useState<StudentImportProgress | null>(null);

  const { openDialog, confirmDelete } = useDialog();

  // Parents created in the same form are invited too, one notice each.
  const createAndInviteStudent = async (data) => {
    const response = await createStudent(data);
    announceInvitation(response?.data?.emailSent, data.email, {
      sent: t('students.invitation.sent', { email: data.email }),
      notSent: t('students.invitation.notSent'),
    });
    for (const parent of response?.data?.parentInvitations ?? []) {
      announceInvitation(parent.emailSent, parent.email, {
        sent: t('parents.invitation.sent', { email: parent.email }),
        notSent: t('parents.invitation.notSent', { name: parent.name }),
      });
    }
    return response;
  };

  const handleAddClick = async () => {
    // Only a successful lookup can establish that setup is missing. Refresh
    // before opening so a loading or failed request never looks like no classes.
    if (!activeYear) return;
    const classResult = await (viewsOtherYear ? refetchActiveYearClasses() : refetchClasses());
    if (classResult.isError || !Array.isArray(classResult.data?.data)) {
      toast.error(t('students.form.classesLoadFailed'));
      return;
    }
    const resolvedBusinessDate = isBusinessDateLoading
      ? await refetchBusinessDate()
      : businessDate;

    openDialog({
      title: viewsOtherYear
        ? t('students.dialogs.createTitleForYear', { year: activeYear })
        : t('students.dialogs.createTitle'),
      children: (
        <FullStudentForm
          classes={classResult.data.data}
          feeTypes={feeTypes || []}
          // A new student is placed in the active year, which refuses an
          // admission outside it; after that year ends, today would be.
          businessDate={teachingDateWithinYear(resolvedBusinessDate ?? localDateInput(), activeYearCalendar)}
          onSubmitStudent={(data) => withAcademicYear(activeYear, () => createAndInviteStudent(data))}
        />
      ),
      width: '4xl',
      height: 'full',
      showButtons: false,
    });
  };

  const handleView = (student) => {
    router.push(`/students/${student.id}`);
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
          await withAcademicYear(viewingYear, () => updateStudent(combinedData));
        }
      }
    });
  };

  const handleDelete = (student) => {
    confirmDelete({
      title: t('common.delete'),
      warningText: t('students.dialogs.deleteWarning'),
      cancelText: t('common.cancel'),
      itemName: student.name,
      confirmText: t('students.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await withAcademicYear(viewingYear, () => deleteStudent(student.id));
        await queryClient.invalidateQueries();
      },
    });
  };

  const queryClient = useQueryClient();
  const handleBulkDelete = (ids: string[]) => {
    const total = new Set(ids).size;
    openDialog({
      title: t('common.delete'),
      size: 'sm',
      render: ({ dialog, zIndex, confirm, cancel, onOpenChange }) => (
        <BulkDeleteDialog
          title={dialog.title}
          total={total}
          itemName={t('students.dialogs.bulkDeleteItemName', { count: total })}
          warningText={t('students.dialogs.deleteWarning')}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          loading={dialog.primaryButton?.loading}
          zIndex={zIndex}
          onOpenChange={onOpenChange}
          onCancel={() => cancel()}
          onConfirm={onProgress => confirm(onProgress)}
        />
      ),
      primaryButton: {
        onClick: async (onProgress: (progress: DeleteSelectionProgress) => void) => {
          const result = await deleteSelection(ids, id => withAcademicYear(viewingYear, () => deleteStudentApi(id)), onProgress);
          setRowSelection(Object.fromEntries(result.failed.map(({ id }) => [id, true])));
          await Promise.all(['students', 'parents', 'fees'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
          if (result.deleted.length) toast.success(t('common.deletedCount', { count: result.deleted.length }));
          if (result.failed.length) toast.error(t('common.deleteFailedCount', { count: result.failed.length }), {
            description: [...new Set(result.failed.map(item => item.message))].join(' · '),
          });
        },
      },
    });
  };
  const toolbarLabels = useMemo(() => {
    const labels = { importDescription: t('students.import.description') };
    if (!importProgress) return labels;

    const percent = importProgress.total ? Math.floor(importProgress.processed / importProgress.total * 100) : 0;
    const progress = t('students.import.progress', { ...importProgress, percent });
    return {
      ...labels,
      importPreview: () => importProgress.phase === 'checking'
        ? t('students.import.checking', { count: importProgress.total })
        : progress,
      importConfirm: importProgress.phase === 'refreshing'
        ? t('students.import.refreshing')
        : importProgress.phase === 'checking'
          ? t('common.processing')
          : t('students.import.importing', { percent }),
    };
  }, [t, importProgress]);

  // Rows are checked first and a file with any mistake creates nobody; the
  // NTable dialog stays open and shows why. Students are then created one at
  // a time in the active year, through the import route that permits missing
  // guardian contacts. A row the server refuses does not stop the others.
  const handleImport = async (rows: Record<string, unknown>[]) => {
    setImportProgress({ phase: 'checking', total: rows.length, processed: 0, created: 0, failed: 0 });
    try {
      // Seeding may have added templates since the table's query was cached.
      const hasFees = rows.some(row => Array.isArray(row.fees) && row.fees.length > 0);
      const [catalog, admissionDate] = await Promise.all([
        hasFees ? getFeeTypesApi() : Promise.resolve({ data: [] }),
        refetchBusinessDate(),
      ]);
      if (!Array.isArray(catalog?.data)) throw new Error(t('fees.import.catalogUnavailable'));
      const importFeeTypes = getAvailableFeeTypes<StudentImportFeeType>(catalog.data);
      const { students: payloads, problems } = buildStudentImport(rows, newStudentClasses ?? [], admissionDate, importFeeTypes);
      if (problems.length) {
        throw new Error(problems.slice(0, 5).map(({ row, reason, value }) =>
          t('students.import.problem', { row, reason: t(`students.import.reasons.${reason}`, { value: value ?? '' }) })).join(' · '));
      }

      const failed: string[] = [];
      setImportProgress({ phase: 'importing', total: payloads.length, processed: 0, created: 0, failed: 0 });
      for (const [index, payload] of payloads.entries()) {
        try {
          // The year header binds only to a request started inside the scope.
          await withAcademicYear(activeYear, () => importStudentApi(payload));
        } catch (cause) {
          failed.push(t('students.import.problem', { row: index + 2, reason: cause instanceof Error ? cause.message : '' }));
        }
        setImportProgress({
          phase: 'importing', total: payloads.length, processed: index + 1,
          created: index + 1 - failed.length, failed: failed.length,
        });
      }
      setImportProgress(current => current && { ...current, phase: 'refreshing' });
      await Promise.all(['students', 'parents', 'users'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));

      const created = payloads.length - failed.length;
      if (!created && failed.length) {
        throw new Error(`${t('students.import.failed', { count: failed.length })}\n${failed.slice(0, 5).join('\n')}`);
      }
      if (created) toast.success(t('students.import.created', { count: created }));
      if (failed.length) {
        toast.error(t('students.import.failed', { count: failed.length }), { description: failed.slice(0, 5).join('\n') });
      }
    } finally {
      setImportProgress(null);
    }
  };

  const total = filteredStudents.filter(student => !isStudentDisabled(student)).length;
  const isStudentListEmpty = !isCountUnknown(error, students, isStudentsLoading) && students?.length === 0;

  return (
    <div data-list-loading={isStudentsLoading || undefined} className='flex flex-col gap-2 w-full h-full min-h-0' onPointerDownCapture={focusTableForKeyboard}>
      <NPageHeader
        icon={FEATURE_ICONS.students}
        title={title}
        subtitle={isCountUnknown(error, students, isStudentsLoading) ? undefined : t('students.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        exportTitle={viewingYear ? `${title} ${viewingYear}` : title}
        onPrint={() => printStudents(printTable.current)}
        permissionResource="students"
        className='min-h-0 flex-1'
        classNames={{
          cards: 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
          header: isStudentListEmpty ? 'hidden' : undefined,
          tableHeader: '[&_th:has(.student-name-column)]:w-[18%] [&_th:has(.student-arabic-name-column)]:w-[14%] [&_th:has(.student-email-column)]:w-[18%] [&_th:has(.student-class-column)]:w-[7%] [&_th:has(.student-section-column)]:w-[8%] [&_th:has(.student-gender-column)]:w-[8%] [&_th:last-child]:w-12',
        }}
        data={filteredStudents}
        getRowId={(student) => student.id}
        getRowClassName={getStudentRowClassName}
        menuButton
        menu={{ row: (student) => [
          { label: t('common.view'), icon: Eye, onSelect: () => handleView(student) },
          ...(!isFamily ? [
            { label: t('common.edit'), icon: Pencil, permission: 'update:students', onSelect: () => handleEdit(student) },
            { label: t('students.enrollment.disable'), icon: LogOut,
              disabled: !['admin', 'principal'].includes(role ?? '') || isStudentDisabled(student),
              onSelect: () => disableStudent(student) },
            { label: t('common.delete'), icon: Trash2, permission: 'delete:students', danger: true, separatorBefore: true, onSelect: () => handleDelete(student) },
          ] : []),
        ] }}
        columns={columns}
        filters={filters}
        isFilteredEmpty={filteredStudents.length === 0 && !!students?.length}
        onCreate={isFamily ? undefined : handleAddClick}
        onView={handleView}
        onRowClick={handleView}
        onEdit={isFamily ? undefined : handleEdit}
        onDelete={isFamily ? undefined : handleDelete}
        onBulkDelete={isFamily ? undefined : handleBulkDelete}
        showDeleteSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        dataActions={true}
        toolbarActionDisplay='settings'
        headerSlot={<TablePrintButton loading={isStudentsLoading} tableRef={printTable} />}
        showImportButton={canCreate}
        onDataChange={canCreate ? handleImport : undefined}
        toolbarLabels={toolbarLabels}
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
              <div className="flex flex-wrap items-center justify-center gap-2">
                <PermissionButton permission="create:students" size="sm" onClick={handleAddClick}>
                  <Plus className="h-4 w-4" />
                  {t('students.dialogs.createButton')}
                </PermissionButton>
                <StudentsImportButton />
              </div>
            ) : undefined}
          />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.students}
            title={t('emptyStates.filtered.title')}
            description={t('emptyStates.filtered.description')}
          />
        )}
        {...tableMode}
        dynamicHeight={true}
      />
    </div>
  );
}

export default StudentsTable;
