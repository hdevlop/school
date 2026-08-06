'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPaymentsByStudentApi,
  getPaymentsByFeeApi,
  recordPaymentApi,
  updatePaymentApi,
  deletePaymentApi,
} from '@/services/paymentApi'
import { toast } from 'sonner'

export const usePayments = (studentId?: string, feeId?: string) => {
  const queryClient = useQueryClient()

  // Get payments by student
  const {
    data: studentPayments,
    isLoading: isStudentPaymentsLoading,
    refetch: refetchStudentPayments,
  } = useQuery({
    queryKey: ['payments', 'student', studentId],
    queryFn: () => getPaymentsByStudentApi(studentId!),
    enabled: !!studentId,
  })

  // Get payments by fee
  const {
    data: feePayments,
    isLoading: isFeePaymentsLoading,
    refetch: refetchFeePayments,
  } = useQuery({
    queryKey: ['payments', 'fee', feeId],
    queryFn: () => getPaymentsByFeeApi(feeId!),
    enabled: !!feeId,
  })

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: recordPaymentApi,
    onSuccess: () => {
      toast.success('Payment recorded successfully')
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['fees'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to record payment')
    },
  })

  // Update payment mutation
  const updatePaymentMutation = useMutation({
    mutationFn: updatePaymentApi,
    onSuccess: () => {
      toast.success('Payment updated successfully')
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['fees'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update payment')
    },
  })

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: deletePaymentApi,
    onSuccess: () => {
      toast.success('Payment deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['fees'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete payment')
    },
  })

  return {
    // Student payments
    studentPayments: studentPayments?.data || [],
    isStudentPaymentsLoading,
    refetchStudentPayments,

    // Fee payments
    feePayments: feePayments?.data || [],
    isFeePaymentsLoading,
    refetchFeePayments,

    // Mutations
    recordPayment: recordPaymentMutation.mutateAsync,
    isRecordingPayment: recordPaymentMutation.isPending,

    updatePayment: updatePaymentMutation.mutateAsync,
    isUpdatingPayment: updatePaymentMutation.isPending,

    deletePayment: deletePaymentMutation.mutateAsync,
    isDeletingPayment: deletePaymentMutation.isPending,
  }
}
