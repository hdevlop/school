import { describe, expect, it } from 'bun:test';
import { PAYMENT_METHOD_VALUES, PAYMENT_STATUS_VALUES } from '@sms/contracts';
import ar from '@server/locales/ar.json';
import en from '@server/locales/en.json';
import es from '@server/locales/es.json';
import fr from '@server/locales/fr.json';

import {
  FILTERABLE_PAYMENT_STATUS_VALUES,
  buildPaymentMethodOptions,
  buildPaymentMethodOptionsFor,
  buildPaymentStatusFilterOptions,
} from './paymentOptions';

const echo = (key: string) => key;

describe('payment method options', () => {
  it('offers exactly what the API accepts, in contract order', () => {
    expect(buildPaymentMethodOptions(echo).map((option) => option.value)).toEqual([
      ...PAYMENT_METHOD_VALUES,
    ]);
  });

  it('keeps a stored method selectable while a payment is corrected', () => {
    const options = buildPaymentMethodOptionsFor(echo, 'wireTransfer');

    expect(options).toHaveLength(PAYMENT_METHOD_VALUES.length + 1);
    expect(options.at(-1)?.value).toBe('wireTransfer' as never);
  });
});

/**
 * The one place the dashboard deliberately offers less than the API accepts.
 * Pinned so that widening it is a decision, made together with the four
 * translations it would need.
 */
describe('the payment status filter subset', () => {
  it('offers only the four states a user can meaningfully filter by', () => {
    expect([...FILTERABLE_PAYMENT_STATUS_VALUES]).toEqual([
      'completed',
      'pending',
      'failed',
      'refunded',
    ]);
    expect(buildPaymentStatusFilterOptions(echo).map((option) => option.value)).toEqual([
      ...FILTERABLE_PAYMENT_STATUS_VALUES,
    ]);
  });

  it('never offers a state the server would reject', () => {
    for (const value of FILTERABLE_PAYMENT_STATUS_VALUES) {
      expect(PAYMENT_STATUS_VALUES).toContain(value);
    }
  });

  it('leaves out exactly the check-lifecycle states the server owns', () => {
    const offered = new Set<string>(FILTERABLE_PAYMENT_STATUS_VALUES);

    expect(PAYMENT_STATUS_VALUES.filter((value) => !offered.has(value))).toEqual([
      'deposited',
      'bounced',
      'voided',
    ]);
  });

  /**
   * Why they are left out rather than merely unloved: they have no label in
   * any catalog, so offering them would put raw keys in the filter.
   */
  it('has a translation for each offered state, and none for the omitted ones', () => {
    const catalogs: Record<string, any> = { en, fr, ar, es };
    const offered = new Set<string>(FILTERABLE_PAYMENT_STATUS_VALUES);

    for (const [language, catalog] of Object.entries(catalogs)) {
      for (const value of FILTERABLE_PAYMENT_STATUS_VALUES) {
        expect(catalog.payments.status[value], `${language} is missing payments.status.${value}`).toBeTruthy();
      }
      for (const value of PAYMENT_STATUS_VALUES.filter((v) => !offered.has(v))) {
        expect(
          catalog.payments.status[value],
          `${language} now has payments.status.${value}; the subset can be widened`,
        ).toBeUndefined();
      }
    }
  });
});
