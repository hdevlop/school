'use client';

import { Children, type ReactNode } from 'react';
import { cn } from 'najm-kit';

const COLUMNS: Record<number, string> = {
  1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4',
};

// Rows share the available desktop height; omitted cards leave no empty columns.
export default function DashboardOverviewRow({ children }: { children: ReactNode }) {
  const cards = Children.toArray(children);
  if (!cards.length) return null;
  return (
    <div className={cn('grid grid-cols-1 gap-3 md:grid-cols-2 [&>*]:min-w-0 xl:min-h-[23rem] xl:fit:min-h-0 xl:fit:flex-1 xl:fit:basis-0 xl:fit:[&>*]:min-h-0', COLUMNS[cards.length])}>
      {cards}
    </div>
  );
}
