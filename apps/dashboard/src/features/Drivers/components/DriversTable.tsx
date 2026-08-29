"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { Car } from 'lucide-react';
import DriverForm from './DriverForm';
import { useDrivers } from '../hooks/useDrivers';
import { useTranslation } from '@/hooks/useLanguage';
import DriverCard from './DriverCard';
import { useDriversTableColumns } from '../hooks/useDriversTableColumns';
import { useDriversTableFilters } from '../hooks/useDriversTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, tableErrorProps } from '@/shared/TableErrorState';

function DriversTable() {

  const { t } = useTranslation();
  const columns = useDriversTableColumns();
  const rawFilters = useDriversTableFilters();

  const {
    drivers,
    createDriver,
    updateDriver,
    deleteDriver,
    isBulkDeleting,
    bulkDeleteDrivers,
    error,
    isDriversLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useDrivers();


  const { openDialog, confirmDelete } = useConfirmDelete();

  const handleAddClick = () => {
    openDialog({
      title: t('drivers.dialogs.createTitle'),
      children: <DriverForm />,
      width:'5xl',
      primaryButton: {
        form: 'driver-form',
        text: t('drivers.dialogs.createButton'),
        loading: isCreating,
        onClick: async (driverData) => {
          await createDriver(driverData);
        }
      }
    });
  };

  const handleEdit = (driver) => {
    openDialog({
      title: `${t('drivers.dialogs.editTitle')} - ${driver.name}`,
      children: <DriverForm driver={driver} />,
      width:'5xl',
      primaryButton: {
        form: 'driver-form',
        text: t('drivers.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (driverData) => {
          await updateDriver(driverData);
        }
      }
    });
  };

  const handleView = (driver) => {
    openDialog({
      title: t('drivers.dialogs.viewTitle'),
      children: <DriverCard data={driver} />,
      showButtons: false,
    });
  };


  const handleDelete = (driver) => {
    confirmDelete({
      itemName: driver.name,
      confirmText: t('drivers.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteDriver(driver.id);
      }
    });
  };

  const handleBulkDelete = (ids) => {
    confirmDelete({
      itemName: t('drivers.dialogs.bulkDeleteItemName', { count: ids.length }),
      confirmText: t('drivers.dialogs.deleteButton'),
      loading: isBulkDeleting,
      onConfirm: async () => {
        await bulkDeleteDrivers(ids);
      }
    });
  };

  const total = drivers?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={Car}
        title={t('navigation.drivers')}
        subtitle={hasFailedToLoad(error, drivers) ? undefined : t('drivers.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={drivers}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        loading={isDriversLoading}
        {...tableErrorProps(error, drivers)}
        loadingText={t('common.loading')}
        renderCard={DriverCard}
        addButtonText={t('drivers.dialogs.createButton')}
        defaultMode='cards'
      />
    </div>
  );
}

export default DriversTable;
