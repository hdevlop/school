'use client'
import { useEntityCRUD } from 'najm-kit/query/crud';
import * as classApi from '@/services/classApi';
import { useYearScopedDetail, useYearScopedList } from '@/features/AcademicYears/hooks/useYearScopedQuery';

// The classes of the viewed year, or of `academicYear` when a screen names
// one (the active year, to name a current class whatever year is viewed).
export const useClasses = (options?: { classId?: string; enabled?: boolean; academicYear?: string }) => {
  const { classId, enabled = true, academicYear } = options || {};

  const crud = useEntityCRUD('classes', {
    getAll: classApi.getClassesApi,
    getById: classApi.getClassByIdApi,
    create: classApi.createClassApi,
    update: classApi.updateClassApi,
    delete: classApi.deleteClassApi,
  });

  const {
    data: classes, isLoading: isClassesLoading, isError, error, refetch,
  } = useYearScopedList({ resource: 'classes', fetch: classApi.getClassesApi, enabled, academicYear });
  // One record of the viewed year; another year's reads as not found.
  const { data: classData, isLoading: isClassLoading } = useYearScopedDetail({
    resource: 'classes', parts: ['detail', classId], fetch: () => classApi.getClassByIdApi(classId!), enabled: !!classId,
  });

  const { mutateAsync: createClass, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateClass, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteClass, isLoading: isDeleting } = crud.useDelete();

  return {
    // Data
    classes,
    class: classData,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllClasses: crud.useGetAll,
    getClassById: crud.useGetById,

    // Mutations
    createClass,
    updateClass,
    deleteClass,

    // Loading States
    isClassesLoading,
    isClassLoading,
    isCreating,
    isUpdating,
    isDeleting,
  };
};
