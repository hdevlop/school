'use client';

import { useEntityCRUD } from 'najm-kit/query/crud';
import * as alertApi from '@/services/alertApi';
import { useYearScopedList, type YearScopedRead } from '@/features/AcademicYears/hooks/useYearScopedQuery';

/** The list this feature's page opens with; the page warm-up asks for the same. */
export const alertListRead = { resource: 'alerts', fetch: alertApi.getAlertsApi } satisfies YearScopedRead;

/**
 * The viewed year's alerts that the signed-in person may see, or one
 * student's when `studentId` is given. Mutations refresh every year's lists.
 */
export const useAlerts = (options?: { studentId?: string; enabled?: boolean }) => {
  const { studentId, enabled = true } = options || {};

  const crud = useEntityCRUD('alerts', {
    getAll: alertApi.getAlertsApi,
    getById: alertApi.getAlertByIdApi,
    delete: alertApi.deleteAlertApi,
    updateStatus: alertApi.updateAlertStatusApi,
  });

  const {
    data: alerts, isLoading: isAlertsLoading, isError, error, refetch,
  } = useYearScopedList({
    ...(studentId ? { resource: 'alerts', parts: ['student', studentId], fetch: () => alertApi.getStudentAlertsApi(studentId) } : alertListRead),
    enabled,
  });

  const { mutateAsync: updateAlertStatus, isLoading: isUpdatingStatus } = crud.useCustomMutation('updateStatus');
  const { mutateAsync: deleteAlert, isLoading: isDeleting } = crud.useDelete();

  return {
    alerts,
    isAlertsLoading,
    isError,
    error,
    refetch,
    updateAlertStatus,
    isUpdatingStatus,
    deleteAlert,
    isDeleting,
  };
};
