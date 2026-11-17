'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Check, MoreVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { CompetencyDomain } from '@sms/contracts';
import { cn, Input, NButton, NConfirmDialog, NSheet, Popover, PopoverContent, PopoverTrigger } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { catalogLanguage } from '../config/competencyLanguage';
import { createCompetencyNameSchema } from '../config/competencySchemas';
import { useCompetencyCatalogActions } from '../hooks/useCompetencies';

type Names = { name: string; altName: string | null };
type Deleting = { kind: 'domain' | 'competency'; id: string; name: string; count: number };
/** The one name being renamed: a sub-domain's or a competency's id. */
type Renaming = { kind: 'domain' | 'competency'; id: string } | null;

/** The order a move leaves, as the positions that change. */
function moved<T extends { id: string; position: number }>(items: T[], index: number, step: -1 | 1) {
  const target = index + step;
  if (target < 0 || target >= items.length) return [];
  const order = [...items];
  [order[index], order[target]] = [order[target], order[index]];
  return order.flatMap((item, position) => (item.position === position ? [] : [{ id: item.id, position }]));
}

/**
 * One name typed in place: Enter saves. Adding keeps the field open and empty
 * for the next name, so a whole grid is typed down the list; renaming closes
 * it, and Escape gives up. A second-language name is one tap away, not a
 * second field everyone has to read past.
 */
function NameField({ initial, placeholder, mode, busy, onSubmit, onCancel }: {
  initial?: Names;
  placeholder: string;
  mode: 'add' | 'rename';
  busy: boolean;
  onSubmit: (values: Names) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const schema = useMemo(() => createCompetencyNameSchema(t), [t]);
  const [name, setName] = useState(initial?.name ?? '');
  const [altName, setAltName] = useState(initial?.altName ?? '');
  const [showAlt, setShowAlt] = useState(!!initial?.altName);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'add' && !name.trim()) return;
    const parsed = schema.safeParse({ name, altName });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? null); return; }
    setError(null);
    if (await onSubmit({ name: parsed.data.name, altName: parsed.data.altName ?? null }) && mode === 'add') {
      setName(''); setAltName(''); setShowAlt(false);
      input.current?.focus();
    }
  };

  return (
    <form onSubmit={submit} onKeyDown={(event) => { if (event.key === 'Escape' && onCancel) { event.stopPropagation(); onCancel(); } }}
      className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Input ref={input} value={name} onChange={(event) => setName(event.target.value)} placeholder={placeholder} aria-label={placeholder}
          dir="auto" disabled={busy} autoFocus={mode === 'rename'} aria-invalid={!!error} className="h-10 min-w-0 flex-1 text-sm" />
        <NButton type="submit" size="icon" variant={mode === 'add' ? 'outline' : 'default'} className="size-10 shrink-0"
          disabled={busy || (mode === 'add' && !name.trim())} aria-label={mode === 'add' ? placeholder : t('competencies.catalog.save')}>
          {mode === 'add' ? <Plus className="size-4" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
        </NButton>
        {onCancel ? (
          <NButton type="button" size="icon" variant="ghost" className="size-10 shrink-0" onClick={onCancel} disabled={busy} aria-label={t('competencies.catalog.cancel')}>
            <X className="size-4" aria-hidden="true" />
          </NButton>
        ) : null}
      </div>
      {showAlt ? (
        <Input value={altName} onChange={(event) => setAltName(event.target.value)} placeholder={t('competencies.catalog.altName')}
          aria-label={t('competencies.catalog.altName')} dir="auto" disabled={busy} className="h-9 text-sm" />
      ) : (mode === 'rename' || name.trim()) ? (
        <button type="button" onClick={() => setShowAlt(true)} className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline">
          + {t('competencies.catalog.addAltName')}
        </button>
      ) : null}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}

/** Rename, move and delete behind one ⋮, so a row shows its name and not four buttons. */
function RowMenu({ name, busy, canUpdate, canDelete, onRename, onUp, onDown, onDelete }: {
  name: string; busy: boolean; canUpdate: boolean; canDelete: boolean;
  onRename: () => void; onUp?: () => void; onDown?: () => void; onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!canUpdate && !canDelete) return null;
  const item = 'flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-start text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40';
  const choose = (action?: () => void) => () => { setOpen(false); action?.(); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <NButton type="button" size="icon" variant="ghost" className="size-9 shrink-0" disabled={busy}
          aria-label={t('competencies.catalog.actions', { name })}>
          <MoreVertical className="size-4" aria-hidden="true" />
        </NButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 rounded-xl p-1">
        {canUpdate ? (
          <>
            <button type="button" className={item} onClick={choose(onRename)}><Pencil className="size-4" aria-hidden="true" />{t('competencies.catalog.edit')}</button>
            <button type="button" className={item} disabled={!onUp} onClick={choose(onUp)}><ArrowUp className="size-4" aria-hidden="true" />{t('competencies.catalog.moveUp')}</button>
            <button type="button" className={item} disabled={!onDown} onClick={choose(onDown)}><ArrowDown className="size-4" aria-hidden="true" />{t('competencies.catalog.moveDown')}</button>
          </>
        ) : null}
        {canDelete ? (
          <button type="button" className={cn(item, 'text-destructive')} onClick={choose(onDelete)}>
            <Trash2 className="size-4" aria-hidden="true" />{t('competencies.catalog.delete')}
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

const Caption = ({ children }: { children: string }) => (
  <p className="text-[11px] font-medium text-muted-foreground">{children}</p>
);

/**
 * The teacher builds the class and subject's list here, laid out like the
 * school's paper grid: each sub-domain (المجال الفرعي) is a card holding its
 * competencies (المهارات), numbered in the order they are followed, with a
 * field at the bottom of each card for the next one and one under the cards
 * for the next sub-domain.
 */
export function CatalogEditor({ open, onClose, teacherAssignmentId, domains, canCreate, canUpdate, canDelete }: {
  open: boolean;
  onClose: () => void;
  teacherAssignmentId: string;
  domains: CompetencyDomain[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { t } = useTranslation();
  const actions = useCompetencyCatalogActions();
  const [renaming, setRenaming] = useState<Renaming>(null);
  const [deleting, setDeleting] = useState<Deleting | null>(null);
  const [busy, setBusy] = useState(false);
  // An Arabic list reads right to left here as on the sheets; its labels stay in the page language.
  const dir = catalogLanguage(domains) === 'ar' ? 'rtl' : undefined;

  const act = async (send: () => Promise<unknown>) => {
    setBusy(true);
    try { await send(); return true; } catch { return false; } finally { setBusy(false); }
  };

  const reorder = (changes: Array<{ id: string; position: number }>, kind: 'domain' | 'competency') => act(async () => {
    for (const change of changes) {
      if (kind === 'domain') await actions.updateDomain(change.id, { position: change.position });
      else await actions.updateCompetency(change.id, { position: change.position });
    }
  });

  const rename = (kind: 'domain' | 'competency', id: string) => async (values: Names) => {
    const done = await act(() => (kind === 'domain' ? actions.updateDomain(id, values) : actions.updateCompetency(id, values)));
    if (done) setRenaming(null);
    return done;
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const done = await act(() => (deleting.kind === 'domain' ? actions.deleteDomain(deleting.id) : actions.deleteCompetency(deleting.id)));
    if (done) setDeleting(null);
  };

  const isRenaming = (kind: 'domain' | 'competency', id: string) => renaming?.kind === kind && renaming.id === id;

  return (
    <>
      <NSheet
        open={open}
        // Escape (or a tap outside) during a rename gives up the rename and keeps the sheet open.
        onOpenChange={(next) => { if (next || busy) return; if (renaming) setRenaming(null); else onClose(); }}
        icon={FEATURE_ICONS.competencies}
        title={t('competencies.catalog.manage')}
        description={t('competencies.catalog.hint')}
        width={560}
        classNames={{ content: 'max-w-full bg-background', body: 'p-3' }}
        footer={<div className="flex w-full justify-end"><NButton type="button" onClick={onClose} disabled={busy}>{t('competencies.catalog.done')}</NButton></div>}
      >
        <div dir={dir} className="flex flex-col gap-3">
          {domains.map((domain, domainIndex) => (
            <section key={domain.id} aria-label={domain.name} className="overflow-hidden rounded-xl border bg-card">
              <header className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
                {isRenaming('domain', domain.id) ? (
                  <div className="min-w-0 flex-1">
                    <NameField mode="rename" initial={{ name: domain.name, altName: domain.altName }} placeholder={t('competencies.catalog.domainName')}
                      busy={busy} onSubmit={rename('domain', domain.id)} onCancel={() => setRenaming(null)} />
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <Caption>{t('competencies.catalog.domainName')}</Caption>
                      <h3 className="truncate text-sm font-semibold"><bdi dir="auto">{domain.name}</bdi></h3>
                      {domain.altName ? <div className="truncate text-xs text-muted-foreground"><bdi dir="auto">{domain.altName}</bdi></div> : null}
                    </div>
                    <RowMenu name={domain.name} busy={busy} canUpdate={canUpdate} canDelete={canDelete}
                      onRename={() => setRenaming({ kind: 'domain', id: domain.id })}
                      onUp={domainIndex > 0 ? () => reorder(moved(domains, domainIndex, -1), 'domain') : undefined}
                      onDown={domainIndex < domains.length - 1 ? () => reorder(moved(domains, domainIndex, 1), 'domain') : undefined}
                      onDelete={() => setDeleting({ kind: 'domain', id: domain.id, name: domain.name, count: 0 })} />
                  </>
                )}
              </header>

              <div className="flex flex-col gap-1 px-3 pb-3 pt-2">
                <Caption>{t('competencies.catalog.competencies')}</Caption>
                <ol className="flex flex-col">
                  {domain.competencies.map((item, itemIndex) => (
                    <li key={item.id} className="flex min-h-11 items-center gap-2.5 border-b border-dashed py-1 last:border-b-0">
                      <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground">
                        {itemIndex + 1}
                      </span>
                      {isRenaming('competency', item.id) ? (
                        <div className="min-w-0 flex-1 py-1">
                          <NameField mode="rename" initial={{ name: item.name, altName: item.altName }} placeholder={t('competencies.catalog.competencyName')}
                            busy={busy} onSubmit={rename('competency', item.id)} onCancel={() => setRenaming(null)} />
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm"><bdi dir="auto">{item.name}</bdi></div>
                            {item.altName ? <div className="truncate text-xs text-muted-foreground"><bdi dir="auto">{item.altName}</bdi></div> : null}
                          </div>
                          <RowMenu name={item.name} busy={busy} canUpdate={canUpdate} canDelete={canDelete}
                            onRename={() => setRenaming({ kind: 'competency', id: item.id })}
                            onUp={itemIndex > 0 ? () => reorder(moved(domain.competencies, itemIndex, -1), 'competency') : undefined}
                            onDown={itemIndex < domain.competencies.length - 1 ? () => reorder(moved(domain.competencies, itemIndex, 1), 'competency') : undefined}
                            onDelete={() => setDeleting({ kind: 'competency', id: item.id, name: item.name, count: item.evaluationCount ?? 0 })} />
                        </>
                      )}
                    </li>
                  ))}
                </ol>
                {canCreate ? (
                  <div className="pt-1">
                    <NameField mode="add" placeholder={t('competencies.catalog.addCompetency')} busy={busy}
                      onSubmit={(values) => act(() => actions.createCompetency({ ...values, domainId: domain.id }))} />
                  </div>
                ) : null}
              </div>
            </section>
          ))}

          {canCreate ? (
            <section className="flex flex-col gap-1.5 rounded-xl border border-dashed p-3">
              <Caption>{t('competencies.catalog.addDomain')}</Caption>
              <NameField mode="add" placeholder={t('competencies.catalog.domainPlaceholder')} busy={busy}
                onSubmit={(values) => act(() => actions.createDomain({ ...values, teacherAssignmentId }))} />
            </section>
          ) : null}
        </div>
      </NSheet>
      <NConfirmDialog
        open={!!deleting}
        onOpenChange={(next) => { if (!next && !busy) setDeleting(null); }}
        title={t('competencies.catalog.delete')}
        description={deleting ? t(deleting.kind === 'domain' ? 'competencies.catalog.deleteDomain' : 'competencies.catalog.deleteCompetency', { name: deleting.name, count: deleting.count }) : ''}
        confirmLabel={t('competencies.catalog.delete')}
        cancelLabel={t('competencies.catalog.cancel')}
        variant="destructive"
        loading={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
