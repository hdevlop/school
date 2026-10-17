"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useEffect, useMemo, useState } from 'react';
import { NPageHeader, NPageHeaderActions, NEmptyState, NButton, NErrorState, NForbiddenState, NStatCard, NStatCardSkeleton } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { Banknote, CircleDollarSign, CreditCard, HandCoins, Landmark, Plus, ReceiptText, SearchX, Wallet } from 'lucide-react';
import FeeForm from './FeeForm';
import EditFeeForm from './EditFeeForm';
import { useFees } from '../hooks/useFees';
import { useTranslation } from 'najm-i18n/react';
import FeeCard from './FeeCard';
import { useStudents } from '@/features/Students/hooks/useStudents';
import { useFeeTypes } from '@/features/Financial/FeeTypes/hooks/useFeeTypes';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSections } from '@/features/Sections/hooks/useSections';
import { useRouter } from 'next/navigation';
import { createBulkFeesApi } from '@/services/feeApi';
import { withFeeYear } from '../utils/feeUtils';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import { useFeesTableColumns } from '../hooks/useFeesTableColumns';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useActiveAcademicYear } from '@/features/Settings/hooks/useSettings';
import { useViewingAcademicYear, useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { hasFailedToLoad, isAuthorizationError, isCountUnknown } from '@/services/apiError';
import { toMinorUnits, useSchoolFormat } from '@/hooks/useSchoolFormat';

function FeesTableForYear() {

  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const router = useRouter();
  const { openDialog, confirmDelete } = useDialog();

  const { students } = useStudents();
  const { feeTypes } = useFeeTypes();
  const { classes } = useClasses();
  const { sections } = useSections();
  const { isAcademicYearLoading } = useActiveAcademicYear();
  const { viewingYear } = useViewingAcademicYear();

  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('__all__');

  const {
    fees,
    error,
    isFeesLoading,
    updateFee,
    deleteFee,
    isUpdating,
    isDeleting,
  } = useFees();

  const isAllClasses = selectedClassId === 'all';

  useEffect(() => {
    if (selectedClassId !== 'all' && !classes?.some((schoolClass) => schoolClass.id === selectedClassId)) {
      setSelectedClassId(classes?.[0]?.id || '');
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (selectedSectionId && !sections?.some((section) =>
      section.id === selectedSectionId && (isAllClasses || section.classId === selectedClassId))) {
      setSelectedSectionId('');
    }
  }, [selectedClassId, selectedSectionId, sections, isAllClasses]);

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

  const stats = useMemo(() => filteredFees.reduce((totals, row) => {
    // Fee amounts have two decimal places; sum in minor units to keep totals exact.
    totals.collected += toMinorUnits(row.collectedToDate, 2) ?? 0;
    totals.cash += toMinorUnits(row.collectedCashToDate, 2) ?? 0;
    totals.check += toMinorUnits(row.collectedCheckToDate, 2) ?? 0;
    totals.bankTransfer += toMinorUnits(row.collectedBankTransferToDate, 2) ?? 0;
    totals.tpe += toMinorUnits(row.collectedTpeToDate, 2) ?? 0;
    totals.overdue += toMinorUnits(row.overdueAmount, 2) ?? 0;
    return totals;
  }, { collected: 0, cash: 0, check: 0, bankTransfer: 0, tpe: 0, overdue: 0 }), [filteredFees]);

  const classOptions = useMemo(
    () => [
      { value: 'all', label: t('common.all') || 'All' },
      ...(classes || []).map((c: any) => ({ value: c.id, label: c.name })),
    ],
    [classes, t],
  );

  const sectionOptions = useMemo(
    () => (sections || [])
      .filter((s: any) => isAllClasses || s.classId === selectedClassId)
      .map((s: any) => ({
        value: s.id,
        label: isAllClasses ? `${s.class?.name || classes?.find(c => c.id === s.classId)?.name || ''} - ${s.name}` : s.name,
      })),
    [sections, classes, selectedClassId, isAllClasses],
  );

  const columns = useFeesTableColumns();

  const filters = useMemo(() => [
    {
      name: 'class',
      type: 'combobox',
      showIcon: false,
      placeholder: t('fees.filters.class') || 'Class',
      value: selectedClassId,
      onChange: setSelectedClassId,
      options: classOptions,
      className: 'w-full sm:w-24 xl:w-24',
    },
    {
      name: 'section',
      type: 'select',
      showIcon: false,
      placeholder: t('fees.filters.section'),
      value: selectedSectionId,
      onChange: (value: string) => setSelectedSectionId(value === '__all__' ? '' : value),
      options: [{ value: '__all__', label: t('common.all') }, ...sectionOptions],
      disabled: sectionOptions.length === 0,
      className: 'w-full sm:w-28 xl:w-28',
    },
    {
      name: 'search',
      placeholder: t('fees.filters.searchByStudent') || 'Search student...',
      type: 'text',
      value: searchText,
      onChange: setSearchText,
      className: 'w-full lg:w-52',
    },
    {
      name: 'status',
      type: 'select',
      showIcon: false,
      placeholder: t('fees.filters.filterByStatus') || 'Status',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: '__all__', label: t('common.all') || 'All' },
        { value: 'overdue', label: t('fees.status.overdue') || 'Overdue' },
        { value: 'paying', label: t('fees.status.paying') || 'Paying' },
        { value: 'paid', label: t('fees.status.paid') || 'Paid' },
      ],
      className: 'w-full lg:w-36',
    },
  ], [t, selectedClassId, selectedSectionId, searchText, statusFilter, classOptions, sectionOptions]);

  const handleAddClick = () => {
    if (!viewingYear) return;
    const openedYear = viewingYear;
    openDialog({
      title: t('fees.dialogs.createTitle'),
      children: <FeeForm students={students} feeTypes={feeTypes} />,
      width: '6xl',
      primaryButton: {
        form: 'bulk-fee-form',
        text: t('fees.dialogs.createButton'),
        onClick: async (feeData) => {
          return await withAcademicYear(openedYear, () => createBulkFeesApi(withFeeYear(feeData, openedYear)));
        }
      }
    });
  };

  const handleView = (fee) => {
    router.push(`/students/${fee.student.id}/fees`);
  };

  const handleEdit = (fee) => {
    openDialog({
      title: `${t('fees.dialogs.editTitle')} - ${fee.student?.name}`,
      children: <EditFeeForm fee={fee} feeTypes={feeTypes} />,
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
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: fee.name,
      confirmText: t('fees.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteFee(fee.id);
      },
    });
  };

  const noDataText = !selectedClassId
      ? (t('fees.noData.selectClass') || 'Select a class to view fees')
      : filteredFees.length === 0 && fees?.length > 0
        ? (t('fees.noData.noResults') || 'No students match the current filters')
        : (t('fees.noData.noFees') || 'No fees data available');

  const total = filteredFees.length;
  const failedToLoad = hasFailedToLoad(error, fees);

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={CircleDollarSign}
        title={t('navigation.fees')}
        subtitle={isCountUnknown(error, fees, isFeesLoading || isAcademicYearLoading)
          ? undefined
          : t('fees.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      {isFeesLoading || isAcademicYearLoading ? (
        <div className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => <NStatCardSkeleton key={index} />)}
        </div>
      ) : failedToLoad ? null : (
        <div className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-6">
          <NStatCard
            icon={HandCoins}
            label={t('fees.stats.collected')}
            value={majorMoney(stats.collected / 100)}
            className="min-w-0"
            classNames={{
              icon: 'bg-green-500/10 text-green-600 dark:text-green-400',
              value: 'tabular-nums wrap-anywhere text-green-600 dark:text-green-400',
            }}
          />
          <NStatCard
            icon={Banknote}
            label={t('payments.methods.cash')}
            value={majorMoney(stats.cash / 100)}
            className="min-w-0"
            classNames={{ icon: 'bg-muted text-muted-foreground', value: 'tabular-nums wrap-anywhere' }}
          />
          <NStatCard
            icon={ReceiptText}
            label={t('payments.methods.check')}
            value={majorMoney(stats.check / 100)}
            className="min-w-0"
            classNames={{ icon: 'bg-muted text-muted-foreground', value: 'tabular-nums wrap-anywhere' }}
          />
          <NStatCard
            icon={Landmark}
            label={t('payments.methods.bankTransfer')}
            value={majorMoney(stats.bankTransfer / 100)}
            className="min-w-0"
            classNames={{ icon: 'bg-muted text-muted-foreground', value: 'tabular-nums wrap-anywhere' }}
          />
          <NStatCard
            icon={CreditCard}
            label={t('fees.stats.tpe')}
            value={majorMoney(stats.tpe / 100)}
            className="min-w-0"
            classNames={{ icon: 'bg-muted text-muted-foreground', value: 'tabular-nums wrap-anywhere' }}
          />
          <NStatCard
            icon={Wallet}
            label={t('fees.stats.overdueAmount')}
            value={majorMoney(stats.overdue / 100)}
            className="min-w-0"
            classNames={{
              icon: 'bg-red-500/10 text-red-600 dark:text-red-400',
              value: 'tabular-nums wrap-anywhere text-red-600 dark:text-red-400',
            }}
          />
        </div>
      )}

      <NTable
        data={filteredFees}
        isFilteredEmpty={filteredFees.length === 0 && !!fees?.length}
        columns={columns}
        filters={filters}
        onCreate={handleAddClick}
        onView={handleView}
        onRowClick={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isFeesLoading || isAcademicYearLoading}
        error={failedToLoad ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={FeeCard}
        classNames={{
          cards: 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        }}
        addButtonText={t('fees.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.fees}
            title={noDataText}
            action={(
              <NButton size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('fees.dialogs.createButton')}
              </NButton>
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

export default function FeesTable() {
  return <FeesTableForYear key={useViewingYearKey()} />;
}
