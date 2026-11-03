"use client";

import React from 'react';
import { Label, cn } from 'najm-kit';

type PersonCardProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  avatar: React.ReactNode;
  name: React.ReactNode;
  /** Under the name: a tag, a second name or a licence number. */
  meta?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * The card of a person, in two parts: who they are, then their details across
 * the full width of the card instead of beside the avatar.
 */
export const PersonCard = ({ avatar, name, meta, children, className, ...props }: PersonCardProps) => (
  <div {...props} className={cn('flex min-w-0 flex-col gap-3 p-4', className)}>
    {/* End padding keeps the name clear of the card's menu button. */}
    <div className="flex min-w-0 items-center gap-3 pe-6">
      <div className="shrink-0">{avatar}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Label className="text-md block wrap-break-word font-bold">{name}</Label>
        {meta && <div className="flex min-w-0 flex-wrap items-center gap-1">{meta}</div>}
      </div>
    </div>

    <div className="min-w-0 space-y-2 border-t border-dashed border-border/70 pt-3">{children}</div>
  </div>
);
