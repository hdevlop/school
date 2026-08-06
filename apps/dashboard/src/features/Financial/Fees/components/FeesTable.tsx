"use client"

import { useEffect, useMemo, useState } from 'react';
import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { CircleDollarSign } from 'lucide-react';
import FeeForm from './FeeForm';
import EditFeeForm from './EditFeeForm';
import { useFees } from '../hooks/useFees';
import { useTranslation } from '@/hooks/useLanguage';
import FeeCard from './FeeCard';
import { useStudents } from '@/features/Students/hooks/useStudents';
import { useFeeTypes } from '@/features/Financial/FeeTypes/hooks/useFeeTypes';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSections } from '@/features/Sections/hooks/useSections';
import { useRouter } from 'next/navigation';
import { createBulkFeesApi } from '@/services/feeApi';
import { useFeesTableColumns } from '../hooks/useFeesTableColumns';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';


function FeesTable() {

  const { t } = useTranslation();
  const router = useRouter();
  const { openDialog, confirmDelete } = useConfirmDelete();

  const { students } = useStudents();
  const { feeTypes } = useFeeTypes();
  const { classes } = useClasses();
  const { sections } = useSections();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('__all__');

  const {
    fees,
    isFeesLoading,
    updateFee,
    deleteFee,
    isUpdating,
    isDeleting,
  } = useFees();

  const isAllClasses = selectedClassId === 'all';

  useEffect(() => {
    if (!selectedClassId && classes?.length > 0) {
      setSelectedClassId(classes[0].id);
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
  ], [t, selectedClassId, selectedSectionId, searchText, statusFilter, classOptions, sectionOptions, isAllClasses]);

  const handleAddClick = () => {
    openDialog({
      title: t('fees.dialogs.createTitle'),
      children: <FeeForm students={students} feeTypes={feeTypes} />,
      width: '6xl',
      primaryButton: {
        form: 'bulk-fee-form',
        text: t('fees.dialogs.createButton'),
        onClick: async (feeData) => {
          return await createBulkFeesApi(feeData);
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

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={CircleDollarSign}
        title={t('navigation.fees')}
        subtitle={`${total} ${total === 1 ? 'student' : 'students'}`}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
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
        loading={isFeesLoading}
        renderCard={FeeCard}
        classNames={{
          cards: 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        }}
        addButtonText={t('fees.dialogs.createButton')}
        noDataText={noDataText}
        defaultMode='cards'
        showCheckbox
      />
    </div>
  );
}

export default FeesTable;
