"use client"

import { PermissionButton } from '@/components/PermissionButton';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { Schedule } from '@sms/contracts';
import { NPageHeader, NPageHeaderActions, NEmptyState, NErrorState, NForbiddenState, NStatCard, NStatCardSkeleton } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { Banknote, CircleDollarSign, CreditCard, HandCoins, Landmark, Plus, ReceiptText, SearchX, Wallet } from 'lucide-react';
import FeeForm from './FeeForm';
import EditFeeForm from './EditFeeForm';
import { useFees } from '../hooks/useFees';
import { useTranslation } from 'najm-i18n/react';
import FeeCard from './FeeCard';
import { FeesMobileToolbar, type FeeTableFilter } from './FeesMobileToolbar';
import { defaultFeeSection, resolveFeeRosterSelection, type FeeRosterSelection } from '../utils/feeRosterSelection';
import { useStudents } from '@/features/Students/hooks/useStudents';
import { useFeeTypes } from '@/features/Financial/FeeTypes/hooks/useFeeTypes';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSections } from '@/features/Sections/hooks/useSections';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { createBulkFeesApi, getFeesApi, getFeeSummaryApi, importStudentFeesApi, previewFeeImportDatesApi } from '@/services/feeApi';
import { getFeeTypesApi } from '@/services/feeTypeApi';
import { useQueryClient } from '@tanstack/react-query';
import { buildFeeImport, isFeeReport } from '../config/feeImport';
import { FeesPrintButton } from './FeesPrintButton';
import { FeeImportDatesPreview } from './FeeImportDatesPreview';
import { withFeeYear } from '../utils/feeUtils';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import { useFeesTableColumns } from '../hooks/useFeesTableColumns';
import { buildFeeListFrequencyOptions, getFeeListFrequencyFilter } from '../config/feeOptions';
import { createFeeListFilterMemory, feeListFiltersKey, resolveFeeListFilters, type FeeListFilters } from '../config/feeListFilters';
import { useYearSelectionStore } from '@/features/AcademicYears/store/yearSelectionStore';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useActiveAcademicYear } from '@/features/Settings/hooks/useSettings';
import { useViewingAcademicYear, useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useYearScopedDetail } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { hasFailedToLoad, isAuthorizationError, isCountUnknown } from '@/services/apiError';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { canPerformAction } from '@/shared/actionPermissions';

function CreateFeeForm({ feeTypes }) {
  // The full student picker is needed only after opening the create dialog.
  const { students } = useStudents();
  return <FeeForm students={students} feeTypes={feeTypes} />;
}

const feeListMemory = createFeeListFilterMemory(() => window.sessionStorage);

function FeesTableForYear({ initialFilters, memoryKey }: { initialFilters: FeeListFilters; memoryKey: string | null }) {

  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const router = useRouter();
  const queryClient = useQueryClient();
  const viewer = useViewerRole();
  const canImport = ['create:fees', 'update:fees', 'create:payments', 'update:payments'].every(permission => canPerformAction(viewer, permission));
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number } | null>(null);
  const { openDialog, confirmDelete } = useDialog();

  const { feeTypes, allFeeTypes } = useFeeTypes();
  const { classes, isClassesLoading, error: classesError } = useClasses();
  const { sections, isSectionsLoading, error: sectionsError } = useSections();
  const { isAcademicYearLoading } = useActiveAcademicYear();
  const { viewingYear } = useViewingAcademicYear();

  const [selection, setSelection] = useState<FeeRosterSelection | null>(initialFilters.selection);
  const { classId: selectedClassId, sectionId: selectedSectionId } = resolveFeeRosterSelection(classes, sections, selection);
  const catalogsReady = !isClassesLoading && !isSectionsLoading && !classesError && !sectionsError;
  const rosterReady = Boolean(catalogsReady && selectedClassId);
  const isAllClasses = selectedClassId === 'all';
  const setSelectedClassId = useCallback((classId: string) => {
    setSelection({ classId, sectionId: defaultFeeSection(sections, classId) });
  }, [sections]);
  const setSelectedSectionId = useCallback((sectionId: string) => {
    setSelection({ classId: selectedClassId, sectionId: sectionId === '__all__' ? '' : sectionId });
  }, [selectedClassId]);
  const [searchText, setSearchText] = useState(initialFilters.searchText);
  const [statusFilter, setStatusFilter] = useState(initialFilters.statusFilter);
  const [scheduleFilter, setScheduleFilter] = useState<Schedule | undefined>(initialFilters.scheduleFilter);

  // Keep the filters for this tab, so opening a student's fees and coming
  // back (Back button or sidebar) returns to the same list.
  useEffect(() => {
    if (memoryKey) feeListMemory.write(memoryKey, { selection, statusFilter, scheduleFilter, searchText });
  }, [memoryKey, selection, statusFilter, scheduleFilter, searchText]);

  // Summary cards cover the viewed year independently of table filters;
  // The summary includes only collections and overdue balances through today.
  const { data: stats, isLoading: isSummaryLoading, error: summaryError } = useYearScopedDetail({
    resource: 'fees',
    parts: ['summary'],
    fetch: getFeeSummaryApi,
  });

  const {
    fees,
    error: feesError,
    isFeesLoading,
    updateFee,
    deleteFee,
    isUpdating,
    isDeleting,
    refetch,
  } = useFees({
    ...getFeeListFrequencyFilter(scheduleFilter),
    classId: isAllClasses ? undefined : selectedClassId || undefined,
    sectionId: selectedSectionId || undefined,
    enabled: rosterReady,
  });
  const error = classesError ?? sectionsError ?? feesError;
  const isLoading = isAcademicYearLoading || isClassesLoading || isSectionsLoading || (rosterReady && isFeesLoading);

  const filteredFees = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    // The server already limits the year scope to the viewed year.
    return (fees || []).filter((row: any) => {
      if (!isAllClasses && selectedClassId && row.class?.id !== selectedClassId) return false;
      if (selectedSectionId && row.section?.id !== selectedSectionId) return false;
      if (query && !row.student?.name?.toLowerCase().includes(query)
        && !row.student?.studentCode?.toLowerCase().includes(query)) return false;

      const overdue = Number(row.overdueAmount ?? 0);
      const totalDue = Number(row.totalDue ?? 0);
      if (statusFilter === 'paid' && (Number(row.totalFees ?? 0) === 0 || totalDue > 0)) return false;
      if (statusFilter === 'overdue' && overdue === 0) return false;
      if (statusFilter === 'paying' && (overdue > 0 || totalDue <= 0)) return false;
      return true;
    });
  }, [fees, selectedClassId, selectedSectionId, searchText, statusFilter, isAllClasses]);

  const classOptions = useMemo(
    () => [
      { value: 'all', label: t('fees.filters.allClasses') },
      ...(classes || []).map((c: any) => ({ value: c.id, label: c.name })),
    ],
    [classes, t],
  );

  const sectionOptions = useMemo(
    () => (sections || [])
      .filter((s: any) => s.classId === selectedClassId)
      .map((s: any) => ({ value: s.id, label: s.name })),
    [sections, selectedClassId],
  );

  const columns = useFeesTableColumns();

  const filters = useMemo<FeeTableFilter[]>(() => [
    {
      name: 'class',
      type: 'combobox',
      showIcon: false,
      placeholder: t('fees.filters.class') || 'Class',
      value: selectedClassId,
      onChange: setSelectedClassId,
      options: classOptions,
      className: 'w-full sm:w-40 xl:w-40',
    },
    // A section belongs to one class, so All classes offers none.
    ...(isAllClasses ? [] : [{
      name: 'section',
      type: 'select',
      showIcon: false,
      placeholder: t('fees.filters.section'),
      value: selectedSectionId || '__all__',
      onChange: setSelectedSectionId,
      options: [{ value: '__all__', label: t('fees.filters.allSections') }, ...sectionOptions],
      disabled: sectionOptions.length === 0,
      className: 'w-full sm:w-40 xl:w-40',
    } satisfies FeeTableFilter]),
    {
      name: 'search',
      placeholder: t('fees.filters.searchByStudent') || 'Search student...',
      type: 'text',
      value: searchText,
      onChange: setSearchText,
      className: 'w-full lg:w-52',
    },
    {
      name: 'schedule',
      type: 'select',
      showIcon: false,
      placeholder: t('fees.filters.allSchedules'),
      value: scheduleFilter ?? '',
      onChange: (value: string) => setScheduleFilter(value === '__all__' ? undefined : value as Schedule),
      options: [
        { value: '__all__', label: t('common.all') },
        ...buildFeeListFrequencyOptions(t),
      ],
      className: 'w-full lg:w-56',
    },
    {
      name: 'status',
      type: 'select',
      showIcon: false,
      placeholder: t('fees.filters.filterByStatus') || 'Status',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: '__all__', label: t('fees.filters.allStatuses') },
        { value: 'overdue', label: t('fees.status.overdue') || 'Overdue' },
        { value: 'paying', label: t('fees.status.paying') || 'Paying' },
        { value: 'paid', label: t('fees.status.paid') || 'Paid' },
      ],
      className: 'w-full lg:w-44',
    },
  ], [t, selectedClassId, selectedSectionId, setSelectedClassId, setSelectedSectionId, searchText, statusFilter, scheduleFilter, classOptions, sectionOptions, isAllClasses]);

  const handleAddClick = () => {
    if (!viewingYear) return;
    const openedYear = viewingYear;
    openDialog({
      title: t('fees.dialogs.createTitle'),
      children: <CreateFeeForm feeTypes={feeTypes} />,
      width: '6xl',
      primaryButton: {
        form: 'bulk-fee-form',
        text: t('fees.dialogs.createButton'),
        onClick: async (feeData) => {
          const result = await withAcademicYear(openedYear, () => createBulkFeesApi(withFeeYear(feeData, openedYear)));
          // The server skips a fee type the student already has in that year
          // and still answers with success; say so instead of closing quietly.
          const created = Array.isArray(result?.data) ? result.data.length : 0;
          const skipped = (feeData?.fees?.length ?? 0) - created;
          if (created === 0) {
            toast.error(t('fees.errors.alreadyCharged'));
            throw new Error(t('fees.errors.alreadyCharged'));
          }
          await refetch();
          if (skipped > 0) toast.warning(t('fees.success.someSkipped', { created, skipped }));
          else toast.success(t('fees.success.bulkCreated'));
          return result;
        }
      }
    });
  };

  const handleView = (fee) => {
    router.push(`/students/${fee.student.id}/fees`);
  };

  const toolbarLabels = useMemo(() => ({
    import: t('fees.import.title'),
    importDescription: t('fees.import.description'),
    importConfirm: t('fees.import.confirm'),
    ...(importProgress ? {
      importConfirm: t('fees.import.progress', importProgress),
    } : {}),
  }), [t, importProgress]);

  const handleImport = async (rows: Record<string, unknown>[]) => {
    if (isFeeReport(rows)) throw new Error(t('fees.import.reportFile'));
    if (!viewingYear) throw new Error(t('common.loading'));
    const year = viewingYear;
    setImportProgress({ processed: 0, total: rows.length });
    try {
      const [roster, catalog] = await Promise.all([
        withAcademicYear(year, () => getFeesApi()),
        getFeeTypesApi(),
      ]);
      if (!Array.isArray(roster?.data) || !Array.isArray(catalog?.data)) {
        throw new Error(t('fees.import.catalogUnavailable'));
      }
      const { students: imports, problems } = buildFeeImport(
        rows, roster.data.map(row => row.student), catalog.data.filter(type => type.status === 'active'), year, t,
      );
      if (problems.length) {
        throw new Error(problems.slice(0, 5).map(problem => t('fees.import.problem', problem)).join('\n'));
      }
      const datedStudents = imports.flatMap(student => student.enrollmentDate
        ? [{ studentId: student.studentId, enrollmentDate: student.enrollmentDate }] : []);
      if (datedStudents.length) {
        const { data: changes } = await withAcademicYear(year, () => previewFeeImportDatesApi(datedStudents));
        if (changes.length) {
          if (!['admin', 'principal'].includes(viewer.role ?? '') || !canPerformAction(viewer, 'update:students')) {
            throw new Error(t('fees.import.datesRequireAdmin'));
          }
          let confirmed = false;
          await openDialog({
            title: t('fees.import.datesTitle'),
            description: t('fees.import.datesDescription', { count: changes.length }),
            width: 'xl',
            children: <FeeImportDatesPreview changes={changes} />,
            primaryButton: { text: t('fees.import.datesApply'), onClick: () => { confirmed = true; } },
          });
          if (!confirmed) throw new Error(t('fees.import.datesCancelled'));
          for (const change of changes) {
            const student = imports.find(student => student.studentId === change.studentId);
            if (student) student.dateCorrection = change.correction;
          }
        }
      }
      let created = 0, receipts = 0, reused = 0;
      const failed: string[] = [];
      setImportProgress({ processed: 0, total: imports.length });
      for (const [index, student] of imports.entries()) {
        try {
          const result = await withAcademicYear(year, () => importStudentFeesApi(student));
          created += result.data.createdFees;
          receipts += result.data.createdPayments;
          reused += result.data.reusedFees + result.data.reusedPayments;
        } catch (cause) {
          failed.push(t('fees.import.problem', {
            row: student.row, message: cause instanceof Error ? cause.message : t('fees.import.failed', { count: 1 }),
          }));
        }
        setImportProgress({ processed: index + 1, total: imports.length });
      }
      await Promise.all(['fees', 'installments', 'payments', 'students', 'student-enrollments'].map(resource => queryClient.invalidateQueries({ queryKey: [resource] })));
      if (failed.length) {
        toast.error(t('fees.import.failed', { count: failed.length }));
        throw new Error(failed.slice(0, 5).join('\n'));
      }
      toast.success(t('fees.import.imported', { fees: created, payments: receipts, reused }));
    } finally {
      setImportProgress(null);
    }
  };

  const handleEdit = (fee) => {
    openDialog({
      title: `${t('fees.dialogs.editTitle')} - ${fee.student?.name}`,
      children: <EditFeeForm fee={fee} feeTypes={allFeeTypes} />,
      width: 'xl',
      primaryButton: {
        form: 'simple-fee-form',
        text: t('fees.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (feeData) => {
          await updateFee(feeData);
        },
      },
    });
  };

  const handleDelete = (fee) => {
    const forceRemove = viewer.role === 'admin';
    confirmDelete({
      title: t('common.delete'),
      warningText: t(forceRemove ? 'fees.dialogs.forceRemoveWarning' : 'common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: fee.name,
      confirmText: t(forceRemove ? 'fees.dialogs.forceRemoveButton' : 'fees.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteFee(fee.id);
      },
    });
  };

  const isFilteredEmpty = filteredFees.length === 0 && (catalogsReady || scheduleFilter !== undefined || !!fees?.length);
  const noDataText = !selectedClassId
      ? (t('fees.noData.selectClass') || 'Select a class to view fees')
      : isFilteredEmpty
        ? (t('fees.noData.noResults') || 'No students match the current filters')
        : (t('fees.noData.noFees') || 'No fees data available');

  const total = filteredFees.length;
  const failedToLoad = hasFailedToLoad(error, fees);

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={CircleDollarSign}
        title={t('navigation.fees')}
        subtitle={isCountUnknown(error, fees, isLoading)
          ? undefined
          : t('fees.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      {isSummaryLoading ? (
        <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
          {Array.from({ length: 7 }, (_, index) => <NStatCardSkeleton key={index} />)}
        </div>
      ) : hasFailedToLoad(summaryError, stats ? [stats] : []) ? (
        isAuthorizationError(summaryError)
          ? <NForbiddenState surface="panel" />
          : <NErrorState surface="panel" />
      ) : (
        <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
          <NStatCard
            icon={HandCoins}
            label={t('fees.stats.collected')}
            value={majorMoney(stats?.collected ?? 0)}
            className="min-w-0"
            classNames={{
              icon: 'bg-green-500/10 text-green-600 dark:text-green-400',
              value: 'tabular-nums wrap-anywhere text-green-600 dark:text-green-400',
            }}
          />
          <NStatCard
            icon={Banknote}
            label={t('payments.methods.cash')}
            value={majorMoney(stats?.cash ?? 0)}
            className="min-w-0"
            classNames={{ icon: 'bg-muted text-muted-foreground', value: 'tabular-nums wrap-anywhere' }}
          />
          <NStatCard
            icon={ReceiptText}
            label={t('payments.methods.check')}
            value={majorMoney(stats?.check ?? 0)}
            className="min-w-0"
            classNames={{ icon: 'bg-muted text-muted-foreground', value: 'tabular-nums wrap-anywhere' }}
          />
          <NStatCard
            icon={Landmark}
            label={t('payments.methods.bankTransfer')}
            value={majorMoney(stats?.bankTransfer ?? 0)}
            className="min-w-0"
            classNames={{ icon: 'bg-muted text-muted-foreground', value: 'tabular-nums wrap-anywhere' }}
          />
          <NStatCard
            icon={Landmark}
            label={t('payments.methods.bankDeposit')}
            value={majorMoney(stats?.bankDeposit ?? 0)}
            className="min-w-0"
            classNames={{ icon: 'bg-muted text-muted-foreground', value: 'tabular-nums wrap-anywhere' }}
          />
          <NStatCard
            icon={CreditCard}
            label={t('fees.stats.tpe')}
            value={majorMoney(stats?.tpe ?? 0)}
            className="min-w-0"
            classNames={{ icon: 'bg-muted text-muted-foreground', value: 'tabular-nums wrap-anywhere' }}
          />
          <NStatCard
            icon={Wallet}
            label={t('fees.stats.overdueToDate')}
            value={majorMoney(stats?.overdue ?? 0)}
            subtext={t('fees.stats.futureInstallmentsExcluded')}
            className="min-w-0"
            classNames={{
              icon: 'bg-red-500/10 text-red-600 dark:text-red-400',
              value: 'tabular-nums wrap-anywhere text-red-600 dark:text-red-400',
            }}
          />
        </div>
      )}

      <NTable
        exportTitle={viewingYear ? `${t('navigation.fees')} ${viewingYear}` : t('navigation.fees')}
        permissionResource="fees"
        data={filteredFees}
        isFilteredEmpty={isFilteredEmpty}
        columns={columns}
        dataActions
        toolbarActionDisplay="settings"
        onDataChange={handleImport}
        showImportButton={canImport}
        toolbarLabels={toolbarLabels}
        filters={filters}
        renderToolbar={() => (
          <>
            <FeesMobileToolbar filters={filters} onCreate={handleAddClick} loading={isLoading} />
            <div className="hidden md:flex">
              <FeesPrintButton loading={isLoading} />
            </div>
          </>
        )}
        onCreate={handleAddClick}
        onView={handleView}
        onRowClick={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
        error={failedToLoad ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={FeeCard}
        classNames={{
          header: '[&_[data-ntable-mobile-toolbar]]:hidden max-md:[&_[data-school-create-action]]:hidden',
          cards: 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        }}
        addButtonText={t('fees.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.fees}
            title={noDataText}
            action={(
              <PermissionButton permission="create:fees" size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('fees.dialogs.createButton')}
              </PermissionButton>
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
        defaultMode='cards'
        showCheckbox
      />
    </div>
  );
}

function FeesTableEntry() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const yearKey = useViewingYearKey();
  const accountId = useYearSelectionStore(state => state.accountId);
  // The year resolves on the client after the account is known, so storage is
  // read only after hydration.
  const memoryKey = accountId && yearKey !== 'resolving' ? feeListFiltersKey(accountId, yearKey) : null;
  const initialFilters = resolveFeeListFilters(status, memoryKey ? feeListMemory.read(memoryKey) : undefined);

  // Once a `?status=` link has been applied and remembered, drop it from the
  // address, so Back from a student returns to the tab's later filters.
  useEffect(() => {
    if (!status || !memoryKey) return;
    const rest = new URLSearchParams(searchParams.toString());
    rest.delete('status');
    const query = rest.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  }, [status, memoryKey, searchParams, pathname, router]);

  return <FeesTableForYear key={`${yearKey}:${status ?? ''}`} initialFilters={initialFilters} memoryKey={memoryKey} />;
}

export default function FeesTable() {
  return <Suspense><FeesTableEntry /></Suspense>;
}
