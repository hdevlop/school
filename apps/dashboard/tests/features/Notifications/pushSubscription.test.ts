import { describe, expect, it } from 'bun:test';
import { detectIOS, pushPromptKind, PUSH_PROMPT_DISMISSED_KEY, PUSH_PROMPT_SNOOZE_MS, readDismissedAt, type PushPromptInput } from '@/features/Notifications/pushSubscription';

const NOW = 1_800_000_000_000;
const base: PushPromptInput = { serverEnabled: true, supported: true, permission: 'default', isIOS: false, standalone: false, dismissedAt: null, now: NOW };

describe('pushPromptKind', () => {
  it('offers push only to a device that has not answered the browser', () => {
    expect(pushPromptKind(base)).toBe('enable');
    // Granted already receives push, or turned it off deliberately in Preferences.
    expect(pushPromptKind({ ...base, permission: 'granted' })).toBeNull();
    // Denied can only be undone in the browser's settings.
    expect(pushPromptKind({ ...base, permission: 'denied' })).toBeNull();
  });

  it('stays hidden while the server does not send push', () => {
    expect(pushPromptKind({ ...base, serverEnabled: false })).toBeNull();
    expect(pushPromptKind({ ...base, serverEnabled: false, supported: false, isIOS: true })).toBeNull();
  });

  it('tells an iPhone or iPad outside the Home Screen app how to install', () => {
    const safariTab = { ...base, supported: false, permission: null, isIOS: true };
    expect(pushPromptKind(safariTab)).toBe('install');
    // Installed but still without push (iOS before 16.4): installing again would not help.
    expect(pushPromptKind({ ...safariTab, standalone: true })).toBeNull();
    // Other browsers without push have nothing to offer.
    expect(pushPromptKind({ ...safariTab, isIOS: false })).toBeNull();
  });

  it('keeps "Not now" for the snooze period, then asks again', () => {
    expect(pushPromptKind({ ...base, dismissedAt: NOW - 1000 })).toBeNull();
    expect(pushPromptKind({ ...base, supported: false, isIOS: true, dismissedAt: NOW - 1000 })).toBeNull();
    expect(pushPromptKind({ ...base, dismissedAt: NOW - PUSH_PROMPT_SNOOZE_MS })).toBe('enable');
  });
});

describe('readDismissedAt', () => {
  const storage = (value: string | null) => ({ getItem: (key: string) => (key === PUSH_PROMPT_DISMISSED_KEY ? value : null) });

  it('reads a stored timestamp and ignores anything else', () => {
    expect(readDismissedAt(storage(String(NOW)))).toBe(NOW);
    expect(readDismissedAt(storage(null))).toBeNull();
    expect(readDismissedAt(storage('soon'))).toBeNull();
    expect(readDismissedAt(undefined)).toBeNull();
  });

  it('treats blocked storage as never dismissed', () => {
    expect(readDismissedAt({ getItem: () => { throw new Error('SecurityError'); } })).toBeNull();
  });
});

describe('detectIOS', () => {
  it('recognizes iPhone and iPadOS, which reports itself as a Mac', () => {
    expect(detectIOS({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 })).toBe(true);
    expect(detectIOS({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
    expect(detectIOS({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false);
    expect(detectIOS({ userAgent: 'Mozilla/5.0 (Linux; Android 14)', platform: 'Linux armv8l', maxTouchPoints: 5 })).toBe(false);
  });
});
