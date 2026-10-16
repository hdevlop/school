"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useEffect, useMemo, useState } from 'react';
import { useDialog, NPageHeader, NPageHeaderActions, NEmptyState, NButton, NErrorState, NForbiddenState } from 'najm-kit';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { CircleDollarSign, Plus, SearchX, Users } from 'lucide-react';
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
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import { useFeesTableColumns } from '../hooks/useFeesTableColumns';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useActiveAcademicYear } from '@/features/Settings/hooks/useSettings';
import { useViewingAcademicYear, useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { hasFailedToLoad, isAuthorizationError, isCountUnknown } from '@/services/apiError';

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
    if (isAllClasses) {
      setSelectedSectionId('');
      return;
    }
    if (selectedClassId && sections?.length > 0) {
      const classSections = sections.filter((s: any) => s.classId === selectedClassId);
      const sectionA = classSections.find((s: any) => s.name?.toUpperCase() === 'A');
      setSelectedSectionId(sectionA?.id || classSections[0]?.id || '');
    }
  }, [selectedClassId, sections, isAllClasses]);

  const filteredFees = useMemo(() => {
    if (!fees) return [];

    return fees.filter((row: any) => {
      // The server already limits the year scope to the viewed year.
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
  }, [fees, selectedClassId, selectedSectionId, searchText, statusFilter, isAllClasses]);

  const classOptions = useMemo(
    () => [
      { value: 'all', label: t('common.all') || 'All' },
      ...(classes || []).map((c: any) => ({ value: c.id, label: c.name })),
    ],
    [classes, t],
  );

  const sectionOptions = useMemo(
    () => isAllClasses
      ? []
      : (sections || [])
          .filter((s: any) => s.classId === selectedClassId)
          .map((s: any) => ({ value: s.id, label: s.name })),
    [sections, selectedClassId, isAllClasses],
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
      className: 'w-full lg:w-32',
    },
    {
      name: 'section',
      type: 'select',
      showIcon: false,
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
  ], [t, selectedClassId, selectedSectionId, searchText, statusFilter, classOptions, sectionOptions, isAllClasses]);

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

  const handleClassFeeClick = () => {
    if (!viewingYear) return;
    const openedYear = viewingYear;
    openDialog({
      title: t('fees.classBulk.title'),
      children: <ClassBulkFeeForm classes={classes} feeTypes={feeTypes} />,
      width: '6xl',
      primaryButton: {
        form: 'class-bulk-fee-form',
        text: t('fees.classBulk.action'),
        onClick: async (feeData) => {
          const response = await withAcademicYear(openedYear, () => createBulkClassFeesApi(feeData));
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
          {viewingYear && (
            // Icon only at phone width, where the label left no room for the title.
            <NButton
              size="sm"
              variant="outline"
              onClick={handleClassFeeClick}
              disabled={!classes?.length}
              aria-label={t('fees.classBulk.action')}
              title={t('fees.classBulk.action')}
            >
              <Users className="h-4 w-4" aria-hidden />
              <span className="max-sm:hidden">{t('fees.classBulk.action')}</span>
            </NButton>
          )}
        </NPageHeaderActions>
      </NPageHeader>

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
