'use client';

import { CalendarRange } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import {
  useAcademicYearOptions,
  useCanUseOtherAcademicYears,
  useSetViewingYear,
  useViewingAcademicYear,
} from '../hooks/useViewingAcademicYear';

/**
 * The shell's school-year selector, for administrators and accounting only,
 * the roles that work in other years. Choosing a year changes this tab's
 * selection, never the school's active year.
 */
export function ViewingYearSelector({ collapsed }: Readonly<{ collapsed: boolean }>) {
  const { t } = useTranslation();
  const { viewingYear, activeYear } = useViewingAcademicYear();
  const canChooseYear = useCanUseOtherAcademicYears();
  const setViewingYear = useSetViewingYear();
  const { data, isError } = useAcademicYearOptions();

  if (!canChooseYear) return null;

  const label = t('academicYearViewing.label');
  if (collapsed) {
    return (
      <div className="flex h-8 items-center justify-center text-sidebar-foreground/70" title={`${label}: ${viewingYear ?? ''}`}>
        <CalendarRange className="h-4 w-4" aria-hidden />
        <span className="sr-only">{`${label}: ${viewingYear ?? ''}`}</span>
      </div>
    );
  }

  const years = data?.years ?? [];
  return (
    <div className="flex flex-col gap-1 px-2 pb-1">
      <span className="text-xs font-medium text-sidebar-foreground/70">{label}</span>
      <Select value={viewingYear ?? ''} onValueChange={(year) => setViewingYear(year)} disabled={isError || !years.length}>
        <SelectTrigger aria-label={label} className="h-8 w-full">
          <SelectValue placeholder={isError ? t('academicYearViewing.unavailable') : viewingYear} />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year.id} value={year.label}>
              {year.label === activeYear ? t('academicYearViewing.activeOption', { year: year.label }) : year.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
