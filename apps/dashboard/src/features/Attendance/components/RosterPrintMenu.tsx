'use client';

import { useId, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, NButton, useMediaQuery } from 'najm-kit';
import { ChevronDown, Clock3, ListFilter, Printer, XCircle } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { useFeatureActions } from '@/shared/FeatureActions';
import { ROSTER_PRINT_CHOICES, type RosterPrintChoice } from '../config/rosterPrint';
import type { RosterMark } from '../config/rosterMarks';

const CHOICE_ICONS = { absent: XCircle, late: Clock3, absentAndLate: ListFilter };
const CHOICE_TONES = { absent: 'text-red-600 dark:text-red-400', late: 'text-amber-600 dark:text-amber-400', absentAndLate: 'text-muted-foreground' };

export default function RosterPrintMenu({ counts, onPrint, disabled = false }: {
  counts: Record<RosterMark, number>;
  onPrint: (choice: RosterPrintChoice) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const label = t('common.table.print');
  const featureActions = useFeatureActions();
  const isPhone = useMediaQuery('(max-width: 767px)');
  const [expanded, setExpanded] = useState(false);
  const choicesId = useId();
  const total = counts.absent + counts.late;
  const empty = <p className="px-3 py-3 text-sm leading-relaxed text-muted-foreground">{t('attendance.roster.nothingToPrint')}</p>;
  const choices = ROSTER_PRINT_CHOICES.map((choice) => ({
    choice,
    count: choice.marks.reduce((sum, mark) => sum + counts[mark], 0),
  }));
  const choiceContent = (choice: RosterPrintChoice, count: number) => {
    const Icon = CHOICE_ICONS[choice.key];
    return <>
      <Icon aria-hidden className={`size-4 shrink-0 ${CHOICE_TONES[choice.key]}`} />
      <span className="min-w-0 flex-1 text-start">{t(choice.label)}</span>
      <span data-menu-count="" className="ms-auto min-w-6 rounded-md bg-muted px-1.5 py-0.5 text-center text-xs font-medium tabular-nums text-muted-foreground">{count}</span>
    </>;
  };

  // The trigger is moved into HeaderActionsMenu on phones. Expanding there
  // keeps its anchor mounted instead of opening a competing modal dropdown.
  if (featureActions && isPhone) {
    return <>
      <NButton type="button" variant="ghost" disabled={disabled} aria-expanded={expanded} aria-controls={choicesId} onClick={() => setExpanded((value) => !value)}>
        <Printer className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 text-start">{label}</span>
        <span data-menu-count="">{total}</span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
      </NButton>
      {expanded && <section id={choicesId} data-menu-submenu="" aria-label={label}>
        {total === 0 ? empty : choices.map(({ choice, count }) => (
          <NButton key={choice.key} type="button" variant="ghost" disabled={count === 0} onClick={() => { onPrint(choice); setExpanded(false); }}>
            {choiceContent(choice, count)}
          </NButton>
        ))}
      </section>}
    </>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NButton variant="outline" disabled={disabled} aria-label={label} title={label} className="h-10 w-10 shrink-0 cursor-pointer p-0">
          <Printer className="h-4 w-4" />
        </NButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-64 max-w-[calc(100vw-2rem)] rounded-xl">
        <DropdownMenuLabel className="flex items-center gap-2 px-3 py-2"><Printer aria-hidden className="size-4 text-muted-foreground" />{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {total === 0 ? empty : choices.map(({ choice, count }) => (
          <DropdownMenuItem key={choice.key} disabled={count === 0} onSelect={() => onPrint(choice)} className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2">
            {choiceContent(choice, count)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
