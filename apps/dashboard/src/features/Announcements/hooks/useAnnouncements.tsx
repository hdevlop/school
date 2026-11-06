'use client'
import { useEntityCRUD } from 'najm-kit/query/crud';
import * as announcementApi from '@/services/announcementApi';
import { useYearScopedList, type YearScopedRead } from '@/features/AcademicYears/hooks/useYearScopedQuery';

/** The list this feature's page opens with; the page warm-up asks for the same. */
export const announcementListRead = { resource: 'announcements', fetch: announcementApi.getAnnouncementsApi } satisfies YearScopedRead;

// The viewed year's announcements; mutations refresh every year's list.
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

  const {
    data: announcements, isLoading: isAnnouncementsLoading, isError, error, refetch,
  } = useYearScopedList({ ...announcementListRead, enabled });
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
