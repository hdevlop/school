'use client';

import { useState } from 'react';
import { Check, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { ExamControl } from '@sms/contracts';

/**
 * The Contrôle Planning shows, picked from a menu where the school also
 * changes (✎) or removes (🗑) each one. One read from Planning's months (a
 * year with none saved yet) is changed the same way: the server saves the
 * year's Contrôles first (ExamPlanningService.storedControlFor).
 */
export function ControlPicker({ controls, active, label, disabled, canEdit, canDelete, onPick, onEdit, onDelete, className }: {
  controls: readonly ExamControl[];
  active?: ExamControl;
  label: (control: ExamControl) => string;
  disabled?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onPick: (control: ExamControl) => void;
  onEdit: (control: ExamControl) => void;
  onDelete: (control: ExamControl) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // An icon inside a menu row acts on its Contrôle without picking it: the menu closes first,
  // then its dialog opens, so the two do not fight over focus.
  const act = (event: { preventDefault: () => void; stopPropagation: () => void }, run: () => void) => {
    event.preventDefault(); event.stopPropagation(); setOpen(false); setTimeout(run, 0);
  };
  // One read from Planning's months is changed too: the server saves the year's Contrôles first.
  const activeEditable = !!active;
  // A list of one has nothing to pick: the box shows it, with no menu to open.
  const many = controls.length > 1;
  const text = <span className="min-w-0 flex-1 truncate">{active ? label(active) : t('examPlanning.noControlTitle')}</span>;
  const icon = 'inline-flex size-8 shrink-0 items-center justify-center rounded-md disabled:pointer-events-none';
  // One framed box: the Contrôle shown, its ✎ and 🗑, then ▾ when there are others to pick.
  return <DropdownMenu open={open} onOpenChange={setOpen}>
    <div className={cn('flex min-h-9 min-w-0 items-center gap-0.5 rounded-md border bg-background pe-1 shadow-xs', (disabled || !controls.length) && 'opacity-60', className)}>
      {many ? <DropdownMenuTrigger asChild disabled={disabled}>
        <button type="button" aria-label={t('examPlanning.control')}
          className="flex h-full min-h-9 min-w-0 flex-1 items-center rounded-md ps-3 text-start text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{text}</button>
      </DropdownMenuTrigger> : <span className="flex min-h-9 min-w-0 flex-1 items-center ps-3 text-sm">{text}</span>}
      {activeEditable && canEdit && <button type="button" disabled={disabled} onClick={() => onEdit(active)} className={cn(icon, 'hover:bg-muted')}
        aria-label={`${t('examPlanning.controls.edit')} · ${label(active)}`} title={t('examPlanning.controls.edit')}><Pencil className="size-4" aria-hidden /></button>}
      {activeEditable && canDelete && <button type="button" disabled={disabled} onClick={() => onDelete(active)} className={cn(icon, 'hover:bg-destructive/10')}
        aria-label={`${t('common.delete')} · ${label(active)}`} title={t('common.delete')}><Trash2 className="size-4 text-destructive" aria-hidden /></button>}
      {/* The label is the menu's trigger for the keyboard; ▾ opens it too. */}
      {many && <button type="button" tabIndex={-1} aria-hidden disabled={disabled} onClick={() => setOpen(value => !value)} className={cn(icon, 'hover:bg-muted')}>
        <ChevronDown className="size-4 opacity-60" aria-hidden />
      </button>}
    </div>
    <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
      {controls.map(control => {
        return <DropdownMenuItem key={control.id} onSelect={() => onPick(control)} className="gap-2 py-1 pe-1">
          <Check className={cn('size-4 shrink-0', active?.id === control.id ? 'opacity-100' : 'opacity-0')} aria-hidden />
          <span className="min-w-0 flex-1 truncate">{label(control)}</span>
          {canEdit && <button type="button" className="inline-flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-muted"
            aria-label={`${t('examPlanning.controls.edit')} · ${label(control)}`} title={t('examPlanning.controls.edit')}
            onPointerDown={event => event.stopPropagation()} onClick={event => act(event, () => onEdit(control))}><Pencil className="size-4" aria-hidden /></button>}
          {canDelete && <button type="button" className="inline-flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-destructive/10"
            aria-label={`${t('common.delete')} · ${label(control)}`} title={t('common.delete')}
            onPointerDown={event => event.stopPropagation()} onClick={event => act(event, () => onDelete(control))}><Trash2 className="size-4 text-destructive" aria-hidden /></button>}
        </DropdownMenuItem>;
      })}
    </DropdownMenuContent>
  </DropdownMenu>;
}
