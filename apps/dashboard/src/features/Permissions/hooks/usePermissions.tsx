'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as permissionApi from '@/services/permissionApi';

/**
 * Full CRUD over the permission catalogue (the building blocks roles are
 * granted). Shares the 'permissions' query key with the role-assignment
 * editor, so editing the catalogue keeps that view in sync.
 */
export const usePermissions = (options?) => {
  const { permissionId, enabled = true } = options || {};

  const crud = useEntityCRUD('permissions', {
    getAll: permissionApi.getPermissionsApi,
    getById: permissionApi.getPermissionByIdApi,
    create: permissionApi.createPermissionApi,
    update: permissionApi.updatePermissionApi,
    delete: permissionApi.deletePermissionApi,
  });

  const { data: permissions, isLoading: isPermissionsLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: permission, isLoading: isPermissionLoading } = crud.useGetById(permissionId, !!permissionId);

  const { mutateAsync: createPermission, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updatePermission, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deletePermission, isLoading: isDeleting } = crud.useDelete();

  return {
    permissions,
    permission,

    isError,
    error,
    refetch,

    createPermission,
    updatePermission,
    deletePermission,

    isPermissionsLoading,
    isPermissionLoading,
    isCreating,
    isUpdating,
    isDeleting,
  };
};
