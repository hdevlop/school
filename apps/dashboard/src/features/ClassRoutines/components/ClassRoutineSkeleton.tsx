'use client';

import { NSkeleton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

const SKELETON_DAYS = Array.from({ length: 5 });
const SKELETON_PERIODS = Array.from({ length: 6 });
const gridTemplate = { gridTemplateColumns: '9rem repeat(5, minmax(12rem, 1fr))' };

export default function ClassRoutineSkeleton() {
  const { t } = useTranslation();
  return (
    <div
      aria-label={t('classRoutines.ui.loading.timetable')}
      aria-busy="true"
      className="overflow-auto rounded-2xl border bg-card shadow-sm"
    >
      <div>
        <div className="grid min-w-max border-b bg-muted/45" style={gridTemplate}>
          <div className="flex items-center border-r px-3 py-2">
            <NSkeleton className="h-4 w-20" />
          </div>
          {SKELETON_DAYS.map((_, dayIndex) => (
            <div key={dayIndex} className="border-r px-3 py-2 last:border-r-0">
              <NSkeleton className="h-4 w-24" />
            </div>
          ))}
        </div>

        {SKELETON_PERIODS.map((_, periodIndex) => (
          <div key={periodIndex} className="grid min-w-max border-b last:border-b-0" style={gridTemplate}>
            <div className="flex min-h-16 flex-col justify-center gap-2 border-r px-3 py-2">
              <NSkeleton className="h-4 w-20" />
              <NSkeleton className="h-3 w-24" />
            </div>
            {SKELETON_DAYS.map((_, dayIndex) => (
              <div key={dayIndex} className="min-h-16 border-r p-1.5 last:border-r-0">
                <div className="flex h-full flex-col justify-center gap-2 rounded-lg border px-2.5 py-1.5">
                  <NSkeleton className="h-4 w-3/5" />
                  <NSkeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
