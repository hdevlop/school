import { describe, expect, it } from 'bun:test';
import { PAYMENT_STATUS_VALUES } from '@sms/contracts';
import { translations } from '@sms/contracts/locales';
import { PaymentValidator } from '../../src/modules/financial/payments/PaymentValidator';
import { withEnglishMessages } from '../support/englishMessages';

const validator = withEnglishMessages(new PaymentValidator({} as any, {} as any, {} as any, {} as any, {} as any, {} as any));

// A refused void or check step read "Impossible de passer un chèque de
// bounced à deposited": the status went into the message as its code.
describe('a refused payment status change', () => {
  it('names the statuses in the request language', () => {
    expect(() => validator.ensureVoidable('bounced')).toThrow('Cannot void payment in status Bounced');
    expect(() => validator.ensureCheckTransition({ paymentMethod: 'check', status: 'bounced' }, 'deposited'))
      .toThrow('Cannot transition check from Bounced to Deposited');
  });

  // The same words the status badges use.
  it('has a label for every payment status in every language', () => {
    for (const language of ['en', 'fr', 'ar', 'es'] as const) {
      const labels = (translations as any)[language].status;
      for (const status of PAYMENT_STATUS_VALUES) expect(typeof labels?.[status]).toBe('string');
    }
  });
});
