export interface NotificationRecord {
  id: string;
  topic: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PushConfig { enabled: boolean; publicKey: string | null }
