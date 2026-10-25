import { createOfflineShellWorker, readShellManifest } from 'najm-offline/worker';
import { schoolI18n } from '@sms/contracts/locales';
import { OFFLINE_SWITCH, offlineEnabled } from '@sms/contracts/offline';
import { SHELL_PATHS } from '@/offline/routes';

export const dynamic = 'force-dynamic';

// The offline page stacks these, led by the language the app last displayed
// (`rememberOfflineLanguage`); before any is recorded, French leads.
const OFFLINE_PAGE_LANGUAGES = ['fr', 'ar', 'en'] as const;
const offlinePageLanguages = OFFLINE_PAGE_LANGUAGES.map(language => {
  const { title, description, retry } = schoolI18n.translations[language].offlinePage;
  return { language, direction: schoolI18n.direction(language), title, description, retryLabel: retry };
});

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
    languages: offlinePageLanguages,
    themeColor: '#000000',
    backgroundColor: '#ffffff',
    foregroundColor: '#000000',
    mutedColor: '#475569',
  },
});
