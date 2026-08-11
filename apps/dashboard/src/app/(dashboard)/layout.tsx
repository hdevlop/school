import DashboardShell from '@/shared/DashboardShell';
import { serverAuth } from '@/lib/session';

// The protected tree reads the per-request session cookie, so it cannot be
// prerendered. Without this, `requireSession()` runs at build time with no
// request and correctly fails as a configuration error.
export const dynamic = 'force-dynamic';

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  // Server-side guard for the protected tree. Shares the root layout's
  // resolution, so adding it costs no extra session lookup. The proxy still
  // redirects earlier, and backend authorization remains authoritative.
  await serverAuth.requireSession();

  return <DashboardShell>{children}</DashboardShell>;
};

export default DashboardLayout;
