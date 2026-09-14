import { api } from '@/services/http';
import type { NotificationRecord, PushConfig } from './types';

export const listNotifications = async (limit = 20, unread?: boolean) => (await api.get('/notifications', { params: { limit, unread } })).data as NotificationRecord[];
export const unreadCount = async () => (await api.get('/notifications/unread-count')).data as { count: number };
export const pushConfig = async () => (await api.get('/notifications/push-config')).data as PushConfig;
export const markRead = async (id: string) => (await api.patch(`/notifications/${id}/read`)).data as NotificationRecord;
export const markAllRead = async () => (await api.patch('/notifications/read-all')).data as { read: number };
export const subscribePush = async (body: { endpoint: string; p256dh: string; auth: string }) => (await api.post('/notifications/push-subscriptions', body)).data;
export const unsubscribePush = async (endpoint: string) => (await api.delete('/notifications/push-subscriptions', { data: { endpoint } })).data;
