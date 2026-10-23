'use client';

import { PermissionButton } from '@/components/PermissionButton';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { CalendarRange, Plus, SearchX } from 'lucide-react';
import { NPageHeader, NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { useAcademicTableActions } from '@/features/Classes/hooks/useAcademicTableActions';
import { useRememberedTableMode } from '@/hooks/useRememberedTableMode';
import { deleteCycleApi } from '@/services/cycleApi';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import CycleCard from './CycleCard';
import CycleForm from './CycleForm';
import { useCycles } from '../hooks/useCycles';
import { useCyclesTableColumns } from '../hooks/useCyclesTableColumns';
import { useCyclesTableFilters } from '../hooks/useCyclesTableFilters';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';

const sortCycles = (cycles = []) => [...cycles].sort((a, b) => {
  const order = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  return order || String(a.name || '').localeCompare(String(b.name || ''));
});

function CyclesTable() {
  const { t } = useTranslation();
  const columns = useCyclesTableColumns();
  const rawFilters = useCyclesTableFilters();
  const { cycles, createCycle, updateCycle, error, isCyclesLoading } = useCycles();
  const { openDialog } = useDialog();
  const tableActions = useAcademicTableActions('cycles', deleteCycleApi);
  const tableMode = useRememberedTableMode('cycles', 'table');

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


  const total = orderedCycles.length;

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <NPageHeader
        icon={CalendarRange}
        title={t('navigation.cycles')}
        subtitle={isCountUnknown(error, orderedCycles, isCyclesLoading) ? undefined : t('cycles.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        permissionResource="cycles"
        responsiveSkeleton
        data={orderedCycles}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        {...tableActions}
        {...tableMode}
        loading={isCyclesLoading}
        error={hasFailedToLoad(error, orderedCycles) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={CycleCard}
        addButtonText={t('cycles.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.cycles}
            title={t('emptyStates.cycles.title')}
            description={t('emptyStates.cycles.description')}
            action={(
              <PermissionButton permission="create:cycles" size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('cycles.dialogs.createButton')}
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
      />
    </div>
  );
}

export default CyclesTable;
