import DashboardLanding from '@/features/Home/components/DashboardLanding';
import { requireSession } from '@/najm.server';
import { PAGE_ACCESS, dashboardLandingPath, pageViewer } from '@/shared/pageAccess';

export default async function DashboardPage() {
  const viewer = pageViewer(await requireSession());
  return <DashboardLanding canOpenDashboard={PAGE_ACCESS.dashboard(viewer)} desktopHref={dashboardLandingPath(viewer)} />;
}
