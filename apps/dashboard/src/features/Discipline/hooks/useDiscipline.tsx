'use client';

import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as disciplineApi from '@/services/disciplineApi';

export const useDiscipline = (options?: { disciplineId?: string; enabled?: boolean }) => {
  const { disciplineId, enabled = true } = options || {};
  const crud = useEntityCRUD('discipline', {
    getAll: disciplineApi.getDisciplineApi,
    getById: disciplineApi.getDisciplineByIdApi,
    create: disciplineApi.createDisciplineApi,
    update: disciplineApi.updateDisciplineApi,
    delete: disciplineApi.deleteDisciplineApi,
    resolve: disciplineApi.resolveDisciplineApi,
    reopen: disciplineApi.reopenDisciplineApi,
  });

  const list = crud.useGetAll(enabled);
  const detail = crud.useGetById(disciplineId, Boolean(disciplineId));
  const create = crud.useCreate();
  const update = crud.useUpdate();
  const remove = crud.useDelete();
  const resolve = crud.useCustomMutation('resolve');
  const reopen = crud.useCustomMutation('reopen');

  return {
    incidents: list.data,
    incident: detail.data,
    isDisciplineLoading: list.isLoading,
    isIncidentLoading: detail.isLoading,
    isError: list.isError,
    error: list.error,
    refetch: list.refetch,
    createIncident: create.mutateAsync,
    updateIncident: update.mutateAsync,
    deleteIncident: remove.mutateAsync,
    resolveIncident: resolve.mutateAsync,
    reopenIncident: reopen.mutateAsync,
    isCreating: create.isLoading,
    isUpdating: update.isLoading,
    isDeleting: remove.isLoading,
    isResolving: resolve.isLoading,
    isReopening: reopen.isLoading,
  };
};
