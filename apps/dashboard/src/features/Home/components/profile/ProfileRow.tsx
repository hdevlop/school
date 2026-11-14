'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from 'najm-kit';

/** A small uppercase heading over one group of the profile sheet. */
export function ProfileSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-2', className)}>
      <h3 className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
      <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border bg-card">{children}</div>
    </section>
  );
}

type ProfileRowProps = {
  icon: LucideIcon;
  label: ReactNode;
  /** Under the label: the value, or a short state such as "Off". */
  value?: ReactNode;
  /** The row's own control, at its end. */
  action?: ReactNode;
  /** Ties the label to the control it names. */
  labelFor?: string;
};

/** One line of the sheet: a tinted icon, what it is, and what can be done with it. */
export function ProfileRow({ icon: Icon, label, value, action, labelFor }: ProfileRowProps) {
  const Label = labelFor ? 'label' : 'p';
  return (
    <div className="flex min-h-16 items-center gap-3 px-3 py-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <Label {...(labelFor ? { htmlFor: labelFor } : {})} className="text-sm font-semibold leading-5">{label}</Label>
        {value && <div className="min-w-0 text-[13px] leading-5 text-muted-foreground">{value}</div>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
