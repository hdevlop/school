import type { FeeCategory } from '@sms/contracts';

/**
 * The order of a student's fee cards, by fee type category.
 *
 * Display only, so it lives here rather than in `FEE_CATEGORY_VALUES`, whose
 * order the database enum and its pinned test depend on. Every category is
 * listed exactly once; `feeOrder.test.ts` fails when one is added to the
 * contract without a place here.
 */
export const FEE_CARD_CATEGORY_ORDER = [
  'tuition',
  'transport',
  'cafeteria',
  'registration',
  'books',
  'uniform',
  'sports',
  'technology',
  'fieldtrip',
  'other',
] as const satisfies readonly FeeCategory[];

const CATEGORY_RANK = new Map<string, number>(FEE_CARD_CATEGORY_ORDER.map((category, index) => [category, index]));

/**
 * Sorts a student's fees, whose category the server sends as `type`, by
 * `FEE_CARD_CATEGORY_ORDER`. The sort is stable, so fees of one
 * category keep the server's order (newest first); a fee without a known
 * category goes last.
 */
export const sortFeesByCategory = <Fee extends { type?: string | null }>(fees: readonly Fee[]): Fee[] =>
  [...fees].sort((left, right) =>
    (CATEGORY_RANK.get(left.type ?? '') ?? CATEGORY_RANK.size) -
    (CATEGORY_RANK.get(right.type ?? '') ?? CATEGORY_RANK.size));
