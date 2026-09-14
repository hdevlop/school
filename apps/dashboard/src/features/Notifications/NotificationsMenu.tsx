'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { NButton, NIndicator, Popover, PopoverContent, PopoverTrigger } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useState } from 'react';
import { useNotificationCommands, useNotifications, useUnreadCount } from './useNotifications';

function NotificationsMenuBody({ close }: Readonly<{ close: () => void }>) {
  const { t } = useTranslation();
  const router = useRouter();
  const list = useNotifications(5);
  const { markRead, markAll } = useNotificationCommands();

  async function openNotification(id: string, href: string | null) {
    await markRead.mutateAsync(id);
    close();
    if (href) router.push(href);
  }

  return (
    <>
      <div className="flex items-center justify-between px-2 py-1">
        <p className="font-semibold">{t('notifications.inbox')}</p>
        <NButton size="sm" variant="ghost" disabled={markAll.isPending} onClick={() => void markAll.mutateAsync()}>{t('notifications.markAll')}</NButton>
      </div>
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {list.isPending ? <p className="p-3 text-sm text-muted-foreground">{t('notifications.loading')}</p> : null}
        {list.data?.length === 0 ? <p className="p-3 text-sm text-muted-foreground">{t('notifications.empty')}</p> : null}
        {list.data?.map((item) => (
          <button key={item.id} type="button" className={`w-full rounded-md p-3 text-start hover:bg-muted ${item.readAt ? '' : 'bg-muted/60'}`} onClick={() => void openNotification(item.id, item.href)}>
            <span className="block text-sm font-medium">{item.title}</span>
            <span className="block text-sm text-muted-foreground">{item.body}</span>
          </button>
        ))}
      </div>
      <div className="border-t px-2 pt-2 text-end"><Link href="/notifications" onClick={close} className="text-sm text-primary">{t('notifications.viewAll')}</Link></div>
    </>
  );
}

export function NotificationsMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const count = useUnreadCount().data?.count ?? 0;
  const bell = (
    <NButton type="button" variant="ghost" size="icon" aria-label={t('notifications.open')}><Bell size={18} /></NButton>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{count > 0 ? <NIndicator overlay="badge" color="destructive" content={count > 99 ? '99+' : String(count)}>{bell}</NIndicator> : bell}</PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-2">
        {open ? <NotificationsMenuBody close={() => setOpen(false)} /> : null}
      </PopoverContent>
    </Popover>
  );
}
