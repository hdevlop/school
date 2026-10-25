import { createNajmServiceWorker } from 'najm-next/pwa';
import { schoolI18n } from '@sms/contracts/locales';
import { OFFLINE_SWITCH, offlineEnabled } from '@sms/contracts/offline';
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
const push = {
  defaultTitle: 'MyScolAI',
  notificationPath: '/notifications',
};
const offlineDocument = {
  languages: offlinePageLanguages,
  themeColor: '#000000',
  backgroundColor: '#ffffff',
  foregroundColor: '#000000',
  mutedColor: '#475569',
};

// Turned off, a worker without the shell takes over at once (immediate update)
// and drops the shell's caches; downloaded data stays on the device, locked by
// the server's refusals, until offline use is turned on again.
const withoutShell = createNajmServiceWorker({ cacheId: 'myscolai-shell', push, offlineDocument });

export async function GET() {
  if (!offlineEnabled(process.env[OFFLINE_SWITCH])) return withoutShell();
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
  push,
  offlineDocument,
  })();
}
