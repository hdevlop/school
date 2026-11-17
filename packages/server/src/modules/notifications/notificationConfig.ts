import { env } from '../../env';

export const notificationFlags = {
  get dispatchEnabled() { return env.notifications.dispatchEnabled; },
  get pushEnabled() { return env.notifications.pushEnabled; },
};

export function normalizeVapidSubject(contact: string | undefined) {
  const value = contact?.trim();
  if (!value || value.length > 320) return undefined;
  // A value already naming its scheme is checked first: "mailto:ops@school.ma"
  // also looks like a bare address, and would otherwise become "mailto:mailto:…".
  if (/^(mailto:|https:)/i.test(value)) {
    try {
      const url = new URL(value);
      return url.protocol === 'mailto:' || url.protocol === 'https:' ? value : undefined;
    } catch { return undefined; }
  }
  if (/^[^\s@:]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  return undefined;
}

export function isValidVapidPublicKey(key: string | undefined) {
  if (!key || !/^[A-Za-z0-9_-]+$/.test(key)) return false;
  try {
    const bytes = Buffer.from(key, 'base64url');
    return bytes.length === 65 && bytes[0] === 4 && bytes.toString('base64url') === key;
  } catch { return false; }
}

export const vapidConfig = {
  get publicKey() { return env.notifications.vapidPublicKey; },
  get privateKey() { return env.notifications.vapidPrivateKey; },
  get contact() { return env.notifications.vapidContact; },
  get subject() { return normalizeVapidSubject(this.contact); },
  get configured() {
    return Boolean(isValidVapidPublicKey(this.publicKey) && this.privateKey && this.subject);
  },
};

export const NOTIFICATION_MAX_ATTEMPTS = 6;
export const NOTIFICATION_BATCH_SIZE = 50;
