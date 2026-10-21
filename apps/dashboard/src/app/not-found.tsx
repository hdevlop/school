'use client';

import Link from 'next/link';
import { Home, MapPinOff } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { NButton, NEmptyState } from 'najm-kit';
import { SCHOOL_HOME_PATH } from '@/najm.config';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <main className="flex h-full min-h-dvh items-center justify-center overflow-auto bg-background p-6 text-foreground">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-center text-sm font-semibold text-muted-foreground">404</p>
        <NEmptyState icon={MapPinOff} title={t('common.feedback.notFoundTitle')}
          description={t('common.feedback.notFoundDescription')}
          action={(
            <NButton asChild>
              <Link href={SCHOOL_HOME_PATH}><Home className="h-4 w-4" />{t('common.backToDashboard')}</Link>
            </NButton>
          )}
        />
      </div>
    </main>
  );
}
