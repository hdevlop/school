'use client';

import { useEntityCRUD } from 'najm-kit/query/crud';
import * as alertApi from '@/services/alertApi';
import { useYearScopedList } from '@/features/AcademicYears/hooks/useYearScopedQuery';

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
    resource: 'alerts',
    parts: studentId ? ['student', studentId] : [],
    fetch: studentId ? () => alertApi.getStudentAlertsApi(studentId) : alertApi.getAlertsApi,
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
