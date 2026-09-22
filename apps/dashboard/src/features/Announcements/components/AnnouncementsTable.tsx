"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useDialog, NPageHeader, NPageHeaderActions, NTable, NErrorState, NForbiddenState, NEmptyState, NButton } from 'najm-kit';
import { Megaphone, Plus, SearchX } from 'lucide-react';
import React from 'react';
import AnnouncementForm from './AnnouncementForm';
import AnnouncementCard from './AnnouncementCard';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { useTranslation } from 'najm-i18n/react';
import { useAnnouncementsTableColumns } from '../hooks/useAnnouncementsTableColumns';
import { useAnnouncementsTableFilters } from '../hooks/useAnnouncementsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isAuthorizationError } from '@/services/apiError';

function AnnouncementsTable() {
  const { t } = useTranslation();
  const columns = useAnnouncementsTableColumns();
  const rawFilters = useAnnouncementsTableFilters();

  const {
    announcements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    error,
    isAnnouncementsLoading,
    isUpdating,
    isCreating,
    isDeleting,
  } = useAnnouncements();

  const { openDialog, confirmDelete } = useDialog();

  const handleAddClick = () => {
    openDialog({
      title: t('announcements.dialogs.createTitle'),
      children: <AnnouncementForm />,
      primaryButton: {
        form: 'announcement-form',
        text: t('announcements.dialogs.createButton'),
        loading: isCreating,
        onClick: async (data) => {
          await createAnnouncement(data);
        },
      },
    });
  };

  const handleView = (announcement) => {
    openDialog({
      title: t('announcements.dialogs.viewTitle'),
      children: <AnnouncementCard data={announcement} />,
      showButtons: false,
    });
  };

  const handleEdit = (announcement) => {
    openDialog({
      title: `${t('announcements.dialogs.editTitle')} - ${announcement.title}`,
      children: <AnnouncementForm announcement={announcement} />,
      primaryButton: {
        form: 'announcement-form',
        text: t('announcements.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (data) => {
          await updateAnnouncement(data);
        },
      },
    });
  };

  const handleDelete = (announcement) => {
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: announcement.title,
      confirmText: t('announcements.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteAnnouncement(announcement.id);
      },
    });
  };

  const total = announcements?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full min-h-0'>
      <NPageHeader
        icon={Megaphone}
        title={t('navigation.announcements')}
        subtitle={hasFailedToLoad(error, announcements) ? undefined : t('announcements.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        className='min-h-0 flex-1'
        data={announcements}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isAnnouncementsLoading}
        error={hasFailedToLoad(error, announcements) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={AnnouncementCard}
        addButtonText={t('announcements.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.announcements}
            title={t('emptyStates.announcements.title')}
            description={t('emptyStates.announcements.description')}
            action={(
              <NButton size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('announcements.dialogs.createButton')}
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
        defaultMode='table'
        dynamicHeight={true}
      />
    </div>
  );
}

export default AnnouncementsTable;
