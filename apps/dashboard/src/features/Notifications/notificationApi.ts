import { api } from '@/services/http';
import type { NotificationRecord, PushConfig } from './types';

// School's Najm routes return { data, status, message }; the shared HTTP helper
// wraps that response once more for its legacy { data } service contract.
const unwrap = <T,>(response: { data: { data: T } }): T => response.data.data;

export const listNotifications = async (limit = 20, unread?: boolean) =>
  unwrap<NotificationRecord[]>(await api.get('/notifications', { params: { limit, unread } }));
export const unreadCount = async () => unwrap<{ count: number }>(await api.get('/notifications/unread-count'));
export const pushConfig = async () => unwrap<PushConfig>(await api.get('/notifications/push-config'));
export const markRead = async (id: string) => unwrap<NotificationRecord>(await api.patch(`/notifications/${id}/read`));
export const markAllRead = async () => unwrap<{ read: number }>(await api.patch('/notifications/read-all'));
export const subscribePush = async (body: { endpoint: string; p256dh: string; auth: string }) =>
  unwrap<{ id: string; endpointFingerprint: string }>(await api.post('/notifications/push-subscriptions', body));
export const unsubscribePush = async (endpoint: string) =>
  unwrap<{ removed: boolean }>(await api.delete('/notifications/push-subscriptions', { data: { endpoint } }));
