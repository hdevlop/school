"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { Receipt } from 'lucide-react';
import React from 'react';
import ExpenseForm from './ExpenseForm';
import { useExpenses } from '../hooks/useExpenses';
import { useTranslation } from 'najm-i18n/react';
import ExpenseCard from './ExpenseCard';
import { useExpensesTableColumns } from '../hooks/useExpensesTableColumns';
import { useExpensesTableFilters } from '../hooks/useExpensesTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';


function ExpensesTable() {

  const { t } = useTranslation();
  const columns = useExpensesTableColumns();
  const rawFilters = useExpensesTableFilters();

  const {
    expenses,
    createExpense,
    updateExpense,
    deleteExpense,
    isExpensesLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useExpenses();

  const { openDialog, confirmDelete } = useConfirmDelete();

  const handleAddClick = () => {
    openDialog({
      title: t('expenses.dialogs.createTitle'),
      children: <ExpenseForm />,
      primaryButton: {
        form: 'expense-form',
        text: t('expenses.dialogs.createButton'),
        loading: isCreating,
        onClick: async (expenseData) => {
          await createExpense(expenseData);
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
    openDialog({
      title: `${t('expenses.dialogs.editTitle')} - ${expense.title}`,
      children: <ExpenseForm expense={expense} />,
      primaryButton: {
        form: 'expense-form',
        text: t('expenses.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (expenseData) => {
          await updateExpense(expenseData);
        }
      }
    });
  };

  const handleDelete = (expense) => {
    confirmDelete({
      itemName: expense.title,
      confirmText: t('expenses.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteExpense(expense.id);
      }
    });
  };

  const total = expenses?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={Receipt}
        title={t('navigation.expenses')}
        subtitle={t('expenses.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={expenses}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isExpensesLoading}
        renderCard={ExpenseCard}
        addButtonText={t('expenses.dialogs.createButton')}
        defaultMode='table'
      />
    </div>
  );
}

export default ExpensesTable;
