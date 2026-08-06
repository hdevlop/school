'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as payrollApi from '@/services/payrollApi';

export const usePayroll = (options?) => {
  const { period, enabled = true } = options || {};

  const crud = useEntityCRUD('payroll', {
    getAll: payrollApi.getPayrollApi,
    getById: payrollApi.getPayrollByIdApi,
    getByPeriod: payrollApi.getPayrollByPeriodApi,
    update: payrollApi.updatePayslipApi,
    delete: payrollApi.deletePayslipApi,
    deleteBulk: payrollApi.deleteBulkPayslipsApi,
    payStaff: payrollApi.payStaffApi,
    payStaffBulk: payrollApi.payStaffBulkApi,
    unpayStaff: payrollApi.unpayStaffApi,
  });

  // Period list — keyed by ['payroll','period',period] so each period caches separately.
  const {
    data: periodData,
    isLoading: isPayrollLoading,
    isError,
    error,
    refetch,
  } = crud.useGetByParam('period', period, !!period && enabled);

  const { mutateAsync: updatePayslip, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deletePayslip, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeletePayslips, isLoading: isBulkDeleting } = crud.useBulkDelete();

  // useCustomMutation is untyped (mutateAsync infers `void` args) — wrap to keep call sites typed.
  const payStaffMutation = crud.useCustomMutation('payStaff');
  const payStaffBulkMutation = crud.useCustomMutation('payStaffBulk');
  const unpayStaffMutation = crud.useCustomMutation('unpayStaff');
  const payStaff = (vars: { staffId: string; period: string; paymentMethod?: string; paymentDate?: string; transactionRef?: string; notes?: string }) =>
    payStaffMutation.mutateAsync(vars as any);
  const payStaffBulk = (vars: { staffIds: string[]; period: string; paymentMethod?: string; paymentDate?: string; transactionRef?: string; notes?: string }) =>
    payStaffBulkMutation.mutateAsync(vars as any);
  const unpayStaff = (vars: { staffId: string; period: string }) =>
    unpayStaffMutation.mutateAsync(vars as any);
  const isPaying = payStaffMutation.isLoading || payStaffBulkMutation.isLoading || unpayStaffMutation.isLoading;

  const payslips = Array.isArray(periodData?.payslips) ? periodData.payslips : [];
  const summary = periodData?.summary ?? null;

  return {
    payslips,
    summary,
    isError,
    error,
    refetch,
    isPayrollLoading,
    payStaff,
    payStaffBulk,
    unpayStaff,
    updatePayslip,
    deletePayslip,
    bulkDeletePayslips,
    isPaying,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};
