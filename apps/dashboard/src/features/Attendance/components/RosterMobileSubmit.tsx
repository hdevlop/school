'use client';

import { NButton, NSkeleton } from 'najm-kit';
import { Send } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';

export default function RosterMobileSubmit({ count, onSubmit, canSubmit, isSubmitting, loading }: {
  count: number;
  onSubmit: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <footer data-roster-mobile-submit className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-background pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="grid items-center">
        {loading ? <NSkeleton aria-hidden="true" className="h-9 w-full rounded-lg" /> : <>
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
