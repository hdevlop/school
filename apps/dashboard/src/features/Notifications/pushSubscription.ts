export type PushKeys = { endpoint: string; p256dh: string; auth: string };

const toBytes = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '='));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};
const toBase64Url = (buffer: ArrayBuffer | null) => {
  if (!buffer) return '';
  let value = '';
  for (const byte of new Uint8Array(buffer)) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export function isPushSupported() {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Asks for permission, subscribes this browser and registers it with the
 * server. Resolves 'denied' when the person refuses the browser's prompt.
 *
 * The permission request comes first, before any await: Safari shows the
 * prompt only while the tap that asked for it is still the current gesture.
 */
export async function enablePushOnThisDevice(
  publicKey: string,
  register: (keys: PushKeys) => Promise<unknown>,
  failMessage: string,
): Promise<'granted' | 'denied'> {
  if (await Notification.requestPermission() !== 'granted') return 'denied';
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(publicKey) });
  try {
    await register({ endpoint: subscription.endpoint, p256dh: toBase64Url(subscription.getKey('p256dh')), auth: toBase64Url(subscription.getKey('auth')) });
  } catch (reason) {
    // Do not leave a new browser subscription behind when its server
    // registration fails. Existing subscriptions belong to earlier opt-ins.
    if (!existing) {
      try {
        if (!await subscription.unsubscribe() && await registration.pushManager.getSubscription()) throw new Error(failMessage);
      } catch {
        throw new Error(failMessage);
      }
    }
    throw reason;
  }
  return 'granted';
}

export const PUSH_PROMPT_DISMISSED_KEY = 'myscolai.pushPrompt.dismissedAt';
/** How long "Not now" keeps the prompt away on this device. */
export const PUSH_PROMPT_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

export type PushPromptInput = {
  /** The server sends push: dispatch on, VAPID configured. */
  serverEnabled: boolean;
  supported: boolean;
  permission: NotificationPermission | null;
  /** iPhone or iPad, where push needs the Home Screen app. */
  isIOS: boolean;
  standalone: boolean;
  dismissedAt: number | null;
  now: number;
};

/**
 * Which prompt, if any, this device should see. Only a person who has not yet
 * answered the browser is asked: 'granted' already gets push or turned it off
 * deliberately in Preferences, and 'denied' can only be undone in the browser.
 */
export function pushPromptKind(input: PushPromptInput): 'enable' | 'install' | null {
  if (!input.serverEnabled) return null;
  if (input.dismissedAt !== null && input.now - input.dismissedAt < PUSH_PROMPT_SNOOZE_MS) return null;
  if (input.supported) return input.permission === 'default' ? 'enable' : null;
  // iOS offers web push only to an app opened from the Home Screen.
  return input.isIOS && !input.standalone ? 'install' : null;
}

export function readDismissedAt(storage: Pick<Storage, 'getItem'> | undefined): number | null {
  try {
    const value = Number(storage?.getItem(PUSH_PROMPT_DISMISSED_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function detectIOS(nav: { userAgent: string; platform: string; maxTouchPoints: number }) {
  // iPadOS reports itself as a Mac; touch support tells the two apart.
  return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
}
