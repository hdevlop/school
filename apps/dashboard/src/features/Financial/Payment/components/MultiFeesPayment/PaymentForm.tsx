'use client'

import React, { useEffect, useRef } from 'react';
import { NForm, useDialog } from 'najm-kit';
import { FormInput } from 'najm-kit';
import { DollarSign, CreditCard, Calendar, Hash, CalendarClock, FileText } from 'lucide-react';

import { feePaymentSchema } from '@/lib/validations';
import { useActiveForm } from '@/hooks/useActiveForm';
import { usePaymentStore } from '../../store/paymentStore';
import { toast } from 'sonner';
import { z } from 'zod';

const paymentDetailsSchema = feePaymentSchema.pick({
    amount: true,
    paymentMethod: true,
    paymentDate: true,
    transactionRef: true,
    notes: true,
}).extend({
    checkNumber: z.string().optional().or(z.literal('')),
    checkDueDate: z.string().optional().or(z.literal('')),
    checkBank: z.string().optional().or(z.literal('')),
}).refine(
    (data) => {
        // Only validate check fields if payment method is check
        if (data.paymentMethod === 'check') {
            return data.checkNumber && data.checkNumber.trim() !== '';
        }
        return true;
    },
    {
        message: 'Check number is required when payment method is check',
        path: ['checkNumber'],
    }
).refine(
    (data) => {
        // Only validate check due date if payment method is check
        if (data.paymentMethod === 'check') {
            return data.checkDueDate && /^\d{4}-\d{2}-\d{2}$/.test(data.checkDueDate);
        }
        return true;
    },
    {
        message: 'Check due date is required when payment method is check',
        path: ['checkDueDate'],
    }
);

export const PaymentForm = ({ studentId }) => {
    const { pop } = useDialog();
    const paymentDetails = usePaymentStore((state) => state.paymentDetails);
    const selectedInstallments = usePaymentStore((state) => state.selectedInstallments);
    const selectedCount = usePaymentStore((state) => state.getSelectedCount());
    const totalAllocated = usePaymentStore((state) => state.getTotalAllocated());
    const idempotencyKey = useRef(crypto.randomUUID());

    const localDate = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    };

    const formDefaults = {
        amount: paymentDetails.amount || '',
        paymentMethod: paymentDetails.paymentMethod || 'cash',
        paymentDate: paymentDetails.paymentDate || localDate(),
        transactionRef: paymentDetails.transactionRef || '',
        checkNumber: paymentDetails.checkNumber || '',
        checkDueDate: paymentDetails.checkDueDate || '',
        checkBank: paymentDetails.checkBank || '',
        notes: paymentDetails.notes || '',
    };

    const handleSubmit = async (formData) => {
        const cashReceived = typeof formData.amount === 'string'
            ? parseFloat(formData.amount)
            : formData.amount;

        if (!formData.amount || cashReceived <= 0) {
            toast.error('Payment amount is required');
            return;
        }

        const shouldAutoAllocate = selectedCount === 0;

        if (!shouldAutoAllocate && totalAllocated > cashReceived) {
            const difference = Math.abs(totalAllocated - cashReceived);
            toast.error(`Insufficient cash. Add ${difference.toFixed(2)} MAD to cover the selected installments.`);
            return;
        }

        const allocations = Object.values(selectedInstallments).map((inst: any) => ({
            feeId: inst.feeId,
            number: inst.number,
            amount: inst.allocatedAmount
        }));

        const paymentAmount = shouldAutoAllocate ? cashReceived : totalAllocated;

        if (!studentId) {
            toast.error('Student information is missing');
            return;
        }

        try {
            await pop({
                ...formData,
                studentId: studentId,
                amount: paymentAmount,
                autoAllocate: shouldAutoAllocate,
                allocations: shouldAutoAllocate ? undefined : allocations,
                idempotencyKey: idempotencyKey.current,
            });
            toast.success('Payment recorded successfully!');
        } catch {
            toast.error('Failed to record payment. Please try again.');
        }
    };

    return (
        <NForm
            id='payment-details-form'
            schema={paymentDetailsSchema}
            defaultValues={formDefaults}
            onSubmit={handleSubmit}
            className='h-auto'
        >
            <PaymentDetailsFormContent />
        </NForm>
    );
};

const PaymentDetailsFormContent = () => {
    const { watch } = useActiveForm();
    const setPaymentDetails = usePaymentStore((state) => state.setPaymentDetails);
    const paymentMethod = watch('paymentMethod');

    useEffect(() => {
        const subscription = watch((value) => {
            setPaymentDetails(value);
        });
        return () => subscription.unsubscribe();
    }, [watch, setPaymentDetails]);

    const paymentMethodOptions = [
        { value: 'cash', label: 'Cash' },
        { value: 'check', label: 'Check' },
        { value: 'bankTransfer', label: 'Bank Transfer' },
        { value: 'creditCard', label: 'Credit Card' },
    ];

    const isCheckPayment = paymentMethod === 'check';

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2  gap-4">
                <FormInput
                    name='amount'
                    type='number'
                    icon={DollarSign}
                    formLabel='Amount Received (MAD)'
                    placeholder='0.00'
                    required={true}
                />

                <FormInput
                    name='paymentMethod'
                    type='select'
                    icon={CreditCard}
                    formLabel='Payment Method'
                    items={paymentMethodOptions}
                    required={true}
                />

                <FormInput
                    name='paymentDate'
                    type='date'
                    icon={Calendar}
                    formLabel='Payment Date'
                    required={true}
                />

                <FormInput
                    name='transactionRef'
                    type='text'
                    icon={Hash}
                    formLabel='Reference (Optional)'
                    placeholder='Receipt #, Ref #...'
                />
            </div>

            {isCheckPayment && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                        name='checkNumber'
                        type='text'
                        icon={Hash}
                        formLabel='Check Number'
                        placeholder='Enter check number'
                    />

                    <FormInput
                        name='checkDueDate'
                        type='date'
                        icon={CalendarClock}
                        formLabel='Check Due Date'
                    />
                    <FormInput
                        name='checkBank'
                        type='text'
                        icon={Hash}
                        formLabel='Bank'
                        placeholder='Issuing bank'
                    />
                </div>
            )}

            <FormInput
                name='notes'
                type='textarea'
                icon={FileText}
                formLabel='Notes (Optional)'
                placeholder='Add any notes about this payment...'
            />
        </div>
    );
};
