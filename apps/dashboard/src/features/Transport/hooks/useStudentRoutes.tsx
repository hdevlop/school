'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useYearScopedQuery } from '@/features/AcademicYears/hooks/useYearScopedQuery'
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope'
import {
  assignStudentToRouteApi,
  deleteStudentRouteApi,
  getStudentRoutesByStudentApi,
  getStudentRoutesByVehicleApi,
  reassignStudentRouteApi,
  unassignStudentFromRouteApi,
  updateStudentRouteApi,
} from '@/services/transportApi'

export const useStudentRoutes = (options?: { vehicleId?: string; studentId?: string }) => {
  const { vehicleId, studentId } = options || {}
  const queryClient = useQueryClient()
  const enabled = Boolean(vehicleId || studentId)

  const { query, scope } = useYearScopedQuery({
    resource: 'studentRoutes',
    parts: [vehicleId || null, studentId || null],
    fetch: () => vehicleId
      ? getStudentRoutesByVehicleApi(vehicleId)
      : getStudentRoutesByStudentApi(studentId as string),
    enabled,
  })

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['studentRoutes'] }),
      queryClient.invalidateQueries({ queryKey: ['students'] }),
      queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
      queryClient.invalidateQueries({ queryKey: ['fees'] }),
      queryClient.invalidateQueries({ queryKey: ['publicSettings'] }),
    ])
  }

  const mutationOptions = {
    onSuccess: invalidate,
    onError: (error: any) => toast.error(error?.response?.data?.message || error?.message || 'Transport operation failed'),
  }

  const assignMutation = useMutation({
    mutationFn: ({ data, year }: { data: Parameters<typeof assignStudentToRouteApi>[0]; year?: string }) =>
      withAcademicYear(year, () => assignStudentToRouteApi(data)), ...mutationOptions,
  })
  const updateMutation = useMutation({
    mutationFn: ({ data, year }: { data: Parameters<typeof updateStudentRouteApi>[0]; year?: string }) =>
      withAcademicYear(year, () => updateStudentRouteApi(data)), ...mutationOptions,
  })
  const reassignMutation = useMutation({
    mutationFn: ({ data, year }: { data: Parameters<typeof reassignStudentRouteApi>[0]; year?: string }) =>
      withAcademicYear(year, () => reassignStudentRouteApi(data)), ...mutationOptions,
  })
  const unassignMutation = useMutation({
    mutationFn: ({ id, year }: { id: string; year?: string }) =>
      withAcademicYear(year, () => unassignStudentFromRouteApi(id)), ...mutationOptions,
  })
  const deleteMutation = useMutation({
    mutationFn: ({ id, year }: { id: string; year?: string }) =>
      withAcademicYear(year, () => deleteStudentRouteApi(id)), ...mutationOptions,
  })

  return {
    routes: query.data?.data || [],
    isLoading: (query.isPending || !scope.ready) && enabled,
    academicYear: scope.academicYear,
    refetch: query.refetch,
    assignStudent: (data: Parameters<typeof assignStudentToRouteApi>[0], year = scope.academicYear) =>
      assignMutation.mutateAsync({ data, year }),
    updateRoute: (data: Parameters<typeof updateStudentRouteApi>[0], year = scope.academicYear) =>
      updateMutation.mutateAsync({ data, year }),
    reassignStudent: (data: Parameters<typeof reassignStudentRouteApi>[0], year = scope.academicYear) =>
      reassignMutation.mutateAsync({ data, year }),
    unassignStudent: (id: string, year = scope.academicYear) =>
      unassignMutation.mutateAsync({ id, year }),
    deleteRoute: (id: string, year = scope.academicYear) =>
      deleteMutation.mutateAsync({ id, year }),
    isAssigning: assignMutation.isPending,
    isUpdating: updateMutation.isPending || reassignMutation.isPending,
    isDeleting: unassignMutation.isPending || deleteMutation.isPending,
  }
}
