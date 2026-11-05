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
      <div className="grid grid-cols-2 gap-2">
        {loading ? <>
          <NSkeleton aria-hidden="true" className="h-12 w-full rounded-lg" />
          <NSkeleton aria-hidden="true" className="h-12 w-full rounded-lg" />
        </> : <>
          <NButton
            type="button"
            variant="outline"
            onClick={onMarkAllPresent}
            disabled={!canMarkAllPresent || isSubmitting}
            className="h-12 min-w-0 w-full whitespace-normal rounded-lg px-2 py-1 text-sm leading-tight"
          >
            {t('attendance.roster.markAllPresent')}
          </NButton>
          <NButton
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || count === 0 || isSubmitting}
            loading={isSubmitting}
            leftIcon={<Send className="h-5 w-5" />}
            className="h-12 min-w-0 w-full rounded-lg px-2 text-sm font-semibold sm:text-base"
          >
            {t('attendance.roster.sendCount', { count })}
          </NButton>
        </>}
      </div>
    </footer>
  );
}
