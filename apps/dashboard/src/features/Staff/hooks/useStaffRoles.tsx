'use client';
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as staffRolesApi from '@/services/staffRolesApi';

const ROLE_QUERY_KEYS = ['staff-roles', 'staff-roles-active'];

export const useStaffRoles = (options?) => {
  const { activeOnly = false, enabled = true } = options || {};
  const crud = useEntityCRUD(activeOnly ? ['staff-roles-active', 'staff-roles'] : ROLE_QUERY_KEYS, {
    getAll: activeOnly ? staffRolesApi.getActiveStaffRolesApi : staffRolesApi.getStaffRolesApi,
  });
  const { data, isLoading, isError, error, refetch } = crud.useGetAll(enabled);

  const roles = data || [];

  return {
    staffRoles: activeOnly ? [] : roles,
    activeStaffRoles: activeOnly ? roles : [],
    isStaffRolesLoading: isLoading,
    isError,
    error,
    refetch,
  };
};

export const useStaffRoleMutations = () => {
  const crud = useEntityCRUD(ROLE_QUERY_KEYS, {
    create: staffRolesApi.createStaffRoleApi,
    update: staffRolesApi.updateStaffRoleApi,
    delete: staffRolesApi.deleteStaffRoleApi,
  });
  const createMutation = crud.useCreate();
  const updateMutation = crud.useUpdate();
  const deleteMutation = crud.useDelete();

  const create = async (data) => {
    return createMutation.mutateAsync(data);
  };
  const update = async (payload) => {
    return updateMutation.mutateAsync(payload);
  };
  const remove = async (code) => {
    return deleteMutation.mutateAsync(code);
  };

  return { create, update, remove };
};
