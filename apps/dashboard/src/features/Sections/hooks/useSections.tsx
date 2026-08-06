'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as sectionApi from '@/services/sectionApi';

export const useSections = (options?) => {
  const { sectionId, enabled = true } = options || {};

  const crud = useEntityCRUD('sections', {
    getAll: sectionApi.getSectionsApi,
    getById: sectionApi.getSectionByIdApi,
    create: sectionApi.createSectionApi,
    update: sectionApi.updateSectionApi,
    delete: sectionApi.deleteSectionApi,
  });

  const { data: sections, isLoading: isSectionsLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: section, isLoading: isSectionLoading } = crud.useGetById(sectionId, !!sectionId);

  const { mutateAsync: createSection, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateSection, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteSection, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteSections, isLoading: isBulkDeleting } = crud.useBulkDelete();

  return {
    // Data
    sections,
    section,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllSections: crud.useGetAll,
    getSectionById: crud.useGetById,

    // Mutations
    createSection,
    updateSection,
    deleteSection,
    bulkDeleteSections,

    // Loading States
    isSectionsLoading,
    isSectionLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};