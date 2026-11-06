'use client'
import { useEntityCRUD } from 'najm-kit/query/crud';
import * as expenseApi from '@/services/expenseApi';
import { useYearScopedDetail, useYearScopedList, type YearScopedRead } from '@/features/AcademicYears/hooks/useYearScopedQuery';

/** The list this feature's page opens with; the page warm-up asks for the same. */
export const expenseListRead = { resource: 'expenses', fetch: expenseApi.getExpensesApi } satisfies YearScopedRead;

export const useExpenses = (options?) => {
  const { expenseId, enabled = true } = options || {};

  const crud = useEntityCRUD('expenses', {
    getAll: expenseApi.getExpensesApi,
    getById: expenseApi.getExpenseByIdApi,
    create: expenseApi.createExpenseApi,
    update: expenseApi.updateExpenseApi,
    delete: expenseApi.deleteExpenseApi,
  });

  const { data: expenses, isLoading: isExpensesLoading, isError, error, refetch, academicYear } =
    useYearScopedList({ ...expenseListRead, enabled });
  const { data: expense, isLoading: isExpenseLoading } = useYearScopedDetail({
    resource: 'expenses', parts: [expenseId], fetch: () => expenseApi.getExpenseByIdApi(expenseId),
    enabled: Boolean(expenseId),
  });

  const { mutateAsync: createExpense, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateExpense, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteExpense, isLoading: isDeleting } = crud.useDelete();

  return {
    // Data
    expenses,
    expense,
    academicYear,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    // Mutations
    createExpense,
    updateExpense,
    deleteExpense,

    // Loading States
    isExpensesLoading,
    isExpenseLoading,
    isCreating,
    isUpdating,
    isDeleting,
  };
};
