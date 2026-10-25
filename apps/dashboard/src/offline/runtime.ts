import { createOfflineClient } from 'najm-offline/client';
import { OFFLINE_NAMESPACE, offlineRoute, offlineWriteAffectsReads } from '@sms/contracts/offline';
import { LANGUAGE_HEADER } from '@sms/contracts/locales';
import { ACADEMIC_YEAR_HEADER } from '@sms/contracts/academic-years';
import { auth } from '@/najm.auth';
import type { ShellBootstrap } from './bootstrap';

/** School's offline reads; the online page and the shell share this one client. */
export const offline = createOfflineClient<ShellBootstrap>({
  namespace: OFFLINE_NAMESPACE,
  auth,
  route: offlineRoute,
  writeAffectsReads: offlineWriteAffectsReads,
  queryRoots: ['students', 'classes', 'publicSettings', 'academic-years', 'student-enrollments'],
  languageHeader: LANGUAGE_HEADER,
  yearHeader: ACADEMIC_YEAR_HEADER,
  // Loaded on first use, so the HTTP client does not import the year store.
  year: async () => {
    const { selectedYearLabel, useYearSelectionStore } = await import('@/features/AcademicYears/store/yearSelectionStore');
    return { get: () => selectedYearLabel(useYearSelectionStore.getState()), subscribe: listener => useYearSelectionStore.subscribe(() => listener()) };
  },
});

export const {
  captureRead: captureOfflineRead, dispatch: dispatchOfflineRead, installShellTransport, isKnownOffline, isShellEntry,
  lockOffline, lockRefusedSession, invalidateReads: invalidateOfflineReads, mutationComplete: onlineMutationComplete,
  renewOffline, observe: observeOffline, connect: connectOfflineRuntime,
} = offline;
