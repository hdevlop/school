'use client';

import { useEntityCRUD } from 'najm-kit/query/crud';
import * as disciplineApi from '@/services/disciplineApi';
import { useYearScopedDetail, useYearScopedList, type YearScopedRead } from '@/features/AcademicYears/hooks/useYearScopedQuery';

/** The list this feature's page opens with; the page warm-up asks for the same. */
export const disciplineListRead = { resource: 'discipline', fetch: disciplineApi.getDisciplineApi } satisfies YearScopedRead;

// The viewed year's incidents; mutations refresh every year's list.
export const useDiscipline = (options?: { disciplineId?: string; enabled?: boolean }) => {
  const { disciplineId, enabled = true } = options || {};
  const crud = useEntityCRUD('discipline', {
    getAll: disciplineApi.getDisciplineApi,
    create: disciplineApi.createDisciplineApi,
    update: disciplineApi.updateDisciplineApi,
    delete: disciplineApi.deleteDisciplineApi,
    resolve: disciplineApi.resolveDisciplineApi,
    reopen: disciplineApi.reopenDisciplineApi,
  });

  const list = useYearScopedList({ ...disciplineListRead, enabled });
  const detail = useYearScopedDetail({
    resource: 'discipline', parts: [disciplineId], fetch: () => disciplineApi.getDisciplineByIdApi(disciplineId!),
    enabled: Boolean(disciplineId),
  });
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
