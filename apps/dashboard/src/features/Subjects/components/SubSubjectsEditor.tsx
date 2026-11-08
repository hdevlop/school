'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { NButton, Popover, PopoverContent, PopoverTrigger, TextInput } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { foldSubjectName } from '@sms/contracts';

export type SubSubjectDraft = { key: string; id?: string; name: string };

/** Turns a subject's stored sub-subjects into editable tags. */
export const subSubjectDrafts = (list?: Array<{ id: string; name: string }> | null): SubSubjectDraft[] =>
  (list ?? []).map(item => ({ key: item.id, id: item.id, name: item.name }));

/** What the form sends: the whole list in order, empty ones dropped, ids kept so a rename stays a rename. */
export const subSubjectPayload = (rows: SubSubjectDraft[]) =>
  rows.filter(row => row.name.trim()).map(row => ({ ...(row.id ? { id: row.id } : {}), name: row.name.trim() }));

/**
 * The tags a line had no room for, in a popover: it opens on hover or focus,
 * and on tap where there is no hover. A tap does not open the row behind it.
 */
function MoreTags({ items }: { items: Array<{ id: string; name: string }> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // Leaving waits a moment, so the pointer can cross the gap into the popover.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = () => { clearTimeout(timer.current); setOpen(true); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 150); };
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <button type="button" aria-label={t('subjects.form.moreSubSubjects', { count: items.length })}
        className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
        onClick={event => { event.stopPropagation(); setOpen(value => !value); }}>+{items.length}</button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-auto max-w-xs p-2" onMouseEnter={show} onMouseLeave={hide}
      onOpenAutoFocus={event => event.preventDefault()} onClick={event => event.stopPropagation()}>
      <div className="flex flex-wrap gap-1">
        {items.map(part => <bdi key={part.id} dir="auto" className="rounded-full border bg-background px-2 py-0.5 text-xs">{part.name}</bdi>)}
      </div>
    </PopoverContent>
  </Popover>;
}

const chip = 'rounded-full border bg-background px-2 py-0.5 text-xs';
const BADGE_ROOM = 44; // the +N badge
const GAP = 4;

/**
 * A subject's sub-subjects as tags, read only: all of them wrapped, or, with
 * oneLine, as many as the cell's width holds, then +N, so a table row keeps
 * one line however wide its column is.
 */
export function SubSubjectTags({ items, oneLine = false }: { items?: Array<{ id: string; name: string }> | null; oneLine?: boolean }) {
  const list = items ?? [];
  const box = useRef<HTMLDivElement>(null), measure = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(list.length);
  const names = list.map(part => part.name).join('|');
  useLayoutEffect(() => {
    if (!oneLine || !box.current || !measure.current) return;
    const container = box.current, tags = [...measure.current.children] as HTMLElement[];
    const fit = () => {
      const width = container.clientWidth;
      let used = 0, count = 0;
      for (const [index, tag] of tags.entries()) {
        const next = used + (count ? GAP : 0) + tag.offsetWidth;
        // The last tag needs no room for a badge after it.
        if (next + (index < tags.length - 1 ? GAP + BADGE_ROOM : 0) > width) break;
        used = next; count += 1;
      }
      setFits(Math.max(1, count));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [oneLine, names]);
  if (!list.length) return <span className="text-muted-foreground">—</span>;
  if (!oneLine) return <div className="flex flex-wrap gap-1">{list.map(part => <bdi key={part.id} dir="auto" className={chip}>{part.name}</bdi>)}</div>;
  const shown = list.slice(0, fits);
  return <div ref={box} className="relative flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden">
    {/* Every tag at its natural width, unseen: what decides how many fit. */}
    <div ref={measure} aria-hidden="true" className="invisible absolute flex gap-1 whitespace-nowrap">{list.map(part => <bdi key={part.id} dir="auto" className={chip}>{part.name}</bdi>)}</div>
    {shown.map(part => <bdi key={part.id} dir="auto" title={part.name} className={`${chip} min-w-0 truncate whitespace-nowrap`}>{part.name}</bdi>)}
    {list.length > shown.length && <MoreTags items={list.slice(shown.length)} />}
  </div>;
}

const tag = 'inline-flex max-w-full items-center gap-0.5 rounded-full border bg-background py-0.5 ps-3 pe-1 text-sm';
const iconButton = 'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground';

/**
 * What a subject is taught as (Français: Grammaire, Dictée…), the same list for
 * every class, as tags to rename or remove. Planning picks from it; renaming
 * one here renames it there.
 */
export function SubSubjectsEditor({ rows, onChange }: { rows: SubSubjectDraft[]; onChange: (rows: SubSubjectDraft[]) => void }) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState('');
  const [editing, setEditing] = useState<{ key: string; name: string } | null>(null);
  const taken = (name: string, except?: string) => rows.some(row => row.key !== except && foldSubjectName(row.name) === foldSubjectName(name));

  const add = () => {
    const name = adding.trim();
    if (!name || taken(name)) return;
    onChange([...rows, { key: crypto.randomUUID(), name }]);
    setAdding('');
  };
  const rename = () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (name && !taken(name, editing.key)) onChange(rows.map(row => row.key === editing.key ? { ...row, name } : row));
    setEditing(null);
  };
  // Enter confirms and Escape cancels, without submitting the subject form.
  const keys = (confirm: () => void, cancel: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') { event.preventDefault(); confirm(); }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); }
  };

  return <div className="space-y-2">
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-sm font-medium">{t('subjects.form.subSubjects')}{rows.length > 0 && <span className="ms-1.5 text-xs text-muted-foreground">({rows.length})</span>}</p>
    </div>
    <p className="text-xs text-muted-foreground">{t('subjects.form.subSubjectsHelp')}</p>
    {rows.length > 0 && <div className="flex flex-wrap gap-1.5">
      {rows.map(row => editing?.key === row.key
        ? <span key={row.key} className="inline-flex items-center gap-1">
          <TextInput autoFocus dir="auto" maxLength={120} className="h-8 w-44" value={editing.name} aria-label={t('subjects.form.renameSubSubject', { name: row.name })}
            onChange={value => setEditing({ key: row.key, name: value })} onKeyDown={keys(rename, () => setEditing(null))} />
          <button type="button" className={iconButton} aria-label={t('common.save')} onClick={rename}><Check className="size-3.5" /></button>
          <button type="button" className={iconButton} aria-label={t('common.cancel')} onClick={() => setEditing(null)}><X className="size-3.5" /></button>
        </span>
        : <span key={row.key} className={tag}>
          <bdi dir="auto" className="truncate">{row.name}</bdi>
          <button type="button" className={iconButton} aria-label={t('subjects.form.renameSubSubject', { name: row.name })} onClick={() => setEditing({ key: row.key, name: row.name })}><Pencil className="size-3" /></button>
          <button type="button" className={iconButton} aria-label={t('subjects.form.removeSubSubject', { name: row.name })} onClick={() => onChange(rows.filter(item => item.key !== row.key))}><X className="size-3.5" /></button>
        </span>)}
    </div>}
    <div className="flex items-center gap-2">
      <TextInput dir="auto" maxLength={120} className="h-9" value={adding} placeholder={t('subjects.form.subSubjectPlaceholder')} aria-label={t('subjects.form.addSubSubject')}
        onChange={setAdding} onKeyDown={keys(add, () => setAdding(''))} />
      <NButton type="button" variant="outline" size="sm" leftIcon={<Plus className="size-4" />} disabled={!adding.trim() || taken(adding)} onClick={add}>{t('subjects.form.addSubSubject')}</NButton>
    </div>
    {adding.trim() && taken(adding) && <p className="text-xs text-destructive">{t('subjects.errors.subSubjectTwice', { name: adding.trim() })}</p>}
  </div>;
}
