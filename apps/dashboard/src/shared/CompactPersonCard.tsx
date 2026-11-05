"use client";

import React, { Fragment } from 'react';
import { cn, useMediaQuery } from 'najm-kit';

/** Phones list people as compact rows; wider screens keep the detailed card. */
export const useCompactPersonCard = () => useMediaQuery('(max-width: 767px)');

/** Names stored in capitals read as names; mixed-case names stay as typed. */
export const displayPersonName = (name: string | null | undefined) => {
  const value = name?.trim() ?? '';
  return value && value === value.toUpperCase()
    ? value.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase())
    : value;
};

/** A short tinted label on the details line: a class, a role, a relationship. */
export const CompactTag = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn('min-w-0 shrink-0 truncate rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary', className)}>{children}</span>
);

/** Contact values (codes, phones) keep their left-to-right order in every language. */
export const CompactValue = ({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) => (
  <bdi dir="ltr" className={cn('min-w-0 truncate', mono && 'font-mono')}>{children}</bdi>
);

type CompactPersonCardProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  avatar: React.ReactNode;
  name: string | null | undefined;
  /** Beside the name: a second name, such as the Arabic one. */
  aside?: React.ReactNode;
  /** The details line, separated by dots; empty entries are skipped. */
  details: React.ReactNode[];
  /** After the details, without a separator: a gender mark or a status. */
  trailing?: React.ReactNode;
};

/** The phone card of a person: a name line and one details line beside the avatar. */
export const CompactPersonCard = ({ avatar, name, aside, details, trailing, className, ...props }: CompactPersonCardProps) => {
  const shown = details.filter(detail => detail !== null && detail !== undefined && detail !== false && detail !== '');
  return (
    // End padding keeps the text clear of the card's menu button.
    <div {...props} className={cn('flex min-w-0 items-center gap-3 py-2.5 ps-3 pe-10', className)}>
      <div className="shrink-0">{avatar}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex min-w-0 items-baseline gap-2">
          <span className="truncate font-semibold text-foreground" title={name ?? undefined}>{displayPersonName(name)}</span>
          {aside}
        </p>
        {(shown.length > 0 || trailing) && (
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            {shown.map((detail, index) => (
              <Fragment key={index}>
                {index > 0 && <span aria-hidden>·</span>}
                {detail}
              </Fragment>
            ))}
            {trailing}
          </div>
        )}
      </div>
    </div>
  );
};
