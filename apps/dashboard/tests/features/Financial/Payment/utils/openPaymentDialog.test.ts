import { describe, expect, it } from 'bun:test';
import { createDialogStore } from 'najm-kit';
import { openPaymentDialog } from '@/features/Financial/Payment/utils/openPaymentDialog';

describe('payment dialog submission', () => {
  it('keeps the same form open after rejection and resolves only after a corrected retry succeeds', async () => {
    const store = createDialogStore();
    const form = 'mounted-payment-form';
    const submissions: any[] = [];
    let closed = false;
    const result = openPaymentDialog(options => store.getState().pushDialog(options),
      { children: form, showButtons: false }, async data => {
        submissions.push({ ...data });
        if (submissions.length === 1) throw Object.assign(new Error('Duplicate check'), { name: 'AuthError' });
        return { data: { id: 'receipt-1' } };
      }).then(payment => { closed = true; return payment; });
    const originalDialog = store.getState().dialogs[0];
    const payload = { checkNumber: 'DUPLICATE', amount: 1000, idempotencyKey: 'same-retry-key' };

    // PaymentForm awaits and catches this refusal; the dialog promise stays open.
    await expect(store.getState().popDialog(payload)).rejects.toThrow('Duplicate check');
    expect(closed).toBe(false);
    expect(store.getState().dialogs).toHaveLength(1);
    expect(store.getState().dialogs[0].id).toBe(originalDialog.id);
    expect(store.getState().dialogs[0].children).toBe(form);
    expect(store.getState().dialogs[0].primaryButton?.loading).toBe(false);

    await store.getState().popDialog({ ...payload, checkNumber: 'CORRECTED' });
    expect(await result).toEqual({ id: 'receipt-1' });
    expect(store.getState().dialogs).toHaveLength(0);
    expect(submissions).toEqual([payload, { ...payload, checkNumber: 'CORRECTED' }]);
  });

  it('keeps the dialog loading and open while recording, and cancels without a mutation', async () => {
    const store = createDialogStore();
    let finish!: (value: { data: { id: string } }) => void;
    const result = openPaymentDialog(options => store.getState().pushDialog(options), {},
      () => new Promise(resolve => { finish = resolve; }));
    const submission = store.getState().popDialog({ amount: 1000 });
    expect(store.getState().dialogs).toHaveLength(1);
    expect(store.getState().dialogs[0].primaryButton?.loading).toBe(true);
    finish({ data: { id: 'receipt-2' } });
    await submission;
    expect(await result).toEqual({ id: 'receipt-2' });

    let mutations = 0;
    const cancelled = openPaymentDialog(options => store.getState().pushDialog(options), {}, async () => {
      mutations++;
      return { data: { id: 'never-created' } };
    });
    store.getState().closeDialog(store.getState().dialogs[0].id, null);
    expect(await cancelled).toBeNull();
    expect(mutations).toBe(0);
  });
});
