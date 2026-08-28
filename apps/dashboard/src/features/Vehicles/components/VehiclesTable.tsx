"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { Bus } from 'lucide-react';
import { buildSmsColumns } from '@/lib/tableUtils';
import React from 'react';
import VehicleForm from './VehicleForm';
import AssignDriverForm from '@/features/Drivers/components/AssignDriverForm';
import { useVehicles } from '../hooks/useVehicles';
import { useTranslation } from '@/hooks/useLanguage';
import VehicleCard from './VehicleCard';
import { useDrivers } from '@/features/Drivers/hooks/useDrivers';
import { useVehiclesTableColumns } from '../hooks/useVehiclesTableColumns';
import { useVehiclesTableFilters } from '../hooks/useVehiclesTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

function VehiclesTable() {

  const { t } = useTranslation();
  const columns = useVehiclesTableColumns();
  const rawFilters = useVehiclesTableFilters();

  const { drivers } = useDrivers();

  const {
    vehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    assignDriver,
    isVehiclesLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useVehicles();

  const { openDialog, confirmDelete } = useConfirmDelete();

  const handleAddClick = () => {
    openDialog({
      title: t('vehicles.dialogs.createTitle'),
      children: <VehicleForm drivers={drivers} />,
      primaryButton: {
        form: 'vehicle-form',
        text: t('vehicles.dialogs.createButton'),
        loading: isCreating,
        onClick: async (vehicleData) => {
          await createVehicle(vehicleData);
        }
      }
    });
  };

  const handleEdit = (vehicle) => {
    openDialog({
      title: `${t('vehicles.dialogs.editTitle')} - ${vehicle.name}`,
      children: <VehicleForm vehicle={vehicle} drivers={drivers} />,
      primaryButton: {
        form: 'vehicle-form',
        text: t('vehicles.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (vehicleData) => {
          await updateVehicle(vehicleData);
        }
      }
    });
  };

  const handleView = (vehicle) => {
    openDialog({
      title: t('vehicles.dialogs.viewTitle'),
      children: <VehicleCard data={vehicle} />,
      showButtons: false,
    });
  };


  const handleDelete = (vehicle) => {
    confirmDelete({
      itemName: vehicle.name,
      confirmText: t('vehicles.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteVehicle(vehicle.id);
      }
    });
  };

  const handleCellClick = async (columnId, vehicle) => {
    if (columnId === 'driver_name') {
      openDialog({
        title: `${t('drivers.form.assignDriver') || 'Assign Driver'} - ${vehicle.name}`,
        children: <AssignDriverForm drivers={drivers} vehicle={vehicle} />,
        primaryButton: {
          form: 'assign-driver-form',
          text: t('common.save') || 'Save',
          loading: isUpdating,
          onClick: async (assignmentData) => {
            await assignDriver(assignmentData);
          }
        }
      });
    }
  };

  const total = vehicles?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={Bus}
        title={t('navigation.vehicles')}
        subtitle={t('vehicles.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={vehicles}
        columns={buildSmsColumns(columns, { onCellClick: handleCellClick })}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isVehiclesLoading}
        renderCard={VehicleCard}
        addButtonText={t('vehicles.dialogs.createButton')}
        defaultMode='cards'
      />
    </div>
  );
}

export default VehiclesTable;
