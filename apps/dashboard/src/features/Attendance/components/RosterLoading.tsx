import { NSkeleton } from 'najm-kit';

/** Match the page header's footprint while its identity and actions load. */
export function RosterPageHeaderSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-h-14 shrink-0 items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 lg:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <NSkeleton className="hidden size-8 shrink-0 sm:block" />
        <div className="space-y-2">
          <NSkeleton className="h-4 w-24" />
          <NSkeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <NSkeleton className="hidden h-8 w-28 sm:block" />
        {Array.from({ length: 4 }, (_, index) => <NSkeleton key={index} className="size-8" />)}
      </div>
    </div>
  );
}

// NTable's loading header only renders string labels. Replace every label
// with the same placeholder so string and component headers load uniformly.
export const ROSTER_LOADING_TABLE_HEADER = "[&_th]:relative [&_th]:text-transparent! [&_th>*]:invisible [&_th]:after:absolute [&_th]:after:inset-x-3 [&_th]:after:top-1/2 [&_th]:after:h-3 [&_th]:after:-translate-y-1/2 [&_th]:after:rounded [&_th]:after:bg-primary-foreground/25 [&_th]:after:animate-pulse [&_th]:after:content-[''] motion-reduce:[&_th]:after:animate-none";
