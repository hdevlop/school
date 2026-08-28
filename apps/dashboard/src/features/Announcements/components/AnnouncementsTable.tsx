"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { Megaphone } from 'lucide-react';
import React from 'react';
import AnnouncementForm from './AnnouncementForm';
import AnnouncementCard from './AnnouncementCard';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { useTranslation } from '@/hooks/useLanguage';
import { useAnnouncementsTableColumns } from '../hooks/useAnnouncementsTableColumns';
import { useAnnouncementsTableFilters } from '../hooks/useAnnouncementsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

function AnnouncementsTable() {
  const { t } = useTranslation();
  const columns = useAnnouncementsTableColumns();
  const rawFilters = useAnnouncementsTableFilters();

  const {
    announcements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    isAnnouncementsLoading,
    isUpdating,
    isCreating,
    isDeleting,
  } = useAnnouncements();

  const { openDialog, confirmDelete } = useConfirmDelete();

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
        subtitle={t('announcements.subtitle.count', { count: total })}
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
        renderCard={AnnouncementCard}
        addButtonText={t('announcements.dialogs.createButton')}
        defaultMode='table'
        dynamicHeight={true}
      />
    </div>
  );
}

export default AnnouncementsTable;
