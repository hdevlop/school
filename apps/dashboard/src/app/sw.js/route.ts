import { createNajmServiceWorker } from 'najm-next/pwa';
import { schoolI18n } from '@sms/contracts/locales';
import { SHELL_PATHS } from '@/offline/routes';
import { readShellManifest } from './shellManifest';

export const dynamic = 'force-dynamic';

// The offline page stacks these, led by the language the app last displayed
// (`rememberOfflineLanguage`); before any is recorded, French leads.
const OFFLINE_PAGE_LANGUAGES = ['fr', 'ar', 'en'] as const;
const offlinePageLanguages = OFFLINE_PAGE_LANGUAGES.map(language => {
  const { title, description, retry } = schoolI18n.translations[language].offlinePage;
  return { language, direction: schoolI18n.direction(language), title, description, retryLabel: retry };
});

export async function GET() {
  // Public assets are copied alongside Next's server in the deployment image.
  // The build inlines the version of the shell generated with it.
  const shellManifest = await readShellManifest(process.cwd(), process.env.NEXT_PUBLIC_SCHOOL_SHELL_VERSION);
  return createNajmServiceWorker({
  cacheId: 'myscolai-shell',
  cacheVersion: shellManifest.version,
  offlineUrl: shellManifest.document,
  precache: [...shellManifest.assets],
  navigationFallback: {
    paths: [...SHELL_PATHS],
    timeoutMs: 10_000,
    // Sign-in, public and unlisted pages show the offline page below on a
    // connection failure instead of the browser's error.
    otherDocuments: 'offlineDocument',
  },
  updatePolicy: 'staged',
  // Browser update checks of a broken build stop after three failed
  // downloads per version per day; the active shell keeps working.
  installBudget: { attempts: 3, windowMs: 86_400_000 },
  push: {
    defaultTitle: 'MyScolAI',
    notificationPath: '/notifications',
  },
  offlineDocument: {
    languages: offlinePageLanguages,
    themeColor: '#000000',
    backgroundColor: '#ffffff',
    foregroundColor: '#000000',
    mutedColor: '#475569',
  },
  })();
}
