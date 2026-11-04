import { createNajmServiceWorker } from 'najm-next/pwa';
import { schoolI18n } from '@sms/contracts/locales';

export const dynamic = 'force-dynamic';

const offlinePage = schoolI18n.translations.en.offlinePage;

// The worker exists to deliver push notifications. It stores no pages or school
// data. A device that still has an older worker swaps to this one and drops that
// worker's caches, which is why the cache id stays the same.
export const GET = createNajmServiceWorker({
  cacheId: 'myscolai-shell',
  push: { defaultTitle: 'MyScolAI', notificationPath: '/notifications' },
  // Shown when a page cannot be reached at all, in place of the browser's own error.
  offlineDocument: {
    language: 'en',
    direction: 'ltr',
    title: offlinePage.title,
    description: offlinePage.description,
    retryLabel: offlinePage.retry,
    themeColor: '#d64e57',
    backgroundColor: '#fff6f5',
    foregroundColor: '#b83d46',
    mutedColor: '#64748b',
  },
});
