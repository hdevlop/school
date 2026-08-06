'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as paymentApi from '@/services/paymentApi';


export const usePayments = (options?) => {
  const { paymentId, studentId, feeId, enabled = true } = options || {};

  const crud = useEntityCRUD(['payments', 'fees', 'installments'], {
    getAll: paymentApi.getAllPaymentsApi,
    getById: paymentApi.getPaymentByIdApi,
    getByStudent: paymentApi.getPaymentsByStudentApi,
    getByFee: paymentApi.getPaymentsByFeeApi,
    create: paymentApi.recordPaymentApi,
    update: paymentApi.updatePaymentApi,
    delete: paymentApi.deletePaymentApi,
  });

  const { data: payments, isLoading: isPaymentsLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: payment, isLoading: isPaymentLoading } = crud.useGetById(paymentId, !!paymentId);
  const { data: studentPayments, isLoading: isStudentPaymentsLoading } = crud.useGetByParam('student', studentId, !!studentId);
  const { data: feePayments, isLoading: isFeePaymentsLoading } = crud.useGetByParam('fee', feeId, !!feeId);
  const { mutateAsync: createPayment, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updatePayment, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deletePayment, isLoading: isDeleting } = crud.useDelete();

  return {
    // Data
    payments,
    payment,
    studentPayments,
    feePayments,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllPayments: crud.useGetAll,
    getPaymentById: crud.useGetById,
    getStudentPayments: crud.useGetByParam,
    getFeePayments: crud.useGetByParam,

    // Mutations
    createPayment,
    updatePayment,
    deletePayment,

    // Loading States
    isPaymentsLoading,
    isPaymentLoading,
    isStudentPaymentsLoading,
    isFeePaymentsLoading,
    isCreating,
    isUpdating,
    isDeleting,
  };
};