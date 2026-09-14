function flag(name: string, defaultOn = false) {
  const raw = process.env[name];
  if (!raw) return defaultOn;
  return raw === '1' || raw.toLowerCase() === 'true';
}

export const notificationFlags = {
  get dispatchEnabled() { return flag('NOTIFICATIONS_DISPATCH_ENABLED'); },
  get pushEnabled() { return flag('NOTIFICATIONS_PUSH_ENABLED'); },
};

export function normalizeVapidSubject(contact: string | undefined) {
  const value = contact?.trim();
  if (!value || value.length > 320) return undefined;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  if (/^(mailto:|https:)/i.test(value)) {
    try {
      const url = new URL(value);
      return url.protocol === 'mailto:' || url.protocol === 'https:' ? value : undefined;
    } catch { return undefined; }
  }
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
  get publicKey() { return process.env.VAPID_PUBLIC_KEY?.trim() || undefined; },
  get privateKey() { return process.env.VAPID_PRIVATE_KEY?.trim() || undefined; },
  get contact() { return process.env.VAPID_CONTACT_EMAIL?.trim() || undefined; },
  get subject() { return normalizeVapidSubject(this.contact); },
  get configured() {
    return Boolean(isValidVapidPublicKey(this.publicKey) && this.privateKey && this.subject);
  },
};

export const NOTIFICATION_MAX_ATTEMPTS = 6;
export const NOTIFICATION_BATCH_SIZE = 50;
