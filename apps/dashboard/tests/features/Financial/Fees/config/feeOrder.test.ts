import { describe, expect, it } from 'bun:test';
import { FEE_CATEGORY_VALUES } from '@sms/contracts';

import { FEE_CARD_CATEGORY_ORDER, sortFeesByCategory } from '@/features/Financial/Fees/config/feeOrder';

describe('FEE_CARD_CATEGORY_ORDER', () => {
  it('places every fee category exactly once', () => {
    expect([...FEE_CARD_CATEGORY_ORDER].sort()).toEqual([...FEE_CATEGORY_VALUES].sort());
  });
});

describe('sortFeesByCategory', () => {
  it('orders by category, keeps the server order within one, and puts unknown categories last', () => {
    const fees = [
      { id: 'books', type: 'books' },
      { id: 'none', type: null },
      { id: 'cafeteria', type: 'cafeteria' },
      { id: 'tuition-new', type: 'tuition' },
      { id: 'transport', type: 'transport' },
      { id: 'tuition-old', type: 'tuition' },
    ];

    expect(sortFeesByCategory(fees).map((fee) => fee.id)).toEqual([
      'tuition-new',
      'tuition-old',
      'transport',
      'cafeteria',
      'books',
      'none',
    ]);
  });
});
