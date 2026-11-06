'use client';

import { NButton, NSkeleton } from 'najm-kit';
import { Send } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';

export default function RosterMobileSubmit({ count, onSubmit, onMarkAllPresent, canSubmit, canMarkAllPresent, isSubmitting, loading }: {
  count: number;
  onSubmit: () => void;
  onMarkAllPresent: () => void;
  canSubmit: boolean;
  canMarkAllPresent: boolean;
  isSubmitting: boolean;
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <footer data-roster-mobile-submit className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-background pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="grid grid-cols-2 items-center gap-2">
        {loading ? <>
          <NSkeleton aria-hidden="true" className="h-9 w-full rounded-lg" />
          <NSkeleton aria-hidden="true" className="h-9 w-full rounded-lg" />
        </> : <>
          <NButton
            type="button"
            variant="outline"
            onClick={onMarkAllPresent}
            disabled={!canMarkAllPresent || isSubmitting}
            aria-label={t('attendance.roster.markAllPresent')}
            className="h-9 min-w-0 w-full whitespace-nowrap rounded-lg px-2 py-1 text-sm leading-tight"
          >
            {t('attendance.roster.markAllPresentShort')}
          </NButton>
          <NButton
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || count === 0 || isSubmitting}
            loading={isSubmitting}
            leftIcon={<Send className="h-4 w-4" />}
            className="h-9 min-w-0 w-full rounded-lg px-2 text-sm font-semibold"
          >
            {t('attendance.roster.sendCount', { count })}
          </NButton>
        </>}
      </div>
    </footer>
  );
}
