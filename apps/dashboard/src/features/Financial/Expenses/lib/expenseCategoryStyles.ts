// Shared category color tokens for expense views (card + table).
// Map an internal category key to a tailwind utility string.

export const CATEGORY_CLASS_MAP: Record<string, string> = {
  rent: 'border-blue-200 bg-blue-50 text-blue-700',
  tax: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  maintenance: 'border-amber-200 bg-amber-50 text-amber-700',
  utilities: 'border-violet-200 bg-violet-50 text-violet-700',
  equipment: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  supplies: 'border-sky-200 bg-sky-50 text-sky-700',
  transport: 'border-orange-200 bg-orange-50 text-orange-700',
  food: 'border-lime-200 bg-lime-50 text-lime-700',
  security: 'border-rose-200 bg-rose-50 text-rose-700',
  cleaning: 'border-teal-200 bg-teal-50 text-teal-700',
  insurance: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  marketing: 'border-pink-200 bg-pink-50 text-pink-700',
  training: 'border-purple-200 bg-purple-50 text-purple-700',
  technology: 'border-slate-300 bg-slate-50 text-slate-700',
  miscellaneous: 'border-zinc-300 bg-zinc-50 text-zinc-700',
};

export const getCategoryClass = (category?: string): string =>
  CATEGORY_CLASS_MAP[category || ''] || 'border-muted bg-muted text-foreground';
