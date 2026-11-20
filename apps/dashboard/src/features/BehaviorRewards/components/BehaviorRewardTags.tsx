'use client';

import { Star } from 'lucide-react';
import { cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { categoryLook, rewardIcon } from '../behaviorRewardConstants';

/** The category's icon on its coloured tile. */
export function CategoryTile({ category, className }: { category?: string | null; className?: string }) {
  const { icon: Icon, tile } = categoryLook(category);
  return (
    <span aria-hidden className={cn('grid size-8 shrink-0 place-items-center rounded-lg', tile, className)}>
      <Icon className="size-4" />
    </span>
  );
}

/** The category's name in its colour, with its tile in front when asked. */
export function CategoryLabel({ category, withIcon = false, className }: { category?: string | null; withIcon?: boolean; className?: string }) {
  const { t } = useTranslation();
  const { icon: Icon, text } = categoryLook(category);
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold', text, className)}>
      {withIcon && <Icon aria-hidden className="size-4 shrink-0" />}
      <span className="truncate">{t(`behaviorRewards.categories.${category}`)}</span>
    </span>
  );
}

/** The reward, told by its icon on a neutral chip. */
export function RewardChip({ type, className }: { type?: string | null; className?: string }) {
  const { t } = useTranslation();
  const Icon = rewardIcon(type);
  const label = t(`behaviorRewards.rewardTypes.${type}`);
  return (
    <span title={label} className={cn('inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground', className)}>
      <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </span>
  );
}

/** The points won, or a dash when the reward carried none. */
export function PointsMark({ points, className }: { points?: number | null; className?: string }) {
  const value = Number(points || 0);
  if (value <= 0) return <span className={cn('text-muted-foreground', className)}>—</span>;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-800 dark:bg-amber-950/60 dark:text-amber-300', className)}>
      <Star aria-hidden className="size-3 fill-current" />
      +{value}
    </span>
  );
}
