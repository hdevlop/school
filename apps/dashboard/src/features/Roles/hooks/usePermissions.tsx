'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as permissionApi from '@/services/permissionApi';

/**
 * The permissions currently assigned to a single role, plus the
 * assign / remove mutations to toggle them. Both mutations invalidate the
 * role-permissions cache so the editor reflects the latest assignment.
 *
 * The full permission catalogue lives in the Permissions feature
 * (`@/features/Permissions/hooks/usePermissions`).
 */
export const useRolePermissions = (roleId?: string, enabled = true) => {
  const crud = useEntityCRUD(['role-permissions', 'roles'], {
    getByRole: permissionApi.getPermissionsByRoleApi,
    assign: permissionApi.assignPermissionToRoleApi,
    remove: permissionApi.removePermissionFromRoleApi,
  });

  const { data, isLoading, refetch } = crud.useGetByParam('role', roleId, enabled && !!roleId);

  const assignMutation = crud.useCustomMutation('assign');
  const removeMutation = crud.useCustomMutation('remove');

  const assign = (permissionId: string) =>
    (assignMutation.mutateAsync as any)({ roleId, permissionId });

  const remove = (permissionId: string) =>
    (removeMutation.mutateAsync as any)({ roleId, permissionId });

  return {
    rolePermissions: data || [],
    isRolePermissionsLoading: isLoading,
    refetch,
    assign,
    remove,
    isMutating: assignMutation.isLoading || removeMutation.isLoading,
  };
};
