'use client';

import { CalendarRange, ChevronDown } from 'lucide-react';
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
export function ViewingYearSelector({ inHeader = false }: { inHeader?: boolean } = {}) {
  const { t } = useTranslation();
  const { viewingYear, activeYear } = useViewingAcademicYear();
  const canChooseYear = useCanUseOtherAcademicYears();
  const setViewingYear = useSetViewingYear();
  const { data, isError, isPending } = useAcademicYearOptions();

  const label = t('academicYearViewing.label');
  const years = data?.years ?? [];
  const buttonLabel = viewingYear ? `${label}: ${viewingYear}` : label;
  const headerClassName = 'xl:absolute xl:left-1/2 xl:top-1/2 xl:-translate-x-1/2 xl:-translate-y-1/2';
  // At phone width the year is the header's widest control and the page title
  // gives way to it; the year alone says enough there, so the icons go.
  const headerIconClassName = 'max-sm:hidden';

  if (!canChooseYear) {
    return inHeader && viewingYear ? (
      <span role="status" className={`${headerClassName} inline-flex items-center gap-2 whitespace-nowrap px-2 font-semibold`}>
        <CalendarRange className={`size-4 text-primary ${headerIconClassName}`} aria-hidden />
        {viewingYear}
      </span>
    ) : null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NButton
          type="button"
          variant="ghost"
          size={inHeader ? 'default' : 'icon'}
          className={inHeader
            ? `${headerClassName} gap-2 whitespace-nowrap px-2 font-semibold text-foreground hover:text-foreground [&_svg]:opacity-100`
            : 'relative text-foreground hover:text-foreground [&_svg]:opacity-100'}
          aria-label={buttonLabel}
          title={buttonLabel}
        >
          <CalendarRange size={18} className={inHeader ? headerIconClassName : undefined} aria-hidden />
          {inHeader && <span>{viewingYear ?? label}</span>}
          {inHeader && <ChevronDown className={`size-4 text-muted-foreground ${headerIconClassName}`} aria-hidden />}
          {!inHeader && viewingYear && activeYear && viewingYear !== activeYear && (
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
