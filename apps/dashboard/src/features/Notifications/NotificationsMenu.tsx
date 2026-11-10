'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  NButton,
  NNotifyContent,
  NNotifyHeader,
  NNotifyList,
  NNotifyRoot,
  NNotifyTrigger,
  type NNotifyItemData,
  type NNotifyLabels,
  cn,
} from 'najm-kit';
import { Check, CheckCheck } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { toast } from 'sonner';
import { useNotificationCommands, useNotifications, useUnreadCount } from './useNotifications';
import type { NotificationRecord } from './types';

/** "il y a 5 min", "hier", then the date: a menu row has room for a short time only. */
function shortTime(value: string | Date | undefined, locale: string, justNow: string) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return '';
  const seconds = Math.round((then - Date.now()) / 1000);
  if (seconds > -60) return justNow;
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  if (seconds > -3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (seconds > -86400) return relative.format(Math.round(seconds / 3600), 'hour');
  if (seconds > -7 * 86400) return relative.format(Math.round(seconds / 86400), 'day');
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(then));
}

/**
 * One line per notification: a dot while unread, the title, one line of its
 * text and a short time. The row opens it (reading it first); the tick reads
 * it without leaving. The full text stays on the notifications page.
 */
function CompactNotifyRow({ item, labels, locale, pending, onOpen, onMarkRead }: Readonly<{
  item: NNotifyItemData; labels: NNotifyLabels; locale: string; pending: boolean;
  onOpen: (item: NNotifyItemData) => void; onMarkRead: (item: NNotifyItemData) => void;
}>) {
  const unread = !item.read;
  return (
    <div
      data-notify-item-id={item.id}
      className={cn('group flex items-start gap-1 rounded-md transition-colors hover:bg-muted/70', unread && 'bg-primary/5')}
    >
      <button
        type="button" disabled={pending} onClick={() => onOpen(item)}
        className="flex min-w-0 flex-1 items-start gap-2.5 px-3 py-2 text-start disabled:opacity-60"
      >
        <span aria-hidden className={cn('mt-1.5 size-2 shrink-0 rounded-full', unread ? 'bg-primary' : 'bg-transparent')} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={cn('min-w-0 flex-1 truncate text-sm', unread ? 'font-semibold' : 'font-medium text-muted-foreground')}>{item.title}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">{shortTime(item.createdAt, locale, labels.justNow ?? '')}</span>
          </span>
          {item.body ? <span className="block truncate text-xs text-muted-foreground" dir="auto">{item.body}</span> : null}
          {unread && labels.unreadState ? <span className="sr-only">{labels.unreadState}</span> : null}
        </span>
      </button>
      {unread ? (
        <button
          type="button" disabled={pending} onClick={() => onMarkRead(item)}
          aria-label={labels.markRead} title={labels.markRead}
          className="mt-1.5 me-1.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-60"
        >
          <Check className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

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
  const { locale } = useSchoolFormat();
  const list = useNotifications(5);
  const { markAll, markRead } = useNotificationCommands();

  const items = useMemo(() => (list.data ?? []).map(toNotifyItem), [list.data]);
  // The menu shows the latest five; the bell's count covers older unread ones too.
  const hasUnread = (useUnreadCount().data?.count ?? 0) > 0 || items.some((item) => !item.read);

  // A rejected read used to reject unhandled and still close the menu, which
  // read as success. It is now reported, and the menu stays open and usable.
  function report(error: unknown) {
    toast.error(error instanceof Error ? error.message : labels.errorTitle);
  }

  return (
    <>
      <NNotifyHeader title={labels.title} />
      <NNotifyList
        className="-mx-1 px-1 [&>div]:gap-1"
        error={list.isError}
        locale={locale}
        items={items}
        labels={labels}
        loading={list.isPending}
        markReadPendingId={markRead.isPending ? markRead.variables ?? null : null}
        onRetry={() => void list.refetch()}
        renderItem={(item, { pending }) => (
          <CompactNotifyRow
            item={item}
            labels={labels}
            locale={locale}
            pending={pending}
            // Read first: a refused read neither navigates nor closes the menu.
            onOpen={async (row) => {
              try {
                if (!row.read) await markRead.mutateAsync(row.id);
              } catch (error) {
                report(error);
                return;
              }
              onClose();
              if (row.href) router.push(row.href);
            }}
            onMarkRead={(row) => void markRead.mutateAsync(row.id).catch(report)}
          />
        )}
      />
      {/* Both list actions at the foot: reading everything on the left (only
          while something is unread), the full page on the right. */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-2 pt-2" data-slot="notify-footer">
        {hasUnread ? (
          <NButton
            autoLoading={false} size="sm" type="button" variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            disabled={markAll.isPending}
            onClick={() => void markAll.mutateAsync().catch(report)}
          >
            <CheckCheck className="size-4" aria-hidden />
            {markAll.isPending ? labels.markingAll ?? labels.markAllRead : labels.markAllRead}
          </NButton>
        ) : <span />}
        <NButton asChild autoLoading={false} size="sm" variant="link">
          <Link href="/notifications" onClick={onClose}>{labels.viewAll}</Link>
        </NButton>
      </div>
    </>
  );
}

export function NotificationsMenu() {
  const { locale } = useSchoolFormat();
  const [open, setOpen] = useState(false);
  const labels = useNotifyLabels();
  const unreadCount = useUnreadCount().data?.count ?? 0;

  return (
    <NNotifyRoot onOpenChange={setOpen} open={open}>
      <NNotifyTrigger
        label={labels.open}
        locale={locale}
        unreadCount={unreadCount}
        unreadLabel={labels.unread}
      />
      <NNotifyContent>
        <NotificationsMenuBody labels={labels} onClose={() => setOpen(false)} />
      </NNotifyContent>
    </NNotifyRoot>
  );
}
