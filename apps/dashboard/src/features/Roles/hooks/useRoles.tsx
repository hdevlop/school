'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as roleApi from '@/services/roleApi';

export const useRoles = (options?) => {
  const { roleId, enabled = true } = options || {};

  const crud = useEntityCRUD('roles', {
    getAll: roleApi.getRolesApi,
    getById: roleApi.getRoleByIdApi,
    create: roleApi.createRoleApi,
    update: roleApi.updateRoleApi,
    delete: roleApi.deleteRoleApi,
  });

  const { data: roles, isLoading: isRolesLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: role, isLoading: isRoleLoading } = crud.useGetById(roleId, !!roleId);

  const { mutateAsync: createRole, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateRole, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteRole, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteRoles, isLoading: isBulkDeleting } = crud.useBulkDelete();

  return {
    // Data
    roles,
    role,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllRoles: crud.useGetAll,
    getRoleById: crud.useGetById,

    // Mutations
    createRole,
    updateRole,
    deleteRole,
    bulkDeleteRoles,

    // Loading States
    isRolesLoading,
    isRoleLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};