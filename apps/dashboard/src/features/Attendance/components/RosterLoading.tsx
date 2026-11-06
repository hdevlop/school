import { NSkeleton, cn, inputBorderClasses, surfaceBorderClasses } from 'najm-kit';
import { CARD_SKELETON_SURFACE } from '@/shared/PersonCardSkeleton';

// The registers draw their real page header at once; only its count waits.

/** Match RosterCard's 40px avatar, two text lines and compact mark buttons. */
function RosterCardPlaceholder({ showDetails = false }: { showDetails?: boolean }) {
  return (
    <div aria-hidden="true" data-bordered="true" className={CARD_SKELETON_SURFACE}>
      <div className="flex items-center gap-3 p-2 md:px-4 md:py-3">
        <NSkeleton className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <div className="flex h-5 items-center"><NSkeleton className="h-3.5 w-28 max-w-full" /></div>
          <div className="flex h-4 items-center"><NSkeleton className="h-3 w-20 max-w-full" /></div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div data-bordered="true" className={cn('inline-flex overflow-hidden rounded-lg', inputBorderClasses())}>
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className={cn('flex size-8 items-center justify-center first:border-s-0', surfaceBorderClasses(true, 'start'), 'border-input')}>
                <NSkeleton className="size-3.5 rounded-sm" />
              </div>
            ))}
          </div>
          {showDetails && <NSkeleton data-bordered="true" className={cn('size-8 rounded-lg', inputBorderClasses())} />}
        </div>
      </div>
    </div>
  );
}

export function RosterCardSkeleton() {
  return <RosterCardPlaceholder />;
}

export function StaffRosterCardSkeleton() {
  return <RosterCardPlaceholder showDetails />;
}

// NTable's loading header only renders string labels. Replace every label
// with the same placeholder so string and component headers load uniformly.
export const ROSTER_LOADING_TABLE_HEADER = "[&_th]:relative [&_th]:text-transparent! [&_th>*]:invisible [&_th]:after:absolute [&_th]:after:inset-x-3 [&_th]:after:top-1/2 [&_th]:after:h-3 [&_th]:after:-translate-y-1/2 [&_th]:after:rounded [&_th]:after:bg-primary-foreground/40 [&_th]:after:animate-[school-skeleton-pulse_2s_ease-in-out_infinite] [&_th]:after:content-[''] motion-reduce:[&_th]:after:animate-none";
