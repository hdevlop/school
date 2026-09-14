import { createNajmServiceWorker } from 'najm-next/pwa';

export const GET = createNajmServiceWorker({
  cacheId: 'myscolai-shell',
  push: {
    defaultTitle: 'MyScolAI',
    notificationPath: '/notifications',
  },
  offlineDocument: {
    title: 'MyScolAI is offline',
    description: 'Reconnect to the internet, then try loading this page again.',
    retryLabel: 'Try again',
    themeColor: '#000000',
    backgroundColor: '#ffffff',
    foregroundColor: '#000000',
    mutedColor: '#475569',
  },
});
