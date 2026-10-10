'use client';

import type { ReactNode } from 'react';
import { cn } from 'najm-kit';

/**
 * One titled group of related fields inside a settings tab. Groups are flat —
 * the tab panel draws the rule between them — so a sheet does not stack
 * cards inside a surface that is already one.
 */
export function SettingsGroup({ title, description, action, className, children }: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 py-5 first:pt-1 last:pb-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>
    </section>
  );
}
