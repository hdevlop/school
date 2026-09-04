'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'najm-i18n/react';

interface ApiResponse {
  data: any;
  message: string;
  success: boolean;
}

export const useEntityCRUD = (entities, endpoints) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const entityArray = Array.isArray(entities) ? entities : [entities];
  const primaryEntity = entityArray[0];

  const translateMessage = (message?: string | null, fallbackKey?: string, fallbackText = 'Something went wrong') => {
    if (!message) return fallbackKey ? t(fallbackKey) : fallbackText;
    const translated = t(message);
    if (translated !== message) return translated;
    return fallbackKey ? t(fallbackKey) : fallbackText;
  };

  const getError = (error: any) => {
    return translateMessage(error?.response?.data?.message || error?.message);
  };

  const invalidateAllEntities = () => {
    entityArray.forEach(entity => {
      queryClient.invalidateQueries({ queryKey: [entity] });
    });
    // Also invalidate file queries to ensure image cache is refreshed
    queryClient.invalidateQueries({ queryKey: ['file'] });
  };

  const useGetAll = (enabled = true) => {
    const query: any = useQuery({
      queryKey: [primaryEntity],
      queryFn: endpoints.getAll,
      enabled,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
    });

    return {
      data: query.data?.data || [],
      isLoading: query.isPending,
      isError: query.isError,
      error: query.error,
      refetch: query.refetch,
    };
  };

  const useGetById = (id, enabled = true) => {
    const query = useQuery({
      queryKey: [primaryEntity, id],
      queryFn: () => endpoints.getById(id),
      enabled: enabled && !!id,
    });

    return {
      data: query.data?.data || null,
      isLoading: query.isPending,
      isError: query.isError,
      error: query.error,
      refetch: query.refetch,
    };
  };

  // Generic parameterized GET operation
  // Usage: endpoints.getByParam = { key: 'student', fn: getFeesByStudentApi }
  const useGetByParam = (paramName: string, paramValue: any, enabled = true) => {
    const query = useQuery({
      queryKey: [primaryEntity, paramName, paramValue],
      queryFn: () => {
        const paramEndpoint = endpoints[`getBy${paramName.charAt(0).toUpperCase() + paramName.slice(1)}`];
        if (!paramEndpoint) {
          throw new Error(`Endpoint getBy${paramName.charAt(0).toUpperCase() + paramName.slice(1)} not found`);
        }
        return paramEndpoint(paramValue);
      },
      enabled: enabled && !!paramValue,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
    });

    return {
      data: query.data?.data || [],
      isLoading: query.isPending,
      isError: query.isError,
      error: query.error,
      refetch: query.refetch,
    };
  };

  const useCreate = () => {
    const mutation = useMutation({
      mutationFn: endpoints.create,
      onSuccess: (response: ApiResponse) => {
        invalidateAllEntities();
        toast.success(translateMessage(response?.message, `${primaryEntity}.success.created`, 'Created successfully'));
      },
      onError: (error) => {
        toast.error(getError(error));
      },
    });

    return {
      mutate: mutation.mutate,
      mutateAsync: mutation.mutateAsync,
      isLoading: mutation.isPending,
      isError: mutation.isError,
      error: mutation.error,
    };
  };

  const useUpdate = () => {
    const mutation = useMutation({
      mutationFn: endpoints.update,
      onSuccess: (response: ApiResponse) => {
        invalidateAllEntities();
        toast.success(translateMessage(response.message, `${primaryEntity}.success.updated`, 'Updated successfully'));
      },
      onError: (error) => {
        toast.error(getError(error));
      },
    });

    return {
      mutate: mutation.mutate,
      mutateAsync: mutation.mutateAsync,
      isLoading: mutation.isPending,
      isError: mutation.isError,
      error: mutation.error,
    };
  };

  const useDelete = () => {
    const mutation = useMutation({
      mutationFn: endpoints.delete,
      onSuccess: (response: ApiResponse) => {
        invalidateAllEntities();
        toast.success(translateMessage(response.message, `${primaryEntity}.success.deleted`, 'Deleted successfully'));
      },
      onError: (error) => {
        toast.error(getError(error));
      },
    });

    return {
      mutate: mutation.mutate,
      mutateAsync: mutation.mutateAsync,
      isLoading: mutation.isPending,
      isError: mutation.isError,
      error: mutation.error,
    };
  };

  const useBulkCreate = () => {
    const mutation = useMutation({
      mutationFn: endpoints.createBulk,
      onSuccess: (response: ApiResponse) => {
        invalidateAllEntities();
        toast.success(translateMessage(response?.message, `${primaryEntity}.success.created`, 'Created successfully'));
      },
      onError: (error) => {
        toast.error(getError(error));
      },
    });

    return {
      mutate: mutation.mutate,
      mutateAsync: mutation.mutateAsync,
      isLoading: mutation.isPending,
      isError: mutation.isError,
      error: mutation.error,
    };
  };


  const useBulkDelete = () => {
    const mutation = useMutation({
      mutationFn: endpoints.deleteBulk,
      onSuccess: (response: ApiResponse) => {
        invalidateAllEntities();
        toast.success(translateMessage(response.message, `${primaryEntity}.success.bulkDeleted`, 'Deleted successfully'));
      },
      onError: (error) => {
        toast.error(getError(error));
      },
    });

    return {
      mutate: mutation.mutate,
      mutateAsync: mutation.mutateAsync,
      isLoading: mutation.isPending,
      isError: mutation.isError,
      error: mutation.error,
    };
  };

  const useCustomMutation = (mutationKey) => {
    const endpoint = endpoints[mutationKey];
    const mutation = useMutation({
      mutationFn: endpoint,
      onSuccess: (response: ApiResponse) => {
        invalidateAllEntities();
        toast.success(translateMessage(response.message, `${primaryEntity}.success.updated`, 'Saved successfully'));
      },
      onError: (error) => {
        toast.error(getError(error));
      },
    });

    return {
      mutate: mutation.mutate,
      mutateAsync: mutation.mutateAsync,
      isLoading: mutation.isPending,
      isError: mutation.isError,
      error: mutation.error,
    };
  };

  return {
    useGetAll,
    useGetById,
    useGetByParam,
    useCreate,
    useUpdate,
    useDelete,
    useBulkDelete,
    useBulkCreate,
    useCustomMutation,
  };
};
