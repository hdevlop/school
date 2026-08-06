'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as expenseApi from '@/services/expenseApi';

export const useExpenses = (options?) => {
  const { expenseId, enabled = true } = options || {};

  const crud = useEntityCRUD('expenses', {
    getAll: expenseApi.getExpensesApi,
    getById: expenseApi.getExpenseByIdApi,
    create: expenseApi.createExpenseApi,
    update: expenseApi.updateExpenseApi,
    delete: expenseApi.deleteExpenseApi,
  });

  const { data: expenses, isLoading: isExpensesLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: expense, isLoading: isExpenseLoading } = crud.useGetById(expenseId, !!expenseId);

  const { mutateAsync: createExpense, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateExpense, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteExpense, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteExpenses, isLoading: isBulkDeleting } = crud.useBulkDelete();

  return {
    // Data
    expenses,
    expense,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllExpenses: crud.useGetAll,
    getExpenseById: crud.useGetById,

    // Mutations
    createExpense,
    updateExpense,
    deleteExpense,
    bulkDeleteExpenses,

    // Loading States
    isExpensesLoading,
    isExpenseLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};