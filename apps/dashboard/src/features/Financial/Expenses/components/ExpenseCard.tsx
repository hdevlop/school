"use client";

import React from 'react';
import { DollarSign, Calendar, CreditCard, FileText } from 'lucide-react';
import { Label, NBadge, NSectionInfo } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';
import { getCategoryClass } from '../lib/expenseCategoryStyles';

const ExpenseCard = ({ data: expense }) => {
   const { t } = useTranslation();

   return (
      <div className="flex items-start gap-4 p-4">
         <div className="shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center dark:bg-primary">
               <DollarSign className="w-6 h-6 text-primary dark:text-white" />
            </div>
         </div>

         <div className="flex-1 flex flex-col gap-2">
            <div className='flex flex-col'>
               <Label className="text-md font-bold">
                  {expense.title}
               </Label>

               <NBadge
                  look="outline"
                  className={`w-fit border ${getCategoryClass(expense.category)}`}
               >
                  {t(`expenses.categories.${expense.category}`)}
               </NBadge>
            </div>

            <div className="space-y-2">
               <NSectionInfo
                  icon={DollarSign}
                  iconColor="text-primary"
                  label={t('expenses.form.amount')}
                  value={expense.amount}
                  valueColor="text-primary font-bold"
               />

               <NSectionInfo
                  icon={Calendar}
                  iconColor="text-muted-foreground"
                  label={t('expenses.form.expenseDate')}
                  value={expense.expenseDate}
                  valueColor="text-muted-foreground"
               />

               <NSectionInfo
                  icon={CreditCard}
                  iconColor="text-muted-foreground"
                  label={t('expenses.form.paymentMethod')}
                  value={expense.paymentMethod}
                  valueColor="text-foreground font-medium capitalize"
               />

               <NSectionInfo
                  icon={FileText}
                  iconColor="text-muted-foreground"
                  label={t('expenses.form.invoiceNumber')}
                  value={expense.invoiceNumber}
                  valueColor="text-foreground font-mono text-sm"
               />

            </div>
         </div>
      </div>
   );
};

export default ExpenseCard;