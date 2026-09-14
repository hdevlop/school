'use client';

import { Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NButton, NEmptyState, NPageHeader, NPageHeaderActions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useNotificationCommands, useNotifications } from './useNotifications';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const list = useNotifications(100);
  const { markRead, markAll } = useNotificationCommands();

  async function openNotification(id: string, href: string | null) {
    await markRead.mutateAsync(id);
    if (href) router.push(href);
  }

  return (
    <div className="flex min-h-0 w-full flex-col gap-3 p-2">
      <NPageHeader icon={Bell} title={t('notifications.inbox')}>
        <NPageHeaderActions>
          <NButton size="sm" variant="outline" onClick={() => void markAll.mutateAsync()}><CheckCheck size={16} />{t('notifications.markAll')}</NButton>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>
      {list.data?.length === 0 ? <NEmptyState icon={Bell} title={t('notifications.empty')} /> : null}
      <div className="space-y-2">
        {list.data?.map((item) => (
          <button key={item.id} type="button" className={`w-full rounded-md border p-4 text-start ${item.readAt ? 'bg-background' : 'bg-muted/60'}`} onClick={() => void openNotification(item.id, item.href)}>
            <span className="block font-medium">{item.title}</span>
            <span className="block text-sm text-muted-foreground">{item.body}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
