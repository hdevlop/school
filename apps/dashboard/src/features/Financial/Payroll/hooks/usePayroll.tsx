'use client'
import { useEntityCRUD } from 'najm-kit/query/crud';
import { useYearScopedDetail } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import * as payrollApi from '@/services/payrollApi';

export const usePayroll = (options?) => {
  const { period, enabled = true } = options || {};
  const { viewingYear } = useViewingAcademicYear();
  const write = <T,>(run: () => Promise<T>) => {
    if (!viewingYear) throw new Error('Academic year is still loading');
    return withAcademicYear(viewingYear, run);
  };

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

  // Both the selected year and period identify one payroll view.
  const {
    data: periodData,
    isLoading: isPayrollLoading,
    isError,
    error,
    refetch,
  } = useYearScopedDetail({
    resource: 'payroll', parts: ['period', period],
    fetch: () => payrollApi.getPayrollByPeriodApi(period), enabled: !!period && enabled,
  });

  // Who the period pays, teachers included: the server's payroll eligibility.
  const {
    data: rosterData,
    isLoading: isRosterLoading,
    isError: isRosterError,
    error: rosterError,
  } = useYearScopedDetail({
    resource: 'payroll', parts: ['roster'],
    fetch: payrollApi.getPayrollRosterApi, enabled,
  });

  const { mutateAsync: updatePayslip, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deletePayslip, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeletePayslips, isLoading: isBulkDeleting } = crud.useBulkDelete();

  // useCustomMutation is untyped (mutateAsync infers `void` args) — wrap to keep call sites typed.
  const payStaffMutation = crud.useCustomMutation('payStaff');
  const payStaffBulkMutation = crud.useCustomMutation('payStaffBulk');
  const unpayStaffMutation = crud.useCustomMutation('unpayStaff');
  const payStaff = (vars: { staffId: string; period: string; paymentMethod?: string; paymentDate?: string; transactionRef?: string; notes?: string }) =>
    write(() => payStaffMutation.mutateAsync(vars as any));
  const payStaffBulk = (vars: { staffIds: string[]; period: string; paymentMethod?: string; paymentDate?: string; transactionRef?: string; notes?: string }) =>
    write(() => payStaffBulkMutation.mutateAsync(vars as any));
  const unpayStaff = (vars: { staffId: string; period: string }) =>
    write(() => unpayStaffMutation.mutateAsync(vars as any));
  const isPaying = payStaffMutation.isLoading || payStaffBulkMutation.isLoading || unpayStaffMutation.isLoading;

  const payslips = Array.isArray(periodData?.payslips) ? periodData.payslips : [];
  const summary = periodData?.summary ?? null;
  const roster = Array.isArray(rosterData) ? rosterData : [];

  return {
    payslips,
    summary,
    roster,
    isRosterLoading,
    isRosterError,
    rosterError,
    isError,
    error,
    refetch,
    isPayrollLoading,
    payStaff,
    payStaffBulk,
    unpayStaff,
    updatePayslip: (data) => write(() => updatePayslip(data)),
    deletePayslip: (id) => write(() => deletePayslip(id)),
    bulkDeletePayslips: (ids) => write(() => bulkDeletePayslips(ids)),
    isPaying,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};
