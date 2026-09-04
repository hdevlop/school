"use client";

import React, { useMemo } from 'react';
import { Banknote, Briefcase, Calendar, Hash, IdCard, MapPinned, Phone, UserRound, Wallet } from 'lucide-react';
import { Badge, NAvatar, NTable, NPageHeader, NPageHeaderActions, NStatCard, NSkeletonWidgets } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { useTranslation } from 'najm-i18n/react';
import { useStaff } from '../hooks/useStaff';
import { useStaffRoles } from '../hooks/useStaffRoles';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, tableErrorProps } from '@/shared/TableErrorState';
import StaffForm from './StaffForm';
import StaffCard from './StaffCard';
import { formatAssignments } from '../utils/staffAssignments';
import { getStaffAvatar } from '../utils/staffAvatar';
import { personAvatarClassNames } from '@/lib/avatar';

const money = (value?: string | number | null) => {
  const numeric = Number(value || 0);
  return `${numeric.toLocaleString('en-US', { maximumFractionDigits: 2 })} DH`;
};

const calculateStaffPay = (row) => {
  if (row?.compensationMode === 'hourly') {
    return Number(row?.hourlyRate || 0) * Number(row?.workloadHours || 0);
  }
  return Number(row?.salary || 0);
};

const resolveRoleLabel = (row, language) => {
  if (!row?.role) return '—';
  const localized = row?.roleLabels?.[language];
  if (localized) return localized;
  if (row?.roleLabel) return row.roleLabel;
  return row.role;
};

// Teacher keeps its own academic workflow; every other staff role is managed here.
const STAFF_LIST_EXCLUDED_ROLES = new Set(['teacher']);

const StaffTable = () => {
  const { t, language } = useTranslation();
  const {
    staff,
    createStaff,
    updateStaff,
    deleteStaff,
    bulkDeleteStaff,
    isStaffLoading,
    isError,
    error,
    isDeleting,
    isBulkDeleting,
  } = useStaff();
  const { activeStaffRoles } = useStaffRoles({ activeOnly: true });
  const { openDialog, confirmDelete } = useConfirmDelete();
  const rows = useMemo(() => Array.isArray(staff) ? staff : [], [staff]);

  const totalPayroll = rows.reduce((sum, row) => sum + calculateStaffPay(row), 0);
  const activeCount = rows.filter((row) => row?.status === 'active').length;
  const uniqueRoles = new Set(rows.map((row) => row?.role).filter(Boolean));
  const nonTeachingActiveCount = rows.filter(
    (row) => row?.status === 'active' && !STAFF_LIST_EXCLUDED_ROLES.has(row?.role)
  ).length;

  const handleAdd = () => {
    openDialog({
      title: t('staff.dialogs.createTitle'),
      children: <StaffForm onSubmitStaff={createStaff} />,
      width: '4xl',
      height: 'xxl',
      showButtons: false,
    });
  };

  const handleEdit = (staffMember) => {
    openDialog({
      title: `${t('staff.dialogs.editTitle')} - ${staffMember.name}`,
      children: <StaffForm staff={staffMember} onSubmitStaff={updateStaff} />,
      width: '4xl',
      height: 'xxl',
      showButtons: false,
    });
  };

  const handleView = (staffMember) => {
    openDialog({
      title: t('staff.dialogs.viewTitle'),
      children: <StaffCard data={staffMember} />,
      showButtons: false,
    });
  };

  const handleDelete = (staffMember) => {
    confirmDelete({
      itemName: staffMember.name,
      confirmText: t('staff.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => { await deleteStaff(staffMember.id); },
    });
  };

  const handleBulkDelete = (ids) => {
    confirmDelete({
      itemName: t('staff.dialogs.bulkDeleteItemName', { count: ids.length }),
      confirmText: t('staff.dialogs.deleteButton'),
      loading: isBulkDeleting,
      onConfirm: async () => { await bulkDeleteStaff(ids); },
    });
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'employeeCode',
      header: t('staff.table.employeeCode'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1 font-mono text-slate-600">
          <Hash className="h-3 w-3" />
          {getValue() || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: t('staff.table.name'),
      enableSorting: true,
      cell: ({ row }) => {
        const staffMember = row.original;
        return (
          <NAvatar
            src={staffMember?.image}
            fallbackSrc={getStaffAvatar(staffMember?.role, staffMember?.gender)}
            title={staffMember?.name || '-'}
            classNames={personAvatarClassNames}
            size="sm"
            version={staffMember?.updatedAt}
          />
        );
      },
    },
    {
      accessorKey: 'roleCategory',
      header: t('staffRoles.table.category'),
      enableSorting: false,
      enableHiding: true,
      enableColumnFilter: true,
      cell: ({ getValue }) => getValue() || '-',
    },
    {
      accessorKey: 'role',
      header: t('staff.table.role'),
      enableSorting: true,
      cell: ({ row }) => (
        <Badge className="gap-1 border-transparent bg-indigo-600 text-white shadow-sm">
          <Briefcase className="h-3 w-3" />
          {resolveRoleLabel(row.original, language)}
        </Badge>
      ),
    },
    {
      accessorKey: 'cin',
      header: t('staff.table.cin'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1 text-slate-600">
          <IdCard className="h-3 w-3" />
          {getValue() || <span className="text-slate-400">-</span>}
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: t('staff.table.phone'),
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1 text-slate-600">
          <Phone className="h-3 w-3" />
          {getValue() || <span className="text-slate-400">-</span>}
        </div>
      ),
    },
    {
      accessorKey: 'salary',
      header: t('staff.table.salary'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="font-semibold text-slate-800">{money(getValue() as number)}</span>
      ),
    },
    {
      accessorKey: 'compensationMode',
      header: t('staff.table.compensationMode'),
      enableSorting: true,
      cell: ({ getValue }) => t(`staff.compensationModes.${getValue() || 'monthly'}`),
    },
    {
      accessorKey: 'assignments',
      header: t('staff.table.assignments'),
      enableSorting: false,
      enableHiding: true,
      cell: ({ row }) => (
        <div className="flex max-w-56 items-center gap-1 truncate text-slate-600">
          <MapPinned className="h-3 w-3 shrink-0" />
          <span className="truncate">{formatAssignments(row.original, language)}</span>
        </div>
      ),
    },
    {
      accessorKey: 'licenseExpiry',
      header: t('drivers.form.licenseExpiry'),
      enableSorting: true,
      enableHiding: true,
      cell: ({ row, getValue }) => {
        if (row.original?.role !== 'driver') return <span className="text-slate-400">-</span>;
        return (
          <div className="flex items-center gap-1 text-slate-600">
            <Calendar className="h-3 w-3" />
            {getValue() || <span className="text-slate-400">-</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: t('staff.table.status'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const status = getValue() as string;
        const tone = status === 'active' ? 'bg-emerald-600' : status === 'onLeave' ? 'bg-amber-500' : status === 'suspended' ? 'bg-rose-600' : 'bg-slate-600';
        return <Badge className={`border-transparent text-white shadow-sm ${tone}`}>{status || 'unknown'}</Badge>;
      },
    },
  ], [t, language]);

  const roleOptions = useMemo(() => {
    return (activeStaffRoles || [])
      .filter((role) => !STAFF_LIST_EXCLUDED_ROLES.has(role.code))
      .map((role) => ({
        value: role.code,
        label: role?.labels?.[language] || role.label || role.code,
      }));
  }, [activeStaffRoles, language]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    (activeStaffRoles || []).forEach((role) => { if (role.category) set.add(role.category); });
    return Array.from(set).map((cat) => ({ value: cat, label: t(`staffRoles.categories.${cat}`) || cat }));
  }, [activeStaffRoles, t]);

  const filters = useMemo(() => [
    {
      name: 'name',
      type: 'text',
      placeholder: t('staff.filters.search'),
      className: 'w-full lg:w-64',
    },
    {
      name: 'role',
      type: 'select',
      placeholder: t('staff.filters.filterByRole'),
      className: 'w-full lg:w-48',
      options: roleOptions,
    },
    {
      name: 'roleCategory',
      type: 'select',
      placeholder: t('staff.filters.filterByCategory'),
      className: 'w-full lg:w-48',
      options: categoryOptions,
    },
  ], [t, roleOptions, categoryOptions]);

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <NPageHeader
        icon={Briefcase}
        title={t('navigation.staff')}
        subtitle={hasFailedToLoad(isError ? error : null, rows) ? undefined : t('staff.subtitle.count', { count: rows.length })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      {isStaffLoading ? (
        <NSkeletonWidgets />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <NStatCard
            icon={UserRound}
            label={t('staff.stats.total')}
            value={rows.length}
          />
          <NStatCard
            icon={Banknote}
            label={t('staff.stats.payroll')}
            value={money(totalPayroll)}
          />
          <NStatCard
            icon={Briefcase}
            label={t('staff.stats.activeRoles')}
            value={activeCount}
          />
          <NStatCard
            icon={Wallet}
            label={t('staff.stats.uniqueRoles')}
            value={uniqueRoles.size}
          />
          <NStatCard
            icon={UserRound}
            label={t('staff.stats.nonTeaching')}
            value={nonTeachingActiveCount}
          />
        </div>
      )}

      <NTable
        data={rows}
        columns={columns}
        filters={filters}
        onCreate={handleAdd}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        loading={isStaffLoading}
        {...tableErrorProps(isError ? error : null, rows)}
        showViewToggle={true}
        renderCard={StaffCard}
        addButtonText={t('staff.dialogs.createButton')}
        defaultMode='cards'
        showColumnVisibility={true}
        loadingText={t('staff.loading')}
        noDataText={t('staff.noData')}
      />
    </div>
  );
};

export default StaffTable;
