'use client'
import { useEntityCRUD } from 'najm-kit/query/crud';
import * as sectionApi from '@/services/sectionApi';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useMemo } from 'react';

export const useSections = (options?) => {
  const { sectionId, enabled = true, allYears = false } = options || {};
  const { classes, isClassesLoading } = useClasses({ enabled, allYears });

  const crud = useEntityCRUD('sections', {
    getAll: sectionApi.getSectionsApi,
    getById: sectionApi.getSectionByIdApi,
    create: sectionApi.createSectionApi,
    update: sectionApi.updateSectionApi,
    delete: sectionApi.deleteSectionApi,
  });

  const { data: allSections, isLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const activeClassIds = useMemo(() => new Set((classes || []).map((schoolClass) => schoolClass.id)), [classes]);
  const sections = useMemo(() => allYears
    ? allSections
    : allSections?.filter((section) => activeClassIds.has(section.classId)),
  [allYears, allSections, activeClassIds]);
  const isSectionsLoading = isLoading || (!allYears && isClassesLoading);
  const { data: section, isLoading: isSectionLoading } = crud.useGetById(sectionId, !!sectionId);

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
