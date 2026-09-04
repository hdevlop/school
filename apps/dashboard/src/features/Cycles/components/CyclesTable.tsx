'use client';

import { CalendarRange } from 'lucide-react';
import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import CycleCard from './CycleCard';
import CycleForm from './CycleForm';
import { useCycles } from '../hooks/useCycles';
import { useCyclesTableColumns } from '../hooks/useCyclesTableColumns';
import { useCyclesTableFilters } from '../hooks/useCyclesTableFilters';
import { hasFailedToLoad, tableErrorProps } from '@/shared/TableErrorState';

const sortCycles = (cycles = []) => [...cycles].sort((a, b) => {
  const order = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  return order || String(a.name || '').localeCompare(String(b.name || ''));
});

function CyclesTable() {
  const { t } = useTranslation();
  const columns = useCyclesTableColumns();
  const rawFilters = useCyclesTableFilters();
  const { cycles, createCycle, updateCycle, deleteCycle, error, isCyclesLoading } = useCycles();
  const { openDialog, confirmDelete } = useConfirmDelete();

  const orderedCycles = sortCycles(cycles || []);

  const handleAddClick = () => {
    openDialog({
      title: t('cycles.dialogs.createTitle'),
      children: <CycleForm />,
      primaryButton: {
        form: 'cycle-form',
        text: t('cycles.dialogs.createButton'),
        onClick: async (cycleData) => {
          await createCycle(cycleData);
        },
      },
    });
  };

  const handleEdit = (cycle) => {
    openDialog({
      title: `${t('cycles.dialogs.editTitle')} - ${cycle.name}`,
      children: <CycleForm cycle={cycle} />,
      primaryButton: {
        form: 'cycle-form',
        text: t('cycles.dialogs.updateButton'),
        onClick: async (cycleData) => {
          await updateCycle(cycleData);
        },
      },
    });
  };

  const handleView = (cycle) => {
    openDialog({
      title: t('cycles.dialogs.viewTitle'),
      children: <CycleCard data={cycle} />,
      showButtons: false,
    });
  };

  const handleDelete = (cycle) => {
    confirmDelete({
      itemName: cycle.name,
      confirmText: t('cycles.dialogs.deleteButton'),
      onConfirm: async () => {
        await deleteCycle(cycle.id);
      },
    });
  };

  const total = orderedCycles.length;

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <NPageHeader
        icon={CalendarRange}
        title={t('navigation.cycles')}
        subtitle={hasFailedToLoad(error, orderedCycles) ? undefined : t('cycles.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={orderedCycles}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isCyclesLoading}
        {...tableErrorProps(error, orderedCycles)}
        renderCard={CycleCard}
        addButtonText={t('cycles.dialogs.createButton')}
        defaultMode="table"
      />
    </div>
  );
}

export default CyclesTable;
