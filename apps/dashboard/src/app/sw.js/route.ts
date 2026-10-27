import { createOfflineShellWorker, readShellManifest } from 'najm-offline/worker';
import { schoolI18n } from '@sms/contracts/locales';
import { OFFLINE_SWITCH, offlineEnabled } from '@sms/contracts/offline';
import { SHELL_PATHS } from '@/offline/routes';

export const dynamic = 'force-dynamic';

const offlinePage = schoolI18n.translations.en.offlinePage;

// Turned off (SCHOOL_OFFLINE=off), a worker without the shell takes over and
// drops the shell's caches; downloaded data stays locked by the server's refusals.
export const GET = createOfflineShellWorker({
  cacheId: 'myscolai-shell',
  paths: SHELL_PATHS,
  enabled: () => offlineEnabled(process.env[OFFLINE_SWITCH]),
  // Public assets are copied alongside Next's server in the deployment image.
  // The build inlines the version of the shell generated with it.
  manifest: () => readShellManifest(process.cwd(), process.env.NEXT_PUBLIC_SCHOOL_SHELL_VERSION),
  push: { defaultTitle: 'MyScolAI', notificationPath: '/notifications' },
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
