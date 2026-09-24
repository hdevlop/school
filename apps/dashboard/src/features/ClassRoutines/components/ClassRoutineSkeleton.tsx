'use client';

import { NSkeleton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

const DAYS = Array.from({ length: 5 });
const PERIODS = Array.from({ length: 7 });

export default function ClassRoutineSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-label={t('classRoutines.ui.loading.timetable')} aria-busy="true" className="overflow-auto rounded-xl border bg-card">
      <table className="w-max min-w-full table-fixed border-collapse">
        <thead className="bg-slate-800">
          <tr>
            <th className="w-28 min-w-28 border-e border-white/20 p-2"><NSkeleton className="h-4 w-16" /></th>
            {PERIODS.map((_, index) => (
              <th key={index} className="w-48 min-w-48 border-e border-white/20 p-2"><NSkeleton className="h-4 w-28" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((_, day) => (
            <tr key={day} className="border-t">
              <th className="border-e bg-muted/30 p-2"><NSkeleton className="h-4 w-16" /></th>
              {PERIODS.map((_, period) => (
                <td key={period} className="h-24 border-e p-2"><NSkeleton className="h-16 w-full" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
