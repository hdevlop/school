'use client';

import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { NButton, TextInput } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { foldSubjectName } from '@sms/contracts';

export type SubSubjectDraft = { key: string; id?: string; name: string };

/** Turns a subject's stored sub-subjects into editable tags. */
export const subSubjectDrafts = (list?: Array<{ id: string; name: string }> | null): SubSubjectDraft[] =>
  (list ?? []).map(item => ({ key: item.id, id: item.id, name: item.name }));

/** What the form sends: the whole list in order, empty ones dropped, ids kept so a rename stays a rename. */
export const subSubjectPayload = (rows: SubSubjectDraft[]) =>
  rows.filter(row => row.name.trim()).map(row => ({ ...(row.id ? { id: row.id } : {}), name: row.name.trim() }));

const tag = 'inline-flex max-w-full items-center gap-1 rounded-full border bg-background py-0.5 ps-3 pe-1 text-sm shadow-xs transition-colors hover:border-primary/40';
const iconButton = 'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground';
const removeButton = 'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive';
const ARABIC_LETTER = /\p{Script=Arabic}/u;

/**
 * What a subject is taught as in one class (Français: Grammaire, Dictée…), as
 * tags to rename or remove. Planning picks from it.
 */
export function SubSubjectsEditor({ rows, onChange, help, arabic }: {
  rows: SubSubjectDraft[]; onChange: (rows: SubSubjectDraft[]) => void; help?: string;
  /** An Arabic subject: its tags run right to left and the example is Arabic. Guessed from the names when left out. */
  arabic?: boolean;
}) {
  const { t } = useTranslation();
  const rtl = arabic ?? rows.some(row => ARABIC_LETTER.test(row.name));
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

  return <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <p className="text-sm font-medium">{t('subjects.form.subSubjects')}</p>
      {rows.length > 0 && <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-semibold tabular-nums text-muted-foreground">{rows.length}</span>}
    </div>
    <p className="text-xs leading-relaxed text-muted-foreground">{help ?? t('subjects.form.subSubjectsHelp')}</p>
    {/* The tags in one box, in the list's own direction; a tag's name renames it, its × removes it. */}
    <div dir={rtl ? 'rtl' : 'ltr'} className="flex min-h-14 flex-wrap content-start items-center gap-1.5 rounded-lg border border-dashed bg-muted/30 p-2">
      {!rows.length && <span dir="auto" className="px-1 text-xs text-muted-foreground">{t('subjects.mine.noSubSubjects')}</span>}
      {rows.map(row => editing?.key === row.key
        ? <span key={row.key} className="inline-flex items-center gap-1 rounded-full border border-primary bg-background py-0.5 ps-1 pe-1 shadow-sm">
          <TextInput autoFocus dir="auto" maxLength={120} className="h-7 w-40 border-0 shadow-none focus-visible:ring-0" value={editing.name} aria-label={t('subjects.form.renameSubSubject', { name: row.name })}
            onChange={value => setEditing({ key: row.key, name: value })} onKeyDown={keys(rename, () => setEditing(null))} />
          <button type="button" className={iconButton} aria-label={t('common.save')} onClick={rename}><Check className="size-3.5" /></button>
          <button type="button" className={iconButton} aria-label={t('common.cancel')} onClick={() => setEditing(null)}><X className="size-3.5" /></button>
        </span>
        : <span key={row.key} className={tag}>
          <button type="button" className="min-w-0 truncate rounded-full py-0.5 hover:text-primary" title={t('subjects.form.renameSubSubject', { name: row.name })}
            aria-label={t('subjects.form.renameSubSubject', { name: row.name })} onClick={() => setEditing({ key: row.key, name: row.name })}><bdi dir="auto">{row.name}</bdi></button>
          <button type="button" className={removeButton} aria-label={t('subjects.form.removeSubSubject', { name: row.name })} onClick={() => onChange(rows.filter(item => item.key !== row.key))}><X className="size-3" /></button>
        </span>)}
    </div>
    <div className="flex items-center gap-2">
      <TextInput dir={rtl ? 'rtl' : 'auto'} maxLength={120} className="h-9 flex-1" value={adding} placeholder={t(rtl ? 'subjects.form.subSubjectPlaceholderAr' : 'subjects.form.subSubjectPlaceholder')} aria-label={t('subjects.form.addSubSubject')}
        onChange={setAdding} onKeyDown={keys(add, () => setAdding(''))} />
      <NButton type="button" variant="outline" size="sm" className="h-9 shrink-0" leftIcon={<Plus className="size-4" />} disabled={!adding.trim() || taken(adding)} onClick={add}>{t('subjects.form.add')}</NButton>
    </div>
    {adding.trim() && taken(adding) && <p className="text-xs text-destructive">{t('subjects.errors.subSubjectTwice', { name: adding.trim() })}</p>}
  </div>;
}
