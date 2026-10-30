'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, NButton } from 'najm-kit';
import { Printer } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { ROSTER_PRINT_CHOICES, type RosterPrintChoice } from '../config/rosterPrint';
import type { RosterMark } from '../config/rosterMarks';

export default function RosterPrintMenu({ counts, onPrint, disabled = false }: {
  counts: Record<RosterMark, number>;
  onPrint: (choice: RosterPrintChoice) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const label = t('common.table.print');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NButton variant="outline" disabled={disabled} aria-label={label} title={label} className="h-10 w-10 shrink-0 cursor-pointer p-0">
          <Printer className="h-4 w-4" />
        </NButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROSTER_PRINT_CHOICES.map((choice) => {
          const count = choice.marks.reduce((sum, mark) => sum + counts[mark], 0);
          return (
            <DropdownMenuItem key={choice.key} disabled={count === 0} onSelect={() => onPrint(choice)} className="cursor-pointer justify-between gap-4">
              <span>{t(choice.label)}</span>
              <span className="font-mono text-xs text-muted-foreground">{count}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
