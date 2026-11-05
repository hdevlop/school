"use client";

import React from 'react';
import { NSkeleton } from 'najm-kit';

/** NTable's card surface, so a placeholder sits in the same box as the card it becomes. */
export const CARD_SKELETON_SURFACE = 'overflow-hidden rounded-lg bg-card text-card-foreground najm-border border-border';
const SURFACE = CARD_SKELETON_SURFACE;

/**
 * The loading shape of a person card: the compact row on phones, the full card
 * from `md`. Both are rendered and CSS picks one, so the first paint, before
 * any script runs, already has the shape the loaded list will have. A list
 * whose card does not change with the screen asks for one `shape`.
 */
export function PersonCardSkeleton({ rows = 3, tag = true, shape = 'responsive' }: {
  /** Detail rows on the full card. */
  rows?: number;
  /** Whether the compact row starts its details with a tag. */
  tag?: boolean;
  shape?: 'responsive' | 'compact' | 'full';
}) {
  const compactClass = shape === 'responsive' ? 'md:hidden' : shape === 'full' ? 'hidden' : '';
  const fullClass = shape === 'responsive' ? 'hidden md:block' : shape === 'compact' ? 'hidden' : '';
  return <>
    {/* Same geometry as CompactPersonCard: 40px avatar, a 21px name line and a 22px details line. */}
    <div data-bordered="true" className={`${SURFACE} ${compactClass}`}>
      <div className="flex min-w-0 items-center gap-3 py-2.5 ps-3 pe-10">
        <NSkeleton className="size-10 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex h-5.25 items-center"><NSkeleton className="h-3.5 w-36 max-w-full" /></div>
          <div className="flex h-5.5 items-center gap-1.5">
            {tag && <NSkeleton className="h-5 w-12 shrink-0 rounded-md" />}
            <NSkeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    </div>

    {/* Same geometry as PersonCard: identity, then details across the card. */}
    <div data-bordered="true" className={`${SURFACE} ${fullClass}`}>
      <div className="flex min-w-0 flex-col gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3 pe-6">
          <NSkeleton className="size-12 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <NSkeleton className="h-4 w-36 max-w-full" />
            <NSkeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <div className="min-w-0 space-y-2 border-t border-dashed border-border/70 pt-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex h-5.25 items-center gap-2">
              <NSkeleton className="size-4 shrink-0 rounded-sm" />
              <NSkeleton className={index % 2 ? 'h-3.5 w-3/5' : 'h-3.5 w-4/5'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </>;
}

// NTable's `renderCardSkeleton` takes a component with no props, one per list.
export const StudentCardSkeleton = () => <PersonCardSkeleton rows={4} />;
export const ParentCardSkeleton = () => <PersonCardSkeleton rows={2} />;
export const TeacherCardSkeleton = () => <PersonCardSkeleton rows={3} />;
export const StaffCardSkeleton = () => <PersonCardSkeleton rows={4} />;
export const DriverCardSkeleton = () => <PersonCardSkeleton rows={4} />;
export const UserCardSkeleton = () => <PersonCardSkeleton rows={2} />;
export const DisciplineCardSkeleton = () => <PersonCardSkeleton rows={3} shape="full" />;
export const GradeRosterCardSkeleton = () => <PersonCardSkeleton shape="compact" />;
