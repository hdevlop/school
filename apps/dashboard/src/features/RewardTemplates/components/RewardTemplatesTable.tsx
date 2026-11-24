'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { NButton, NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { PermissionButton } from '@/components/PermissionButton';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useDialog } from '@/shared/useDialog';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { RecordCardSkeleton } from '@/shared/CardSkeletons';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import RewardTemplateCard from './RewardTemplateCard';
import RewardTemplateForm from './RewardTemplateForm';
import { useRewardTemplates } from '../hooks/useRewardTemplates';
import { useRewardTemplatesTableColumns } from '../hooks/useRewardTemplatesTableColumns';
import { useRewardTemplatesTableFilters } from '../hooks/useRewardTemplatesTableFilters';

const RewardTemplateCardSkeleton = () => <RecordCardSkeleton rows={3} badge />;

/** The reward bank: the ready-made rewards the reward form offers by category and reward type. */
const RewardTemplatesTable = () => {
  const { t } = useTranslation();
  const { can } = useViewerRole();
  const columns = useRewardTemplatesTableColumns();
  const filters = useRewardTemplatesTableFilters();
  const { openDialog, confirmDelete } = useDialog();
  const {
    rewardTemplates,
    createRewardTemplate,
    updateRewardTemplate,
    deleteRewardTemplate,
    error,
    isRewardTemplatesLoading,
    isCreating,
    isUpdating,
    isDeleting,
  } = useRewardTemplates();

  const tableData = useMemo(() => (rewardTemplates || []).map((template) => ({
    ...template,
    status: template.active ? 'active' : 'archived',
    searchText: [template.title, template.description].filter(Boolean).join(' '),
  })), [rewardTemplates]);

  const handleCreate = () => openDialog({
    title: t('rewardTemplates.dialogs.createTitle'),
    children: <RewardTemplateForm />,
    primaryButton: {
      form: 'reward-template-form',
      text: t('rewardTemplates.dialogs.createButton'),
      loading: isCreating,
      onClick: async (data) => { await createRewardTemplate(data); },
    },
  });

  const handleEdit = (template) => openDialog({
    title: t('rewardTemplates.dialogs.editTitle'),
    children: <RewardTemplateForm template={template} />,
    primaryButton: {
      form: 'reward-template-form',
      text: t('rewardTemplates.dialogs.updateButton'),
      loading: isUpdating,
      onClick: async (data) => { await updateRewardTemplate({ ...data, id: template.id }); },
    },
  });

  const handleView = (template) => openDialog({
    title: t('rewardTemplates.dialogs.viewTitle'),
    children: <RewardTemplateCard data={template} />,
    showButtons: false,
  });

  const handleDelete = (template) => confirmDelete({
    title: t('common.delete'),
    warningText: t('rewardTemplates.dialogs.deleteWarning'),
    cancelText: t('common.cancel'),
    itemName: template.title,
    confirmText: t('common.delete'),
    loading: isDeleting,
    onConfirm: async () => { await deleteRewardTemplate(template.id); },
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={FEATURE_ICONS.rewardTemplates}
        title={t('navigation.rewardTemplates')}
        subtitle={isCountUnknown(error, tableData, isRewardTemplatesLoading)
          ? undefined
          : t('rewardTemplates.table.count', { count: tableData.length })}
      >
        <NPageHeaderActions>
          <NButton asChild variant="outline" size="sm" autoLoading={false}>
            <Link href="/behavior-rewards">
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
              {t('rewardTemplates.backToRewards')}
            </Link>
          </NButton>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        exportTitle={t('navigation.rewardTemplates')}
        permissionResource="reward-templates"
        responsiveSkeleton
        className="min-h-0 flex-1"
        data={tableData}
        columns={columns}
        filters={filters}
        onCreate={handleCreate}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={can('delete:reward-templates') ? handleDelete : undefined}
        loading={isRewardTemplatesLoading}
        error={hasFailedToLoad(error, tableData) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={RewardTemplateCard}
        renderCardSkeleton={RewardTemplateCardSkeleton}
        addButtonText={t('rewardTemplates.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.rewardTemplates}
            title={t('emptyStates.rewardTemplates.title')}
            description={t('emptyStates.rewardTemplates.description')}
            action={(
              <PermissionButton permission="create:reward-templates" size="sm" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                {t('rewardTemplates.dialogs.createButton')}
              </PermissionButton>
            )}
          />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.rewardTemplates}
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

export default RewardTemplatesTable;
