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
 * Where the selector sits. `header` is the page header's centered control;
 * `sidebar` is the same control in the mobile drawer, under the logo. The two
 * split the width at `sm`, so a phone shows it in the drawer and every wider
 * screen in the header — never both, never neither.
 */
export type ViewingYearSelectorPlacement = 'inline' | 'header' | 'sidebar';

const placementClassName: Record<Exclude<ViewingYearSelectorPlacement, 'inline'>, string> = {
  header: 'max-sm:hidden xl:absolute xl:left-1/2 xl:top-1/2 xl:-translate-x-1/2 xl:-translate-y-1/2',
  sidebar: 'sm:hidden',
};

/**
 * The shell's school-year selector, for administrators and accounting only,
 * the roles that work in other years. Choosing a year changes this tab's
 * selection, never the school's active year.
 */
export function ViewingYearSelector({ placement = 'inline' }: { placement?: ViewingYearSelectorPlacement } = {}) {
  const { t } = useTranslation();
  const { viewingYear, activeYear } = useViewingAcademicYear();
  const canChooseYear = useCanUseOtherAcademicYears();
  const setViewingYear = useSetViewingYear();
  const { data, isError, isPending } = useAcademicYearOptions();

  const label = t('academicYearViewing.label');
  const years = data?.years ?? [];
  const buttonLabel = viewingYear ? `${label}: ${viewingYear}` : label;
  const inSidebar = placement === 'sidebar';
  const labelled = placement !== 'inline';

  if (!canChooseYear) {
    return labelled && viewingYear ? (
      <span
        role="status"
        className={`${placementClassName[placement]} inline-flex items-center gap-2 whitespace-nowrap px-2 font-semibold ${inSidebar ? 'text-sidebar-foreground' : ''}`}
      >
        <CalendarRange className="size-4 text-primary" aria-hidden />
        {viewingYear}
      </span>
    ) : null;
  }

  const triggerClassName = inSidebar
    ? `${placementClassName.sidebar} w-full justify-start gap-2 border-sidebar-border bg-transparent px-3 font-semibold text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&_svg]:opacity-100`
    : placement === 'header'
      ? `${placementClassName.header} gap-2 whitespace-nowrap px-2 font-semibold text-foreground hover:text-foreground [&_svg]:opacity-100`
      : 'relative text-foreground hover:text-foreground [&_svg]:opacity-100';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NButton
          type="button"
          variant={inSidebar ? 'outline' : 'ghost'}
          size={labelled ? 'default' : 'icon'}
          className={triggerClassName}
          aria-label={buttonLabel}
          title={buttonLabel}
        >
          <CalendarRange size={18} aria-hidden />
          {labelled && <span>{viewingYear ?? label}</span>}
          {labelled && <ChevronDown className={`size-4 text-muted-foreground ${inSidebar ? 'ms-auto' : ''}`} aria-hidden />}
          {!labelled && viewingYear && activeYear && viewingYear !== activeYear && (
            <span className="absolute bottom-1 end-1 size-1.5 rounded-full bg-primary" aria-hidden />
          )}
        </NButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={inSidebar ? 'start' : 'end'} className="min-w-52">
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
