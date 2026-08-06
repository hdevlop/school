'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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

  const query = useQuery({
    queryKey: ['studentRoutes', vehicleId || null, studentId || null],
    queryFn: () => vehicleId
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

  const assignMutation = useMutation({ mutationFn: assignStudentToRouteApi, ...mutationOptions })
  const updateMutation = useMutation({ mutationFn: updateStudentRouteApi, ...mutationOptions })
  const reassignMutation = useMutation({ mutationFn: reassignStudentRouteApi, ...mutationOptions })
  const unassignMutation = useMutation({ mutationFn: unassignStudentFromRouteApi, ...mutationOptions })
  const deleteMutation = useMutation({ mutationFn: deleteStudentRouteApi, ...mutationOptions })

  return {
    routes: query.data?.data || [],
    isLoading: query.isPending && enabled,
    refetch: query.refetch,
    assignStudent: assignMutation.mutateAsync,
    updateRoute: updateMutation.mutateAsync,
    reassignStudent: reassignMutation.mutateAsync,
    unassignStudent: unassignMutation.mutateAsync,
    deleteRoute: deleteMutation.mutateAsync,
    isAssigning: assignMutation.isPending,
    isUpdating: updateMutation.isPending || reassignMutation.isPending,
    isDeleting: unassignMutation.isPending || deleteMutation.isPending,
  }
}
