'use client';

import type { ReactNode } from 'react';
import { useAuth } from 'najm-auth/client/react';
import { useTranslation } from 'najm-i18n/react';
import { NCard, NSkeleton, NSkeletonCalendar, NSkeletonChart, NSkeletonDonut, NSkeletonEventList, NStatCardSkeleton } from 'najm-kit';
import { canReadFinanceDashboard, usesTeacherDashboard } from '../config/dashboardAudience';

function SkeletonCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <NCard
      title={<NSkeleton className="h-4 w-28" />}
      className={className}
      classNames={{ content: 'flex-1 min-h-0' }}
    >
      {children}
    </NCard>
  );
}

// Keep this fallback free of chart imports and data queries: it is visible
// before hydration and while the desktop-only dashboard bundle downloads.
export default function DashboardSkeleton() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isTeacher = usesTeacherDashboard(user?.role);
  const showFinance = canReadFinanceDashboard(user?.role);

  return (
    <div aria-busy="true" aria-label={t('common.loading')} className="flex h-full min-h-0 w-full flex-col gap-2 overflow-y-auto">
      <div className="flex shrink-0 items-center justify-between gap-3 py-2">
        <NSkeleton className="h-9 w-52" />
        <NSkeleton className="h-10 w-64 max-sm:hidden" />
      </div>

      {(isTeacher || showFinance) && (
        <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => <NStatCardSkeleton key={index} />)}
        </div>
      )}

      {isTeacher ? (
        <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-3 lg:grid-rows-2 [&>*]:min-h-64">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonCard key={index}><NSkeletonEventList /></SkeletonCard>
          ))}
        </div>
      ) : (
        <>
          <div className="grid min-h-64 flex-1 grid-cols-12 gap-3 [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:overflow-hidden">
            <SkeletonCard className={showFinance ? 'col-span-2' : 'col-span-4'}><NSkeletonDonut /></SkeletonCard>
            <SkeletonCard className={showFinance ? 'col-span-4' : 'col-span-8'}><NSkeletonChart /></SkeletonCard>
            {showFinance && <SkeletonCard className="col-span-6"><NSkeletonChart /></SkeletonCard>}
          </div>
          <div className="grid min-h-64 flex-1 grid-cols-12 gap-3 [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:overflow-hidden">
            {showFinance && <SkeletonCard className="col-span-2"><NSkeletonChart /></SkeletonCard>}
            <SkeletonCard className={showFinance ? 'col-span-4' : 'col-span-8'}><NSkeletonChart /></SkeletonCard>
            {showFinance && <SkeletonCard className="col-span-4"><NSkeletonEventList /></SkeletonCard>}
            <SkeletonCard className={showFinance ? 'col-span-2' : 'col-span-4'}><NSkeletonCalendar /></SkeletonCard>
          </div>
        </>
      )}
    </div>
  );
}
