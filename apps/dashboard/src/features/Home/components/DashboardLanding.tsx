'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NLoadingState, useMediaQuery } from 'najm-kit';
import DashboardSkeleton from '@/features/Dashboard/components/DashboardSkeleton';
import MobileHome from './MobileHome';

// Charts and their queries mount only when a desktop viewer can use them.
const Dashboard = dynamic(() => import('@/features/Dashboard'), { ssr: false, loading: () => <DashboardSkeleton /> });

function DesktopRedirect({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => { router.replace(href); }, [href, router]);
  return <NLoadingState />;
}

export default function DashboardLanding({ canOpenDashboard, desktopHref }: { canOpenDashboard: boolean; desktopHref: string }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  if (isDesktop) return canOpenDashboard ? <Dashboard /> : <DesktopRedirect href={desktopHref} />;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col lg:hidden"><MobileHome /></div>
      <div className="hidden min-h-0 flex-1 lg:grid">{canOpenDashboard ? <DashboardSkeleton /> : <NLoadingState />}</div>
    </>
  );
}
