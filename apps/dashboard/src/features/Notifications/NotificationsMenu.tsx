'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  NNotifyContent,
  NNotifyFooter,
  NNotifyHeader,
  NNotifyList,
  NNotifyRoot,
  NNotifyTrigger,
  type NNotifyItemData,
  type NNotifyLabels,
} from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { useNotificationCommands, useNotifications, useUnreadCount } from './useNotifications';
import type { NotificationRecord } from './types';

/** School rows are already titled, so they map straight across. */
function toNotifyItem(record: NotificationRecord): NNotifyItemData {
  return {
    id: record.id,
    title: record.title,
    body: record.body,
    href: record.href ?? undefined,
    read: record.readAt !== null,
    createdAt: record.createdAt,
  };
}

function useNotifyLabels(): NNotifyLabels {
  const { t } = useTranslation();

  return useMemo<NNotifyLabels>(
    () => ({
      open: t('notifications.open'),
      unread: (count: number) => t('notifications.unreadBadge', { count }),
      title: t('notifications.inbox'),
      loading: t('notifications.loading'),
      emptyTitle: t('notifications.empty'),
      emptyDescription: t('notifications.emptyBody'),
      errorTitle: t('notifications.loadError'),
      retry: t('common.feedback.retryLabel'),
      markRead: t('notifications.markRead'),
      markingRead: t('notifications.marking'),
      markAllRead: t('notifications.markAll'),
      markingAll: t('notifications.markingAll'),
      view: t('common.view'),
      viewAll: t('notifications.viewAll'),
      unreadState: t('notifications.stateUnread'),
      justNow: t('notifications.justNow'),
    }),
    [t],
  );
}

/**
 * Connected preview, mounted only while the menu is open so the list query
 * runs on entry instead of behind a closed bell.
 */
function NotificationsMenuBody({
  labels,
  onClose,
}: Readonly<{ labels: NNotifyLabels; onClose: () => void }>) {
  const router = useRouter();
  const list = useNotifications(5);
  const { markAll, markRead } = useNotificationCommands();

  const items = useMemo(() => (list.data ?? []).map(toNotifyItem), [list.data]);

  // A rejected read used to reject unhandled and still close the menu, which
  // read as success. It is now reported, and the menu stays open and usable.
  function report(error: unknown) {
    toast.error(error instanceof Error ? error.message : labels.errorTitle);
  }

  return (
    <>
      <NNotifyHeader
        markAllLabel={labels.markAllRead}
        markAllPending={markAll.isPending}
        markingAllLabel={labels.markingAll}
        onError={report}
        onMarkAllRead={() => markAll.mutateAsync()}
        title={labels.title}
      />
      <NNotifyList
        error={list.isError}
        itemProps={{ onMarkedRead: onClose }}
        items={items}
        labels={labels}
        loading={list.isPending}
        markReadPendingId={markRead.isPending ? markRead.variables ?? null : null}
        onError={report}
        onMarkRead={(id) => markRead.mutateAsync(id)}
        onOpenItem={(item) => {
          if (item.href) router.push(item.href);
        }}
        onRetry={() => void list.refetch()}
      />
      <NNotifyFooter asChild>
        <Link href="/notifications">{labels.viewAll}</Link>
      </NNotifyFooter>
    </>
  );
}

export function NotificationsMenu() {
  const { language } = useTranslation();
  const [open, setOpen] = useState(false);
  const labels = useNotifyLabels();
  const unreadCount = useUnreadCount().data?.count ?? 0;

  return (
    <NNotifyRoot onOpenChange={setOpen} open={open}>
      <NNotifyTrigger
        label={labels.open}
        locale={language ?? 'en'}
        unreadCount={unreadCount}
        unreadLabel={labels.unread}
      />
      <NNotifyContent>
        <NotificationsMenuBody labels={labels} onClose={() => setOpen(false)} />
      </NNotifyContent>
    </NNotifyRoot>
  );
}
