'use client';

import { Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
  NButton,
  NEmptyState,
  NErrorState,
  NForbiddenState,
  NNotifyItem,
  NPageHeader,
  NPageHeaderActions,
  NSkeleton,
  type NNotifyItemData,
} from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { isAuthorizationError } from '@/services/apiError';
import { useNotificationCommands, useNotifications } from './useNotifications';
import type { NotificationRecord } from './types';

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

export default function NotificationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const list = useNotifications(100);
  const { markRead, markAll } = useNotificationCommands();

  const items = useMemo(() => (list.data ?? []).map(toNotifyItem), [list.data]);

  const labels = {
    view: t('common.view'),
    markRead: t('notifications.markRead'),
    markingRead: t('notifications.marking'),
    unreadState: t('notifications.stateUnread'),
    justNow: t('notifications.justNow'),
  };

  function report(error: unknown) {
    toast.error(error instanceof Error ? error.message : t('notifications.loadError'));
  }

  return (
    <div className="flex min-h-0 w-full flex-col gap-2">
      <NPageHeader icon={Bell} title={t('notifications.inbox')}>
        <NPageHeaderActions>
          {/* Icon only at phone width, where the label left no room for the title. */}
          <NButton
            size="sm"
            variant="outline"
            onClick={() => markAll.mutateAsync().catch(report)}
            aria-label={t('notifications.markAll')}
            title={t('notifications.markAll')}
            disabled={list.isPending || list.isError || items.length === 0 || markAll.isPending}
            loading={markAll.isPending}
          >
            <CheckCheck size={16} aria-hidden />
            <span className="max-sm:hidden">{t('notifications.markAll')}</span>
          </NButton>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>
      {list.isPending ? (
        <div role="status" aria-label={t('notifications.loading')}>
          <NSkeleton className="h-24 rounded-lg" />
        </div>
      ) : list.isError ? (
        isAuthorizationError(list.error)
          ? <NForbiddenState surface="panel" />
          : <NErrorState surface="panel" title={t('notifications.loadError')} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <NEmptyState icon={Bell} title={t('notifications.empty')} />
      ) : null}
      <div className="space-y-2">
        {list.isSuccess && items.map((item) => (
          <NNotifyItem
            item={item}
            key={item.id}
            labels={labels}
            onError={report}
            onMarkRead={(id) => markRead.mutateAsync(id)}
            onOpenItem={(opened) => {
              if (opened.href) router.push(opened.href);
            }}
            pending={markRead.isPending && markRead.variables === item.id}
          />
        ))}
      </div>
    </div>
  );
}
