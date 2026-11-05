"use client";

import React from 'react';
import { NSkeleton, cn } from 'najm-kit';
import { CARD_SKELETON_SURFACE as SURFACE } from './PersonCardSkeleton';

// Loading shapes for NTable's `renderCardSkeleton`, one per card layout, each
// measured against the card it stands in for so the list does not move when
// rows arrive. Lines are 21px (text-sm), badges 24px and detail rows 29px apart.

const Bar = ({ className }: { className: string }) => <NSkeleton className={cn('max-w-full', className)} />;

const DetailRow = ({ width = 'w-3/5' }: { width?: string }) => (
  <div className="flex h-5.25 items-center gap-2">
    <NSkeleton className="size-4 shrink-0 rounded-sm" />
    <Bar className={cn('h-3.5', width)} />
  </div>
);

/**
 * The common record card: a 48px icon at the start, a title (with badges when
 * `badge`) and `rows` icon-and-label rows under it.
 */
export function RecordCardSkeleton({ rows, badge = false }: { rows: number; badge?: boolean }) {
  return (
    <div data-bordered="true" className={SURFACE}>
      <div className="flex items-start gap-4 p-4">
        <NSkeleton className="size-12 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className={cn('flex items-center gap-2', badge ? 'h-6' : 'h-5.25')}>
            <Bar className="h-4 w-2/5" />
            {badge && <NSkeleton className="h-6 w-14 shrink-0 rounded-full" />}
          </div>
          <div className="space-y-2">
            {Array.from({ length: rows }).map((_, index) => <DetailRow key={index} width={index % 2 ? 'w-2/5' : 'w-3/5'} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** FeeCard: student, paid to date, then the progress bar and its legend. */
export function FeeCardSkeleton() {
  return (
    <div data-bordered="true" className={SURFACE}>
      {/* FeeCard draws its own border (green once paid, transparent otherwise). */}
      <div className="flex flex-col gap-3 border border-transparent p-4">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 pe-6">
          <NSkeleton className="size-8 rounded-full" />
          <div className="min-w-0">
            <div className="flex h-5 items-center"><Bar className="h-3.5 w-32" /></div>
            <div className="flex h-4 items-center"><Bar className="h-3 w-24" /></div>
          </div>
          <NSkeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex flex-col items-center">
          <div className="flex h-4.5 items-center"><Bar className="h-3 w-20" /></div>
          <div className="flex h-6.75 items-center"><Bar className="h-5 w-28" /></div>
        </div>
        <div className="space-y-1">
          <NSkeleton className="h-2 w-full rounded-full" />
          <div className="flex h-4.25 items-center justify-between gap-2">
            <Bar className="h-2.5 w-28" />
            <Bar className="h-2.5 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** PayrollCard: staff member and contract, then amount, status and the pay button. */
export function PayrollCardSkeleton() {
  return (
    <div data-bordered="true" className={SURFACE}>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-8 items-center gap-3">
            <NSkeleton className="size-8 shrink-0 rounded-full" />
            <Bar className="h-3.5 w-28" />
          </div>
          <NSkeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col items-start gap-1">
            <div className="flex h-5.25 items-center"><Bar className="h-4 w-20" /></div>
            <NSkeleton className="h-6 w-20 rounded-full" />
          </div>
          <NSkeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** ReminderCard: student and days overdue, then due date, amount and the remind button. */
export function ReminderCardSkeleton() {
  return (
    <div data-bordered="true" className={SURFACE}>
      <div className="flex flex-col gap-2 rounded-lg border border-s-4 border-border bg-card p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <NSkeleton className="size-8 shrink-0 rounded-full" />
            <div className="min-w-0">
              <div className="flex h-5.25 items-center"><Bar className="h-3.5 w-32" /></div>
              <div className="flex h-4.5 items-center"><Bar className="h-3 w-20" /></div>
            </div>
          </div>
          <NSkeleton className="h-6 w-28 rounded-full" />
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex h-5.25 items-center"><Bar className="h-3.5 w-48" /></div>
            <div className="flex h-5.25 items-center"><Bar className="h-3.5 w-24" /></div>
            <div className="flex h-5.25 items-center"><Bar className="h-3.5 w-20" /></div>
          </div>
          <NSkeleton className="h-8 w-24 shrink-0 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** AlertCard: title with type, priority and status, then subject and date. */
export function AlertCardSkeleton() {
  return (
    <div data-bordered="true" className={SURFACE}>
      <div className="space-y-2 p-3">
        <div className="flex h-6 items-center gap-2">
          <Bar className="h-4 w-32" />
          <NSkeleton className="h-6 w-14 rounded-full" />
          <NSkeleton className="h-6 w-14 rounded-full" />
        </div>
        <DetailRow />
        <DetailRow width="w-2/5" />
      </div>
    </div>
  );
}

/** BehaviorRewardCard: the student, the reward tags, then class and date. */
export function BehaviorRewardCardSkeleton() {
  return (
    <div data-bordered="true" className={SURFACE}>
      <div className="flex flex-col gap-3 p-4 pe-10">
        <div className="flex items-center gap-3">
          <NSkeleton className="size-12 shrink-0 rounded-full" />
          <div className="space-y-2">
            <Bar className="h-4 w-36" />
            <Bar className="h-3 w-20" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            <NSkeleton className="h-6 w-20 rounded-md" />
            <NSkeleton className="h-6 w-16 rounded-full" />
            <NSkeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="grid gap-2">
            <div className="flex h-4 items-center gap-2"><NSkeleton className="size-4 rounded-sm" /><Bar className="h-3 w-24" /></div>
            <div className="flex h-4 items-center gap-2"><NSkeleton className="size-4 rounded-sm" /><Bar className="h-3 w-32" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// NTable's `renderCardSkeleton` takes a component with no props, one per list.
export const ClassCardSkeleton = () => <RecordCardSkeleton rows={4} />;
export const SectionCardSkeleton = () => <RecordCardSkeleton rows={4} />;
export const CycleCardSkeleton = () => <RecordCardSkeleton rows={2} badge />;
export const SubjectCardSkeleton = () => <RecordCardSkeleton rows={2} />;
export const FeeTypeCardSkeleton = () => <RecordCardSkeleton rows={2} />;
export const ExamCardSkeleton = () => <RecordCardSkeleton rows={4} badge />;
export const AssessmentCardSkeleton = () => <RecordCardSkeleton rows={4} badge />;
export const AnnouncementCardSkeleton = () => <RecordCardSkeleton rows={4} badge />;
export const ExpenseCardSkeleton = () => <RecordCardSkeleton rows={3} badge />;
export const VehicleCardSkeleton = () => <RecordCardSkeleton rows={3} />;

/**
 * NStatCard's loading shape. Najm's NStatCardSkeleton is a taller, padded
 * three-line card, so a row of them shrank by half when the figures arrived;
 * this one follows NStatCard's own padding, icon box and line heights at
 * every breakpoint.
 */
export function StatCardSkeleton({ subtext = false }: {
  /** The card shows a hint line under its value (NStatCard's `subtext`). */
  subtext?: boolean;
}) {
  return (
    <div data-bordered="true" className="flex items-center gap-2 rounded-xl bg-card p-2 shadow-sm najm-border border-border lg:gap-3 lg:p-3 2xl:gap-4 2xl:p-4">
      <NSkeleton className="size-8 shrink-0 rounded-xl lg:size-9 2xl:size-10" />
      <div className="flex min-w-0 flex-1 flex-col gap-0 2xl:gap-1">
        <div className="flex h-4.5 items-center"><Bar className="h-2.5 w-16" /></div>
        <Bar className="h-3.5 w-20 lg:h-4 2xl:h-5" />
        {subtext && <div className="flex h-3.75 items-center"><Bar className="h-2 w-28" /></div>}
      </div>
    </div>
  );
}
