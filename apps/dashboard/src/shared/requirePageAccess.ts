import 'server-only';

import { redirect } from 'next/navigation';
import { schoolApp } from '@/najm.config';
import { requireSession } from '@/najm.server';
import { dashboardLandingPath, PAGE_ACCESS, pageViewer, type PageAccess } from './pageAccess';

/** Check before rendering a page using the app's cached, verified session. */
export async function requirePageAccess(access: PageAccess) {
  const session = await requireSession();
  const viewer = pageViewer(session);
  if (!PAGE_ACCESS[access](viewer)) {
    // The home route must lead non-staff somewhere usable rather than
    // redirecting them back to itself. Other pages follow the auth policy.
    redirect(access === 'dashboard' ? dashboardLandingPath(viewer) : schoolApp.auth.forbiddenRoute);
  }
  return session;
}
