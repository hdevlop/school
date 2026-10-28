'use client';

import { useMemo } from 'react';
import { z } from 'zod';
import { FormInput, NForm } from 'najm-kit';
import { localDateInput } from 'najm-kit/format';
import { useTranslation } from 'najm-i18n/react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { isDateOnly } from '@sms/contracts/academic-years';
import { PermissionButton } from '@/components/PermissionButton';
import { useDialog } from '@/shared/useDialog';
import { addOccasionalChargeApi } from '@/services/feeApi';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import { useBusinessDate } from '@/features/Settings/hooks/useSettings';

function ChargeForm({ fee, date }: { fee: { baseAmount: number | string }; date: string }) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const schema = useMemo(() => z.object({
    date: z.string().refine(isDateOnly, t('fees.validation.dateInvalid')),
    amount: z.coerce.number().positive(t('fees.validation.baseAmountPositive'))
      .refine(value => value === Number(value.toFixed(2)), t('fees.validation.amountInvalid')),
  }), [t]);
  return <NForm id="occasional-charge-form" schema={schema} defaultValues={{ date, amount: Number(fee.baseAmount) }} onSubmit={pop}>
    <div className="grid gap-4 sm:grid-cols-2">
      <FormInput name="date" type="date" formLabel={t('fees.occasional.date')} required />
      <FormInput name="amount" type="number" formLabel={t('fees.form.amount')} required />
    </div>
  </NForm>;
}

export function OccasionalChargeButton({ fee }: { fee: { id: string; name: string; type?: string; academicYear: string; baseAmount: number | string; schedule: string } }) {
  const { t } = useTranslation();
  const { openDialog } = useDialog();
  const queryClient = useQueryClient();
  const { businessDate } = useBusinessDate();
  if (fee.schedule !== 'occasional') return null;
  const label = t(['cafeteria', 'meal'].includes(fee.type ?? '') ? 'fees.occasional.addMeal' : 'fees.occasional.addCharge');
  return <PermissionButton permission="update:fees" type="button" size="sm" variant="outline" onClick={() => {
    const requestId = crypto.randomUUID();
    openDialog({
      title: `${label} - ${fee.name}`,
      children: <ChargeForm fee={fee} date={businessDate ?? localDateInput()} />,
      width: 'md',
      primaryButton: {
        form: 'occasional-charge-form', text: label,
        onClick: async (values: { date: string; amount: number }) => {
          try {
            await withAcademicYear(fee.academicYear, () => addOccasionalChargeApi(fee.id, { ...values, requestId }));
            await Promise.all(['fees', 'installments', 'payments', 'dashboard', 'students'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
            toast.success(t('fees.occasional.added'));
          } catch (error: any) {
            toast.error(error?.response?.data?.message || error?.message || t('fees.occasional.failed'));
            throw error;
          }
        },
      },
    });
  }}><Plus className="h-4 w-4" />{label}</PermissionButton>;
}
