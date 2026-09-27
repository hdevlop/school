"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useEffect, useMemo, useState } from 'react';
import { useDialog, NPageHeader, NPageHeaderActions, NTable, NEmptyState, NButton, NErrorState, NForbiddenState } from 'najm-kit';
import { CircleDollarSign, Plus, SearchX } from 'lucide-react';
import FeeForm from './FeeForm';
import ClassBulkFeeForm from './ClassBulkFeeForm';
import EditFeeForm from './EditFeeForm';
import { useFees } from '../hooks/useFees';
import { useTranslation } from 'najm-i18n/react';
import FeeCard from './FeeCard';
import { useStudents } from '@/features/Students/hooks/useStudents';
import { useFeeTypes } from '@/features/Financial/FeeTypes/hooks/useFeeTypes';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSections } from '@/features/Sections/hooks/useSections';
import { useRouter } from 'next/navigation';
import { createBulkClassFeesApi, createBulkFeesApi } from '@/services/feeApi';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { withFeeYear } from '../utils/feeUtils';
import { useFeesTableColumns } from '../hooks/useFeesTableColumns';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useActiveAcademicYear } from '@/features/Settings/hooks/useSettings';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { hasFailedToLoad, isAuthorizationError } from '@/services/apiError';

type FeeScope = 'year' | 'outstanding';

function FeesTableForYear() {

  const { t } = useTranslation();
  const router = useRouter();
  const { openDialog, confirmDelete } = useDialog();
  const queryClient = useQueryClient();

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
  const [feeScope, setFeeScope] = useState<FeeScope>('year');
  // The list holds only the viewed year's fees. The outstanding scope keeps
  // other years' debts discoverable without adding them to that year's rows
  // and totals.
  const showOutstanding = feeScope === 'outstanding';

  const {
    fees,
    error,
    isFeesLoading,
    updateFee,
    deleteFee,
    isUpdating,
    isDeleting,
  } = useFees({ allYears: showOutstanding });

  // All-year rows carry each student's current class, so that scope filters
  // on the classes its rows name rather than on the viewed year's classes.
  const filterClasses = useMemo(() => {
    if (!showOutstanding) return classes;
    const byId = new Map<string, { id: string; name: string }>();
    for (const row of fees || []) {
      if (row.class?.id) byId.set(row.class.id, { id: row.class.id, name: row.class.name });
    }
    return [...byId.values()];
  }, [showOutstanding, classes, fees]);

  const filterSections = useMemo(() => {
    if (!showOutstanding) return sections;
    const byId = new Map<string, { id: string; name: string; classId: string }>();
    for (const row of fees || []) {
      if (row.section?.id) byId.set(row.section.id, { id: row.section.id, name: row.section.name, classId: row.class?.id });
    }
    return [...byId.values()];
  }, [showOutstanding, sections, fees]);

  const isAllClasses = selectedClassId === 'all';

  useEffect(() => {
    if (selectedClassId !== 'all' && !filterClasses?.some((schoolClass) => schoolClass.id === selectedClassId)) {
      setSelectedClassId(filterClasses?.[0]?.id || '');
    }
  }, [filterClasses, selectedClassId]);

  useEffect(() => {
    if (isAllClasses) {
      setSelectedSectionId('');
      return;
    }
    if (selectedClassId && filterSections?.length > 0) {
      const classSections = filterSections.filter((s: any) => s.classId === selectedClassId);
      const sectionA = classSections.find((s: any) => s.name?.toUpperCase() === 'A');
      setSelectedSectionId(sectionA?.id || classSections[0]?.id || '');
    }
  }, [selectedClassId, filterSections, isAllClasses]);

  const filteredFees = useMemo(() => {
    if (!fees) return [];

    return fees.filter((row: any) => {
      // The server already limits the year scope to the viewed year.
      if (showOutstanding && Number(row.totalDue ?? 0) <= 0) return false;
      if (!isAllClasses && selectedClassId && row.class?.id !== selectedClassId) return false;

      if (!isAllClasses && selectedSectionId && row.section?.id !== selectedSectionId) return false;

      if (searchText) {
        const q = searchText.toLowerCase();
        const name = row.student?.name?.toLowerCase() || '';
        const code = row.student?.studentCode?.toLowerCase() || '';
        if (!name.includes(q) && !code.includes(q)) return false;
      }

      if (statusFilter && statusFilter !== '__all__') {
        const overdue = Number(row.overdueCount ?? 0);
        const totalDue = Number(row.totalDue ?? 0);

        if (statusFilter === 'paid' && totalDue > 0) return false;
        if (statusFilter === 'overdue' && overdue === 0) return false;
        if (statusFilter === 'paying' && (overdue > 0 || totalDue <= 0)) return false;
      }

      return true;
    });
  }, [fees, showOutstanding, selectedClassId, selectedSectionId, searchText, statusFilter, isAllClasses]);

  const classOptions = useMemo(
    () => [
      { value: 'all', label: t('common.all') || 'All' },
      ...(filterClasses || []).map((c: any) => ({ value: c.id, label: c.name })),
    ],
    [filterClasses, t],
  );

  const sectionOptions = useMemo(
    () => isAllClasses
      ? []
      : (filterSections || [])
          .filter((s: any) => s.classId === selectedClassId)
          .map((s: any) => ({ value: s.id, label: s.name })),
    [filterSections, selectedClassId, isAllClasses],
  );

  const columns = useFeesTableColumns();

  const filters = useMemo(() => [
    {
      name: 'scope',
      type: 'select',
      placeholder: t('fees.historyView.scope'),
      value: feeScope,
      onChange: (scope: FeeScope) => {
        setFeeScope(scope);
        setSelectedClassId('all');
      },
      options: [
        { value: 'year', label: t('fees.historyView.scopeYear', { year: viewingYear ?? '' }) },
        { value: 'outstanding', label: t('fees.historyView.scopeOutstanding') },
      ],
      className: 'w-full lg:w-56',
    },
    {
      name: 'class',
      type: 'combobox',
      placeholder: t('fees.filters.class') || 'Class',
      value: selectedClassId,
      onChange: setSelectedClassId,
      options: classOptions,
      className: 'w-full lg:w-32',
    },
    {
      name: 'section',
      type: 'select',
      placeholder: isAllClasses
        ? (t('fees.filters.selectClass') || 'Select a class')
        : sectionOptions.length === 0
          ? (t('fees.filters.noSections') || 'No sections')
          : (t('fees.filters.section') || 'Section'),
      value: selectedSectionId,
      onChange: setSelectedSectionId,
      options: sectionOptions,
      disabled: isAllClasses || sectionOptions.length === 0,
      className: 'w-full lg:w-28',
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
  ], [t, feeScope, viewingYear, selectedClassId, selectedSectionId, searchText, statusFilter, classOptions, sectionOptions, isAllClasses]);

  const handleAddClick = () => {
    openDialog({
      title: t('fees.dialogs.createTitle'),
      children: <FeeForm students={students} feeTypes={feeTypes} />,
      width: '6xl',
      primaryButton: {
        form: 'bulk-fee-form',
        text: t('fees.dialogs.createButton'),
        onClick: async (feeData) => {
          return await createBulkFeesApi(withFeeYear(feeData, viewingYear));
        }
      }
    });
  };

  const handleClassFeeClick = () => {
    openDialog({
      title: t('fees.classBulk.title'),
      children: <ClassBulkFeeForm classes={classes} feeTypes={feeTypes} />,
      width: '6xl',
      primaryButton: {
        form: 'class-bulk-fee-form',
        text: t('fees.classBulk.action'),
        onClick: async (feeData) => {
          const response = await createBulkClassFeesApi(feeData);
          const result = response?.data ?? response;
          await queryClient.invalidateQueries({ queryKey: ['fees'] });
          toast[result.errors?.length ? 'warning' : 'success'](t('fees.classBulk.result', {
            created: result.created ?? 0,
            skipped: result.skipped ?? 0,
            failed: result.errors?.length ?? 0,
          }));
          return response;
        },
      },
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

  const noDataText = showOutstanding
    ? t('fees.historyView.noOutstanding')
    : !selectedClassId
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
        subtitle={failedToLoad
          ? undefined
          : t(showOutstanding ? 'fees.historyView.outstandingCount' : 'fees.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
          {!showOutstanding && viewingYear && (
            <NButton size="sm" variant="outline" onClick={handleClassFeeClick} disabled={!classes?.length}>
              {t('fees.classBulk.action')}
            </NButton>
          )}
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={filteredFees}
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
  const { viewingYear, isResolving } = useViewingAcademicYear();
  return <FeesTableForYear key={isResolving ? 'resolving' : `year:${viewingYear ?? 'all'}`} />;
}
