'use client';

import { CalendarRange } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, NButton,
} from 'najm-kit';
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
export function ViewingYearSelector() {
  const { t } = useTranslation();
  const { viewingYear, activeYear } = useViewingAcademicYear();
  const canChooseYear = useCanUseOtherAcademicYears();
  const setViewingYear = useSetViewingYear();
  const { data, isError, isPending } = useAcademicYearOptions();

  if (!canChooseYear) return null;

  const label = t('academicYearViewing.label');
  const years = data?.years ?? [];
  const buttonLabel = viewingYear ? `${label}: ${viewingYear}` : label;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NButton
          type="button"
          variant="ghost"
          size="icon"
          className="relative text-foreground hover:text-foreground [&_svg]:opacity-100"
          aria-label={buttonLabel}
          title={buttonLabel}
        >
          <CalendarRange size={18} aria-hidden />
          {viewingYear && activeYear && viewingYear !== activeYear && (
            <span className="absolute bottom-1 end-1 size-1.5 rounded-full bg-primary" aria-hidden />
          )}
        </NButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isError || (!isPending && years.length === 0) ? (
          <DropdownMenuItem disabled>{t('academicYearViewing.unavailable')}</DropdownMenuItem>
        ) : isPending ? (
          <DropdownMenuItem disabled>{t('common.loading')}</DropdownMenuItem>
        ) : (
          <DropdownMenuRadioGroup value={viewingYear ?? ''} onValueChange={setViewingYear}>
            {years.map((year) => (
              <DropdownMenuRadioItem key={year.id} value={year.label} className="cursor-pointer whitespace-nowrap">
                {year.label === activeYear ? t('academicYearViewing.activeOption', { year: year.label }) : year.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
