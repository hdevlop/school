'use client';

import { PermissionButton } from '@/components/PermissionButton';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useMemo, useState } from 'react';
import type { RowSelectionState } from '@tanstack/react-table';
import { HeaderActionsMenu } from '@/components/HeaderActionsMenu';
import { HeaderSearchButton, normalizeSearch } from '@/components/HeaderSearchButton';
import { useClassSectionTableScope } from '@/features/Classes/hooks/useClassSectionTableScope';
import Link from 'next/link';
import { Library, Plus } from 'lucide-react';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { NButton, NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState, NSheet, useMediaQuery } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import BehaviorRewardCard from './BehaviorRewardCard';
import BehaviorRewardsMobileFilters from './BehaviorRewardsMobileFilters';
import { BehaviorRewardCardSkeleton } from '@/shared/CardSkeletons';
import BehaviorRewardDetails, { type BehaviorRewardDetail } from './BehaviorRewardDetails';
import { RewardCertificatesButton } from './RewardCertificatesButton';
import BehaviorRewardForm from './BehaviorRewardForm';
import { useBehaviorRewards } from '../hooks/useBehaviorRewards';
import { useBehaviorRewardsTableColumns } from '../hooks/useBehaviorRewardsTableColumns';
import { useBehaviorRewardsTableFilters } from '../hooks/useBehaviorRewardsTableFilters';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';

const BehaviorRewardsTable = () => {
  const { t } = useTranslation();
  const isPhone = useMediaQuery('(max-width: 767px)');
  // On a phone the search lives in the header, outside the table, so the page filters by it.
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<BehaviorRewardDetail | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const query = isPhone ? normalizeSearch(search.trim()) : '';
  // Parents and students read their own or their children's records only.
  // School-wide roles delete any reward and a teacher the ones they gave (the server checks which);
  // monitors and supervisors delete none, whatever they are granted.
  const { isFamily, isSchoolWide, role, can } = useViewerRole();
  const canDelete = (isSchoolWide || role === 'teacher') && can('delete:behavior-rewards');
  const columns = useBehaviorRewardsTableColumns();
  const scope = useClassSectionTableScope();
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
  const rewardFilters = useBehaviorRewardsTableFilters(behaviorRewards);
  const filters = useMemo(() => [...rewardFilters, ...scope.filters], [rewardFilters, scope.filters]);
  const canPrint = !isFamily && can('read:behavior-rewards') && !isAuthorizationError(error);

  const tableData = useMemo(() => (behaviorRewards || [])
    .filter(scope.matches)
    .map((reward) => ({
      ...reward,
      searchText: [reward.student?.name, reward.student?.arabicName, reward.student?.studentCode, reward.description]
        .filter(Boolean)
        .join(' '),
      classSection: `${reward.class?.name || ''} ${reward.section?.name || ''}`,
    }))
    .filter((reward) => !query || normalizeSearch(reward.searchText).includes(query)), [behaviorRewards, scope.matches, query]);
  const hasSelection = scope.hasSelection || Boolean(query);

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

  const handleView = (reward: BehaviorRewardDetail) => {
    if (isPhone) {
      setViewing(reward);
      return;
    }
    openDialog({
      title: t('behaviorRewards.dialogs.viewTitle'),
      children: <BehaviorRewardDetails behaviorReward={reward} canPrint={canPrint} />,
      showButtons: false,
    });
  };

  const toggleRewardSelection = ({ id }: { id: string }) => setRowSelection((current) => {
    const next = { ...current };
    if (next[id]) delete next[id];
    else next[id] = true;
    return next;
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
  // Whoever curates the reward bank reaches it from here; the others meet it in the reward form.
  const bankLink = !isFamily && (can('create:reward-templates') || can('update:reward-templates')) ? (
    <NButton asChild variant="outline" size="sm" autoLoading={false}>
      <Link href="/behavior-rewards/bank">
        <Library className="size-4" aria-hidden />
        {t('rewardTemplates.openBank')}
      </Link>
    </NButton>
  ) : null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={FEATURE_ICONS.behaviorRewards}
        title={t(isPhone ? 'navigation.behaviorRewardsShort' : 'navigation.behaviorRewards')}
        subtitle={isCountUnknown(error, tableData, isBehaviorRewardsLoading) ? undefined : t('behaviorRewards.table.recordCount', { count: total })}
        // On a phone the search is an icon beside the actions menu, as on the homework list.
        compactActions={isPhone ? (
          <div className="flex shrink-0 items-center">
            <HeaderSearchButton search={search} onSearch={setSearch}
              label={t('behaviorRewards.filters.searchLabel')} placeholder={t('behaviorRewards.filters.search')} />
            <HeaderActionsMenu contentClassName="md:hidden" hasOwnActions={Boolean(bankLink)}>{bankLink}<PageHeaderGlobalActions /></HeaderActionsMenu>
          </div>
        ) : undefined}
      >
        <NPageHeaderActions>
          {bankLink}
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        exportTitle={t('navigation.behaviorRewards')}
        permissionResource="behavior-rewards"
        responsiveSkeleton
        className="min-h-0 flex-1"
        data={tableData}
        getRowId={(reward) => reward.id}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        headerSlot={canPrint ? <RewardCertificatesButton hasRows={tableData.length > 0 && !isBehaviorRewardsLoading} /> : undefined}
        columns={columns}
        filters={filters}
        inlinePhoneFilters={false}
        classNames={{
          header: 'max-md:[&_[data-ntable-mobile-toolbar]]:hidden',
          content: '[&_table]:min-w-[88rem]',
          tableHeader: '[&_th:last-child]:w-12',
        }}
        renderToolbar={isPhone ? ({ columnFilters }) => (
          <BehaviorRewardsMobileFilters columnFilters={columnFilters} rewardFilters={rewardFilters} scopeFilters={scope.filters}
            addButton={isFamily ? undefined : (
              <PermissionButton permission="create:behavior-rewards" onClick={handleCreate} aria-label={t('behaviorRewards.dialogs.createButton')}
                title={t('behaviorRewards.dialogs.createButton')} className="size-10 shrink-0 p-0">
                <Plus className="size-5" aria-hidden />
              </PermissionButton>
            )} />
        ) : undefined}
        isFilteredEmpty={hasSelection && (behaviorRewards?.length ?? 0) > 0 && tableData.length === 0}
        onCreate={isFamily ? undefined : handleCreate}
        onView={handleView}
        onRowClick={canPrint ? toggleRewardSelection : isPhone ? handleView : undefined}
        onEdit={isFamily ? undefined : handleEdit}
        onDelete={canDelete ? handleDelete : undefined}
        loading={isBehaviorRewardsLoading}
        error={hasFailedToLoad(error, tableData) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={BehaviorRewardCard}
        renderCardSkeleton={BehaviorRewardCardSkeleton}
        addButtonText={t('behaviorRewards.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.behaviorRewards}
            title={t('emptyStates.behaviorRewards.title')}
            description={isFamily ? t('emptyStates.familyDescription') : t('emptyStates.behaviorRewards.description')}
            action={isFamily ? undefined : (
              <PermissionButton permission="create:behavior-rewards" size="sm" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                {t('behaviorRewards.dialogs.createButton')}
              </PermissionButton>
            )}
          />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.behaviorRewards}
            title={t('emptyStates.filtered.title')}
            description={t('emptyStates.filtered.description')}
          />
        )}
        defaultMode="table"
        dynamicHeight
      />
      {viewing && (
        <NSheet open onOpenChange={(open) => { if (!open) setViewing(null); }} icon={FEATURE_ICONS.behaviorRewards}
          title={t('behaviorRewards.dialogs.viewTitle')} width={560}>
          <BehaviorRewardDetails behaviorReward={viewing} canPrint={canPrint} />
        </NSheet>
      )}
    </div>
  );
};

export default BehaviorRewardsTable;
