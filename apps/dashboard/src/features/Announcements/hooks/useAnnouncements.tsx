'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as announcementApi from '@/services/announcementApi';

export const useAnnouncements = (options?) => {
  const { announcementId, enabled = true } = options || {};

  const crud = useEntityCRUD('announcements', {
    getAll: announcementApi.getAnnouncementsApi,
    getById: announcementApi.getAnnouncementByIdApi,
    create: announcementApi.createAnnouncementApi,
    update: announcementApi.updateAnnouncementApi,
    delete: announcementApi.deleteAnnouncementApi,
    deleteBulk: announcementApi.deleteBulkAnnouncementsApi,
    publish: announcementApi.publishAnnouncementApi,
    unpublish: announcementApi.unpublishAnnouncementApi,
  });

  const { data: announcements, isLoading: isAnnouncementsLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: announcement, isLoading: isAnnouncementLoading } = crud.useGetById(announcementId, !!announcementId);

  const { mutateAsync: createAnnouncement, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateAnnouncement, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteAnnouncement, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteAnnouncements, isLoading: isBulkDeleting } = crud.useBulkDelete();
  const { mutateAsync: publishAnnouncement, isLoading: isPublishing } = crud.useCustomMutation('publish');
  const { mutateAsync: unpublishAnnouncement, isLoading: isUnpublishing } = crud.useCustomMutation('unpublish');

  return {
    announcements,
    announcement,

    isError,
    error,
    refetch,

    getAllAnnouncements: crud.useGetAll,
    getAnnouncementById: crud.useGetById,

    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    bulkDeleteAnnouncements,
    publishAnnouncement,
    unpublishAnnouncement,

    isAnnouncementsLoading,
    isAnnouncementLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
    isPublishing,
    isUnpublishing,
  };
};
