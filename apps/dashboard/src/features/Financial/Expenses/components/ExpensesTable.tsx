"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { NPageHeader, NPageHeaderActions, NEmptyState, NButton, NErrorState, NForbiddenState } from 'najm-kit';
import { hasFailedToLoad, isAuthorizationError, isCountUnknown } from '@/services/apiError';
import { useDialog } from '@/shared/useDialog';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { Receipt, Plus, SearchX, Eye, Pencil, Trash2, Check, X, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { handleApprovalApi, recordPaymentApi } from '@/services/expenseApi';
import ExpensePaymentForm from './ExpensePaymentForm';
import React from 'react';
import ExpenseForm from './ExpenseForm';
import { useExpenses } from '../hooks/useExpenses';
import { useTranslation } from 'najm-i18n/react';
import ExpenseCard from './ExpenseCard';
import { useExpensesTableColumns } from '../hooks/useExpensesTableColumns';
import { useExpensesTableFilters } from '../hooks/useExpensesTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';


function ExpensesTable() {

  const { t } = useTranslation();
  const columns = useExpensesTableColumns();
  const rawFilters = useExpensesTableFilters();

  const {
    expenses,
    error,
    academicYear,
    createExpense,
    updateExpense,
    deleteExpense,
    refetch,
    isExpensesLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useExpenses();

  const { openDialog, confirmDelete } = useDialog();

  const handleAddClick = () => {
    if (!academicYear) return;
    const targetYear = academicYear;
    openDialog({
      title: t('expenses.dialogs.createTitle'),
      children: <ExpenseForm />,
      primaryButton: {
        form: 'expense-form',
        text: t('expenses.dialogs.createButton'),
        loading: isCreating,
        onClick: async (expenseData) => {
          await withAcademicYear(targetYear, () => createExpense(expenseData));
        }
      }
    });
  };

  const handleView = (expense) => {
    openDialog({
      title: t('expenses.dialogs.viewTitle'),
      children: <ExpenseCard data={expense} />,
      className: 'max-w-3xl',
      showButtons: false,
    });
  };

  const handleEdit = (expense) => {
    if (!academicYear) return;
    const targetYear = academicYear;
    openDialog({
      title: `${t('expenses.dialogs.editTitle')} - ${expense.title}`,
      children: <ExpenseForm expense={expense} />,
      primaryButton: {
        form: 'expense-form',
        text: t('expenses.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (expenseData) => {
          await withAcademicYear(targetYear, () => updateExpense(expenseData));
        }
      }
    });
  };

  const handleDelete = (expense) => {
    if (!academicYear) return;
    const targetYear = academicYear;
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: expense.title,
      confirmText: t('expenses.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await withAcademicYear(targetYear, () => deleteExpense(expense.id));
      }
    });
  };

  // Approval, rejection and payment have their own routes, which record who
  // acted and how the expense was paid; the edit form can only cancel.
  const runWorkflow = async (action: () => Promise<unknown>, successKey: string) => {
    if (!academicYear) return;
    const targetYear = academicYear;
    try {
      await withAcademicYear(targetYear, action);
      toast.success(t(successKey));
      await refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? error?.message ?? t('common.feedback.errorTitle'));
    }
  };

  const handleApprove = (expense) =>
    runWorkflow(() => handleApprovalApi(expense.id, { action: 'approve' }), 'expenses.success.approved');

  const handleReject = (expense) => {
    const rejectionReason = window.prompt(t('expenses.actions.rejectReason'))?.trim();
    if (!rejectionReason) return;
    return runWorkflow(() => handleApprovalApi(expense.id, { action: 'reject', rejectionReason }), 'expenses.success.rejected');
  };

  const handleRecordPayment = async (expense) => {
    const payment = await openDialog({
      title: `${t('expenses.actions.paymentTitle')} - ${expense.title}`,
      children: <ExpensePaymentForm expense={expense} />,
      primaryButton: { form: 'expense-payment-form', text: t('expenses.actions.recordPayment') },
    });
    if (!payment) return;
    return runWorkflow(() => recordPaymentApi(expense.id, payment), 'expenses.success.paymentRecorded');
  };

  // Providing `menu.row` replaces NTable's built-in items, so View, Edit and
  // Delete are restated around the workflow step the expense is at. A paid
  // expense is closed: the server refuses to edit or delete it.
  const rowMenu = (expense) => expense.status === 'paid' ? [
    { label: t('common.view'), icon: Eye, onSelect: () => handleView(expense) },
  ] : [
    { label: t('common.view'), icon: Eye, onSelect: () => handleView(expense) },
    { label: t('common.edit'), icon: Pencil, onSelect: () => handleEdit(expense) },
    ...(expense.status === 'pending' ? [
      { label: t('expenses.actions.approve'), icon: Check, separatorBefore: true, onSelect: () => handleApprove(expense) },
      { label: t('expenses.actions.reject'), icon: X, onSelect: () => handleReject(expense) },
    ] : []),
    ...(expense.status === 'approved' ? [
      { label: t('expenses.actions.recordPayment'), icon: Banknote, separatorBefore: true, onSelect: () => handleRecordPayment(expense) },
    ] : []),
    { label: t('common.delete'), icon: Trash2, danger: true, separatorBefore: true, onSelect: () => handleDelete(expense) },
  ];

  const total = expenses?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={Receipt}
        title={t('navigation.expenses')}
        subtitle={isCountUnknown(error, expenses, isExpensesLoading) ? undefined : t('expenses.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        responsiveSkeleton
        data={expenses}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        menu={{ row: rowMenu }}
        loading={isExpensesLoading}
        error={hasFailedToLoad(error, expenses) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={ExpenseCard}
        addButtonText={t('expenses.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.expenses}
            title={t('emptyStates.expenses.title')}
            description={t('emptyStates.expenses.description')}
            action={(
              <NButton size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('expenses.dialogs.createButton')}
              </NButton>
            )}
          />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={SearchX}
            title={t('emptyStates.filtered.title')}
            description={t('emptyStates.filtered.description')}
          />
        )}
        defaultMode='table'
      />
    </div>
  );
}

export default ExpensesTable;
