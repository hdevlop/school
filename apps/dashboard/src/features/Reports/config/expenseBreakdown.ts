export type ExpenseBreakdownRow = { category: string; total: number; count: number };

/** Keep the compact legend while accounting for every expense category. */
export function summarizeExpenseBreakdown(rows: ExpenseBreakdownRow[]) {
  const ranked = rows
    .filter(row => row.category !== 'utilities' && row.category !== 'other')
    .sort((left, right) => right.total - left.total);
  const top = ranked.slice(0, 5);
  const others = [
    ...ranked.slice(5),
    ...rows.filter(row => row.category === 'utilities' || row.category === 'other'),
  ];
  const sum = (items: ExpenseBreakdownRow[]) =>
    items.reduce((cents, row) => cents + Math.round(row.total * 100), 0) / 100;
  const otherTotal = sum(others);
  if (otherTotal !== 0) {
    top.push({ category: 'other', total: otherTotal, count: others.reduce((count, row) => count + row.count, 0) });
  }
  return {
    total: sum(rows),
    categories: top,
    noData: rows.length === 0 || rows.every(row => row.total === 0),
  };
}
