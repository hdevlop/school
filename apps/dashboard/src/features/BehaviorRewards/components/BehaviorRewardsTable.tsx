'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useMemo, useState } from 'react';
import { Award, Plus, SearchX } from 'lucide-react';
import { useAuth } from 'najm-auth/client/react';
import { useDialog, NPageHeader, NPageHeaderActions, NTable, NErrorState, NForbiddenState, NEmptyState, NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import BehaviorRewardCard from './BehaviorRewardCard';
import BehaviorRewardDetails from './BehaviorRewardDetails';
import BehaviorRewardForm from './BehaviorRewardForm';
import { useBehaviorRewards } from '../hooks/useBehaviorRewards';
import { useBehaviorRewardsTableColumns } from '../hooks/useBehaviorRewardsTableColumns';
import { useBehaviorRewardsTableFilters } from '../hooks/useBehaviorRewardsTableFilters';
import { hasFailedToLoad, isAuthorizationError } from '@/services/apiError';

const BehaviorRewardsTable = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const role = (user as any)?.role;
  const canDelete = role === 'admin';
  const columns = useBehaviorRewardsTableColumns();
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const filters = useBehaviorRewardsTableFilters({
    classFilter,
    onClassFilterChange: setClassFilter,
    sectionFilter,
    onSectionFilterChange: setSectionFilter,
  });
  const { openDialog, confirmDelete } = useDialog();
  const {
    behaviorRewards,
    createBehaviorReward,
    updateBehaviorReward,
    deleteBehaviorReward,
    error,
    isBehaviorRewardsLoading,
    isCreating,
    isUpdating,
    isDeleting,
  } = useBehaviorRewards();

  const tableData = useMemo(() => (behaviorRewards || [])
    .filter((reward) => !classFilter || reward.classId === classFilter)
    .filter((reward) => !sectionFilter || reward.sectionId === sectionFilter)
    .map((reward) => ({
      ...reward,
      searchText: [reward.student?.name, reward.student?.studentCode, reward.description]
        .filter(Boolean)
        .join(' '),
      classSection: `${reward.class?.name || ''} ${reward.section?.name || ''}`,
    })), [behaviorRewards, classFilter, sectionFilter]);

  const handleCreate = () => openDialog({
    title: t('behaviorRewards.dialogs.createTitle'),
    children: <BehaviorRewardForm />,
    primaryButton: {
      form: 'behavior-reward-form',
      text: t('behaviorRewards.dialogs.createButton'),
      loading: isCreating,
      onClick: async (data) => { await createBehaviorReward(data); },
    },
  });

  const handleView = (reward) => openDialog({
    title: t('behaviorRewards.dialogs.viewTitle'),
    children: <BehaviorRewardDetails behaviorReward={reward} />,
    showButtons: false,
  });

  const handleEdit = (reward) => openDialog({
    title: t('behaviorRewards.dialogs.editTitle'),
    children: <BehaviorRewardForm behaviorReward={reward} />,
    primaryButton: {
      form: 'behavior-reward-form',
      text: t('behaviorRewards.dialogs.updateButton'),
      loading: isUpdating,
      onClick: async (data) => { await updateBehaviorReward({ ...data, id: reward.id }); },
    },
  });

  const handleDelete = (reward) => confirmDelete({
    title: t('common.delete'),
    warningText: t('common.deleteConfirm'),
    cancelText: t('common.cancel'),
    itemName: reward.student?.name || reward.id,
    confirmText: t('behaviorRewards.dialogs.deleteButton'),
    loading: isDeleting,
    onConfirm: async () => { await deleteBehaviorReward(reward.id); },
  });

  const total = tableData.length;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={Award}
        title={t('navigation.behaviorRewards')}
        subtitle={hasFailedToLoad(error, tableData) ? undefined : t('behaviorRewards.table.recordCount', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        className="min-h-0 flex-1"
        data={tableData}
        columns={columns}
        filters={filters}
        onCreate={handleCreate}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={canDelete ? handleDelete : undefined}
        loading={isBehaviorRewardsLoading}
        error={hasFailedToLoad(error, tableData) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={BehaviorRewardCard}
        addButtonText={t('behaviorRewards.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.behaviorRewards}
            title={t('emptyStates.behaviorRewards.title')}
            description={t('emptyStates.behaviorRewards.description')}
            action={(
              <NButton size="sm" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                {t('behaviorRewards.dialogs.createButton')}
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
        defaultMode="table"
        dynamicHeight
      />
    </div>
  );
};

export default BehaviorRewardsTable;
