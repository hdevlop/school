'use client';

import type { ReactNode } from 'react';
import { NButton, NSkeleton, SimpleTooltip, inputBorderClasses } from 'najm-kit';

import { Send, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { MobileFeatureActions } from '@/shared/FeatureActions';

interface Stats { total: number; present: number; absent: number; late: number; unmarked: number }

interface Props {
  hasChanges: boolean;
  isSubmitting?: boolean;
  stats: Stats;
  onSubmit: () => void;
  /** Sits between the counts and submit. */
  print?: ReactNode;
  onMarkAllPresent?: () => void;
  canMarkAllPresent?: boolean;
  canSubmit?: boolean;
  submitTitle?: string;
  loading?: boolean;
  showMobileSubmit?: boolean;
}

function StatItem({
  icon: Icon,
  label,
  value,
  tone,
  className,
}: {
  icon: any;
  label: string;
  value: number;
  tone?: 'emerald' | 'red' | 'amber';
  className?: string;
}) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-600'
    : tone === 'red' ? 'text-red-600'
    : tone === 'amber' ? 'text-amber-600'
    : 'text-foreground';

  return (
    <SimpleTooltip content={`${label}: ${value}`}>
      <button type="button" aria-label={`${label}: ${value}`} className={cn('flex cursor-help items-center justify-center gap-0.5 px-1 text-xs outline-offset-4 sm:gap-1.5 sm:px-2 sm:text-sm', className)}>
        <Icon aria-hidden="true" className={cn('h-3.5 w-3.5 shrink-0', toneClass)} />
        <span className={cn('font-mono font-semibold whitespace-nowrap', toneClass)}>{value}</span>
      </button>
    </SimpleTooltip>
  );
}

export default function RosterHeader({
  hasChanges, isSubmitting, stats,
  onSubmit, onMarkAllPresent, canMarkAllPresent, print,
  canSubmit = true, submitTitle,
  loading = false,
  showMobileSubmit = true,
}: Props) {
  const { t } = useTranslation();
  const title = submitTitle ?? t('attendance.roster.submit');

  if (loading) {
    return (
      <div aria-hidden="true" className="contents lg:order-3 lg:flex lg:items-center lg:gap-2">
        {onMarkAllPresent && <NSkeleton data-roster-loading-action="mark-all" className={cn('col-span-2 h-10 lg:w-36', !showMobileSubmit ? 'hidden lg:inline-flex' : 'hidden md:inline-flex')} />}
        <div className="flex min-w-0 items-center justify-end gap-2">
          <NSkeleton data-roster-loading-counts className="h-10 w-20 sm:w-36" />
          {print && <NSkeleton data-roster-loading-action="print" className="hidden size-10 shrink-0 md:inline-flex" />}
          <NSkeleton data-roster-loading-action="submit" className={cn('size-10 shrink-0', !showMobileSubmit && 'hidden lg:inline-flex')} />
        </div>
      </div>
    );
  }

  // Below lg these are cells of RosterFilters' grid: the summary sits in the
  // second column beside the day, and "mark all present" takes a row of its own.
  return (
    <div className="contents lg:order-3 lg:flex lg:items-center lg:gap-2">
      {onMarkAllPresent && <MobileFeatureActions enabled={showMobileSubmit}><NButton type="button" variant="outline" disabled={isSubmitting || !(canMarkAllPresent ?? canSubmit)} onClick={onMarkAllPresent} className={cn('col-span-2 h-10', !showMobileSubmit && 'hidden lg:inline-flex')}>
        {t('attendance.roster.markAllPresent')}
      </NButton></MobileFeatureActions>}
      <div className="flex min-w-0 items-center justify-end gap-2">
        <div className={cn('flex h-10 min-w-0 items-center divide-x divide-border rounded-md bg-card px-1', inputBorderClasses())}>
          {/* On a phone the day needs the room; present is everyone not marked otherwise. */}
          <StatItem icon={CheckCircle2} label={t('attendance.roster.present')} value={stats.present} tone="emerald" className="hidden sm:flex" />
          <StatItem icon={XCircle} label={t('attendance.roster.absent')} value={stats.absent} tone="red" />
          <StatItem icon={Clock3} label={t('attendance.roster.late')} value={stats.late} tone="amber" />
        </div>
        {print && <MobileFeatureActions>{print}</MobileFeatureActions>}
        <NButton
          onClick={onSubmit}
          loading={isSubmitting}
          leftIcon={<Send className="h-4 w-4" />}
          disabled={isSubmitting || !hasChanges || !canSubmit}
          aria-label={title}
          title={title}
          className={cn('h-10 w-10 shrink-0 cursor-pointer p-0 disabled:cursor-not-allowed', !showMobileSubmit && 'hidden lg:inline-flex')}
        />
      </div>
    </div>
  );
}
