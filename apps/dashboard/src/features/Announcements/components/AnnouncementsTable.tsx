"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { NPageHeader, NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState, NButton } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { Megaphone, Plus, SearchX } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import AnnouncementForm from './AnnouncementForm';
import AnnouncementCard from './AnnouncementCard';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { useTranslation } from 'najm-i18n/react';
import { useAnnouncementsTableColumns } from '../hooks/useAnnouncementsTableColumns';
import { useAnnouncementsTableFilters } from '../hooks/useAnnouncementsTableFilters';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';

function AnnouncementsTable() {
  const { t } = useTranslation();
  const { can } = useViewerRole();
  // Everyone else reads the announcements addressed to them.
  const canCreate = can('create:announcements');
  const canUpdate = can('update:announcements');
  const canDelete = can('delete:announcements');
  const columns = useAnnouncementsTableColumns();
  const { classes } = useClasses();
  const [classFilter, setClassFilter] = useState('');
  const rawFilters = useAnnouncementsTableFilters(classFilter, setClassFilter, classes);
  useEffect(() => {
    if (classFilter && classes && !classes.some((item) => item.id === classFilter)) setClassFilter('');
  }, [classFilter, classes]);

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
  const filteredAnnouncements = useMemo(() => (announcements || []).filter((item) =>
    !classFilter || (item.classIds?.length
      ? item.classIds.includes(classFilter)
      : (item.classId || item.class?.id) === classFilter)), [announcements, classFilter]);

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
        subtitle={isCountUnknown(error, announcements, isAnnouncementsLoading) ? undefined : t('announcements.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        responsiveSkeleton
        className='min-h-0 flex-1'
        data={filteredAnnouncements}
        columns={columns}
        filters={rawFilters}
        onCreate={canCreate ? handleAddClick : undefined}
        onView={handleView}
        onEdit={canUpdate ? handleEdit : undefined}
        onDelete={canDelete ? handleDelete : undefined}
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
            icon={classFilter ? SearchX : FEATURE_ICONS.announcements}
            title={classFilter ? t('emptyStates.filtered.title') : t('emptyStates.announcements.title')}
            description={classFilter ? t('emptyStates.filtered.description') : canCreate
              ? t('emptyStates.announcements.description')
              : t('emptyStates.announcements.readerDescription')}
            action={!classFilter && canCreate ? (
              <NButton size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('announcements.dialogs.createButton')}
              </NButton>
            ) : undefined}
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
