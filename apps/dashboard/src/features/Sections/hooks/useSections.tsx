'use client'
import { useEntityCRUD } from 'najm-kit/query/crud';
import * as sectionApi from '@/services/sectionApi';
import { useYearScopedDetail, useYearScopedList } from '@/features/AcademicYears/hooks/useYearScopedQuery';

// The sections of the viewed year's classes, or of `academicYear` when named.
export const useSections = (options?: { sectionId?: string; enabled?: boolean; academicYear?: string }) => {
  const { sectionId, enabled = true, academicYear } = options || {};

  const crud = useEntityCRUD('sections', {
    getAll: sectionApi.getSectionsApi,
    getById: sectionApi.getSectionByIdApi,
    create: sectionApi.createSectionApi,
    update: sectionApi.updateSectionApi,
    delete: sectionApi.deleteSectionApi,
  });

  const {
    data: sections, isLoading: isSectionsLoading, isError, error, refetch,
  } = useYearScopedList({ resource: 'sections', fetch: sectionApi.getSectionsApi, enabled, academicYear });
  // One record of the viewed year; another year's reads as not found.
  const { data: section, isLoading: isSectionLoading } = useYearScopedDetail({
    resource: 'sections', parts: ['detail', sectionId], fetch: () => sectionApi.getSectionByIdApi(sectionId!), enabled: !!sectionId,
  });

  const { mutateAsync: createSection, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateSection, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteSection, isLoading: isDeleting } = crud.useDelete();

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

    // Loading States
    isSectionsLoading,
    isSectionLoading,
    isCreating,
    isUpdating,
    isDeleting,
  };
};
