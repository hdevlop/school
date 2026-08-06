'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as parentApi from '@/services/parentApi';

export const useParents = (options?) => {
  const { parentId, enabled = true } = options || {};

  const crud = useEntityCRUD('parents', {
    getAll: parentApi.getParentsApi,
    getById: parentApi.getParentByIdApi,
    create: parentApi.createParentApi,
    update: parentApi.updateParentApi,
    delete: parentApi.deleteParentApi,
    deleteBulk: parentApi.deleteBulkParentsApi,
    createBulk: parentApi.createBulkParentsApi
  });

  const { data: parents, isLoading: isParentsLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: parent, isLoading: isParentLoading } = crud.useGetById(parentId, !!parentId);

  const { mutateAsync: createParent, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateParent, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteParent, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteParents, isLoading: isBulkDeleting } = crud.useBulkDelete();

  return {
    // Data
    parents,
    parent,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllParents: crud.useGetAll,
    getParentById: crud.useGetById,

    // Mutations
    createParent,
    updateParent,
    deleteParent,
    bulkDeleteParents,

    // Loading States
    isParentsLoading,
    isParentLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};
