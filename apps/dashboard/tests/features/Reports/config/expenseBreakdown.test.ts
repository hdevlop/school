import { describe, expect, it } from 'bun:test';
import { summarizeExpenseBreakdown } from '../../../../src/features/Reports/config/expenseBreakdown';

describe('reported expense totals', () => {
  it('includes utility spending in both the total and the compact legend', () => {
    const result = summarizeExpenseBreakdown([
      { category: 'supplies', total: 100, count: 1 },
      { category: 'utilities', total: 35.25, count: 2 },
    ]);
    expect(result.total).toBe(135.25);
    expect(result.categories).toEqual([
      { category: 'supplies', total: 100, count: 1 },
      { category: 'other', total: 35.25, count: 2 },
    ]);
  });

  it('shows a utilities-only year as spending rather than an empty report', () => {
    const result = summarizeExpenseBreakdown([{ category: 'utilities', total: 20, count: 1 }]);
    expect(result.noData).toBe(false);
    expect(result.total).toBe(20);
    expect(result.categories).toEqual([{ category: 'other', total: 20, count: 1 }]);
  });

  it('preserves every cent and count with one Other bucket after ranking', () => {
    const rows = [100, 90, 80, 70, 60, 0.1, 0.2].map((total, index) => ({
      category: `category-${index}`, total, count: 1,
    }));
    rows.push({ category: 'other', total: 0.3, count: 2 }, { category: 'utilities', total: 0.4, count: 3 });
    const result = summarizeExpenseBreakdown(rows);
    expect(result.total).toBe(401);
    expect(result.categories.filter(row => row.category === 'other'))
      .toEqual([{ category: 'other', total: 1, count: 7 }]);
    expect(result.categories.reduce((cents, row) => cents + Math.round(row.total * 100), 0)).toBe(40100);
    expect(result.categories.reduce((count, row) => count + row.count, 0)).toBe(12);
    expect(rows).toHaveLength(9);
  });

  it('preserves valid empty and zero-only reports', () => {
    expect(summarizeExpenseBreakdown([])).toEqual({ total: 0, categories: [], noData: true });
    expect(summarizeExpenseBreakdown([{ category: 'utilities', total: 0, count: 0 }]).noData).toBe(true);
  });
});
