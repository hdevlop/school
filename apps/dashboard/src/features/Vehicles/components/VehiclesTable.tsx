"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { NPageHeader, NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState, NButton } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { Bus, CalendarX, Eye, Pencil, Plus, SearchX, Trash2, UserRound } from 'lucide-react';
import React from 'react';
import VehicleForm from './VehicleForm';
import AssignDriverForm from '@/features/Drivers/components/AssignDriverForm';
import EndDriverAssignmentForm from './EndDriverAssignmentForm';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useVehicles } from '../hooks/useVehicles';
import { useTranslation } from 'najm-i18n/react';
import VehicleCard from './VehicleCard';
import { useDrivers } from '@/features/Drivers/hooks/useDrivers';
import { useVehiclesTableColumns } from '../hooks/useVehiclesTableColumns';
import { useVehiclesTableFilters } from '../hooks/useVehiclesTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';
import { useAcademicYearScope } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';

function VehiclesTable() {

  const { t } = useTranslation();
  const { can } = useViewerRole();
  const canUpdate = can('update:vehicles');
  const { academicYear } = useAcademicYearScope();
  const columns = useVehiclesTableColumns();
  const rawFilters = useVehiclesTableFilters();

  const { drivers } = useDrivers();

  const {
    vehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    assignDriver,
    unassignDriver,
    error,
    isVehiclesLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useVehicles();

  const { openDialog, confirmDelete } = useDialog();

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
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: vehicle.name,
      confirmText: t('vehicles.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteVehicle(vehicle.id);
      }
    });
  };

  const handleAssignDriver = (vehicle) => {
    const openedYear = academicYear;
    openDialog({
      title: `${t('drivers.form.assignDriver')} - ${vehicle.name}`,
      children: <AssignDriverForm drivers={drivers} vehicle={vehicle} />,
      primaryButton: {
        form: 'assign-driver-form',
        text: t('common.save'),
        loading: isUpdating,
        onClick: async (assignmentData) => {
          await withAcademicYear(openedYear, () => assignDriver(assignmentData));
        }
      }
    });
  };

  const handleCellClick = (vehicle, columnId) => {
    if (columnId === 'driver_name') handleAssignDriver(vehicle);
  };

  // Ends the current driver's assignment; the history stays with the vehicle.
  const handleEndAssignment = (vehicle) => {
    const openedYear = academicYear;
    openDialog({
      title: `${t('vehicles.actions.endDriverAssignment')} - ${vehicle.name}`,
      children: <EndDriverAssignmentForm vehicle={vehicle} />,
      primaryButton: {
        form: 'end-driver-assignment-form',
        text: t('vehicles.dialogs.endAssignmentButton'),
        variant: 'destructive',
        onClick: async (data) => {
          await withAcademicYear(openedYear, () => unassignDriver(data));
        }
      }
    });
  };

  // NTable's built-in View/Edit/Delete exist only while no `menu.row` is
  // supplied, so they are restated beside the driver actions. The menu also
  // reaches the driver in card view, where there is no driver cell to click.
  const rowMenu = (vehicle) => [
    { label: t('common.view'), icon: Eye, onSelect: () => handleView(vehicle) },
    { label: t('common.edit'), icon: Pencil, onSelect: () => handleEdit(vehicle) },
    ...(canUpdate ? [{ label: t('drivers.form.assignDriver'), icon: UserRound, onSelect: () => handleAssignDriver(vehicle) }] : []),
    ...(canUpdate && vehicle.activeAssignment ? [{ label: t('vehicles.actions.endDriverAssignment'), icon: CalendarX, onSelect: () => handleEndAssignment(vehicle) }] : []),
    { label: t('common.delete'), icon: Trash2, danger: true, separatorBefore: true, onSelect: () => handleDelete(vehicle) },
  ];

  const total = vehicles?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={Bus}
        title={t('navigation.vehicles')}
        subtitle={isCountUnknown(error, vehicles, isVehiclesLoading) ? undefined : t('vehicles.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={vehicles}
        columns={columns}
        onCellClick={handleCellClick}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        menu={{ row: rowMenu }}
        loading={isVehiclesLoading}
        error={hasFailedToLoad(error, vehicles) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={VehicleCard}
        addButtonText={t('vehicles.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.vehicles}
            title={t('emptyStates.vehicles.title')}
            description={t('emptyStates.vehicles.description')}
            action={(
              <NButton size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('vehicles.dialogs.createButton')}
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
      />
    </div>
  );
}

export default VehiclesTable;
