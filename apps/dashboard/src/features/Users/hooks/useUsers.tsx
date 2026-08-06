'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as userApi from '@/services/userApi';


export const useUsers = (options?) => {
  const { userId, enabled = true } = options || {};

  const crud = useEntityCRUD(['users', 'operators'], {
    getAll: userApi.getUsersApi,
    getById: userApi.getUserByIdApi,
    // "Create" now invites: the account is created and the user sets their own
    // password via an emailed link rather than the admin typing one.
    create: userApi.inviteUserApi,
    update: userApi.updateUserApi,
    delete: userApi.deleteUserApi,
  });

  const { data: users, isLoading: isUsersLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: user, isLoading: isUserLoading } = crud.useGetById(userId, !!userId);

  const { mutateAsync: createUser, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateUser, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteUser, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteUsers, isLoading: isBulkDeleting } = crud.useBulkDelete();

  return {
    // Data
    users,
    user,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllUsers: crud.useGetAll,
    getUserById: crud.useGetById,

    // Mutations
    createUser,
    updateUser,
    deleteUser,
    bulkDeleteUsers,

    // Loading States
    isUsersLoading,
    isUserLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};


