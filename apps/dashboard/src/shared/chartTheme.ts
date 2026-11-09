/**
 * Chart chrome drawn from the theme, so grids, axes and tooltips follow
 * light and dark instead of a fixed gray that glares on one and fades on the other.
 * Series colors stay with each chart.
 */
export const CHART_GRID_STROKE = 'var(--border)';

export const CHART_AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 } as const;
export const CHART_AXIS_TICK_SMALL = { fill: 'var(--muted-foreground)', fontSize: 11 } as const;

/** The box a custom recharts tooltip draws in. */
export const CHART_TOOLTIP_CLASS =
  'bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-lg border border-border';

/** Mid blue that reads on a white card and on a dark one. */
export const CHART_INCOME_COLOR = '#3b82f6';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/** 1600000 → "1.6M": large money ticks fit the axis instead of losing their first digits. */
export function compactTick(value: number | string): string {
  const n = Number(value);
  return Number.isFinite(n) ? compact.format(n) : String(value);
}
