'use client';

import { useId } from 'react';
import { BaseInput, Label, NButton, Switch } from 'najm-kit';
import { Bell } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { usePushOptIn } from './usePushOptIn';

export function PushOptIn() {
  const { t } = useTranslation();
  const explanationId = useId();
  const { enabled, canToggle, toggle, explanation, failed, retry } = usePushOptIn();

  return (
    <BaseInput variant="ghost" className="gap-2 justify-between items-center" title={explanation}>
      <div className="flex min-w-0 flex-col gap-1">
        <Label htmlFor="push-notifications" className="flex items-center gap-2">
          <span className="h-4 w-4 shrink-0"><Bell className="h-4 w-4" /></span>
          <span className="truncate">{t('notifications.pushTitle')}</span>
        </Label>
        <span id={explanationId} role="status" className="sr-only">{explanation}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {failed && <NButton size="sm" variant="ghost" onClick={retry}>{t('common.feedback.retryLabel')}</NButton>}
        <Switch id="push-notifications" aria-label={t('notifications.pushTitle')} aria-describedby={explanation ? explanationId : undefined} checked={enabled} disabled={!canToggle} onCheckedChange={(next) => void toggle(next)} />
      </div>
    </BaseInput>
  );
}
