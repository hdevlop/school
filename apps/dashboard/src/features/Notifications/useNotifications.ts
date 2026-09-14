'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listNotifications, markAllRead, markRead, pushConfig, subscribePush, unreadCount, unsubscribePush } from './notificationApi';

export const notificationKeys = {
  all: ['personal-notifications'] as const,
  list: (limit: number, unread?: boolean) => ['personal-notifications', 'list', limit, unread] as const,
  count: ['personal-notifications', 'count'] as const,
  push: ['personal-notifications', 'push'] as const,
};

export function useNotifications(limit = 20, unread?: boolean) {
  return useQuery({ queryKey: notificationKeys.list(limit, unread), queryFn: () => listNotifications(limit, unread) });
}
export function useUnreadCount() {
  return useQuery({ queryKey: notificationKeys.count, queryFn: unreadCount, refetchInterval: 30_000 });
}
export function usePushConfig() {
  return useQuery({ queryKey: notificationKeys.push, queryFn: pushConfig, staleTime: 300_000 });
}
export function useNotificationCommands() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: notificationKeys.all });
  return {
    markRead: useMutation({ mutationFn: markRead, onSuccess: invalidate }),
    markAll: useMutation({ mutationFn: markAllRead, onSuccess: invalidate }),
    subscribe: useMutation({ mutationFn: subscribePush, onSuccess: invalidate }),
    unsubscribe: useMutation({ mutationFn: unsubscribePush, onSuccess: invalidate }),
  };
}
