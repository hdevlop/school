import DashboardShell from '@/shared/DashboardShell';
import SchoolSetup from '@/features/Settings/components/SchoolSetup';
import { requireSession } from '@/najm.server';
import { PAGE_ACCESS, pageViewer } from '@/shared/pageAccess';

// The protected tree reads the per-request session cookie, so it cannot be
// prerendered. Without this, `requireSession()` runs at build time with no
// request and correctly fails as a configuration error.
export const dynamic = 'force-dynamic';

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  // Server-side guard for the protected tree. Shares the root layout's
  // resolution, so adding it costs no extra session lookup. The proxy still
  // redirects earlier, and backend authorization remains authoritative.
  const session = await requireSession();

  // A new installation has no settings, so no active academic year: every
  // year-scoped page and shell query would fail. Read without a fallback, so a
  // database failure raises an error instead of offering to install again.
  const { loadActiveAcademicYearLabel } = await import('@sms/server');
  if (await loadActiveAcademicYearLabel() === null) {
    return <SchoolSetup canInstall={PAGE_ACCESS.settings(pageViewer(session))} />;
  }

  return <DashboardShell>{children}</DashboardShell>;
};

export default DashboardLayout;
