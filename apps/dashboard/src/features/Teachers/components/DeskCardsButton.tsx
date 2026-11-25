'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, NButton, NDialog, SegmentedControl,
  useResolvedToolbarLabels, useTableStore, type ContextMenuItem,
} from 'najm-kit';
import {
  CaseSensitive, Check, ChevronLeft, ChevronRight, IdCard, Image as ImageIcon, ImagePlus, List, ListChecks, Loader2, Printer, Trash2, Type, UserRound,
} from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { schoolApp } from '@/najm.config';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useSchoolPrintOptions } from '@/hooks/useSchoolPrintOptions';
import { printSchoolDocument } from '@/shared/schoolPrintDocument';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import {
  deleteDeskCardBackgroundApi, getDeskCardBackgroundsApi, importDeskCardBackgroundApi, type DeskCardBackgroundFile,
} from '@/services/deskCardBackgroundApi';
import {
  buildTeacherDeskCards, DESK_CARD_FONT_STACKS, DESK_CARD_FONTS, DESK_CARD_NAME_MODES, deskCardFontFaces, DESK_CARD_PARTS, DESK_CARD_TEXT_SIZES, deskCardDisplay,
  type DeskCardClass, type DeskCardDisplay, type DeskCardNameMode, type DeskCardOptions, type DeskCardSubject, type DeskCardTeacher, type DeskCardTextSize,
} from '../config/teacherDeskCards';

const BACKGROUNDS_KEY = ['desk-card-backgrounds'] as const;

/** Backgrounds shipped with School: offered to everyone, never deleted. The first is the default. */
const BUILT_IN_BACKGROUNDS = [
  { filePath: 'builtin:science', url: '/images/desk-cards/science.webp' },
  { filePath: 'builtin:stationery', url: '/images/desk-cards/stationery.webp' },
  { filePath: 'builtin:subjects', url: '/images/desk-cards/subjects.webp' },
  { filePath: 'builtin:ideas', url: '/images/desk-cards/ideas.webp' },
] as const;
const DEFAULT_CHOICE = BUILT_IN_BACKGROUNDS[0].filePath;

/** The last background printed with (a file path, a built-in, '' for plain), remembered in this browser only. */
const STORAGE_KEY = 'sms.teachers.deskCards.background';
const readChoice = () => {
  try { return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CHOICE; } catch { return DEFAULT_CHOICE; }
};
const saveChoice = (filePath: string) => {
  try { window.localStorage.setItem(STORAGE_KEY, filePath); } catch { /* the choice just isn't remembered */ }
};

/** What the cards show and how large, remembered in this browser only. */
const DISPLAY_KEY = 'sms.teachers.deskCards.display';
const readDisplay = () => {
  try { return deskCardDisplay(JSON.parse(window.localStorage.getItem(DISPLAY_KEY) ?? 'null')); } catch { return deskCardDisplay(null); }
};
const saveDisplay = (display: DeskCardDisplay) => {
  try { window.localStorage.setItem(DISPLAY_KEY, JSON.stringify(display)); } catch { /* the choice just isn't remembered */ }
};

/** An A4 page is 794 × 1123 CSS px; a card is its top half. */
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

/**
 * Prints a half-A4 desk card for each teacher given: the selected ones, else
 * those the table shows. A dialog first previews the first card and lets the
 * user pick a background: plain paper or an image imported into the school's
 * file storage, which a role with update:desk-card-backgrounds may import,
 * list and delete.
 */
export function DeskCardsButton({ teachers, classes, subjects, disabled }: {
  teachers: readonly DeskCardTeacher[];
  classes: readonly DeskCardClass[];
  subjects: readonly DeskCardSubject[];
  disabled?: boolean;
}) {
  const { t, language } = useTranslation();
  const { publicSettings } = usePublicSettings();
  const printOptions = useSchoolPrintOptions();
  const { viewingYear } = useViewingAcademicYear();
  const viewer = useViewerRole();
  // The permission the server's storage guard asks for (StorageManageGuard).
  const canManage = viewer.can('update:desk-card-backgrounds');
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState('');
  const [display, setDisplay] = useState<DeskCardDisplay>(() => deskCardDisplay(null));
  const changeDisplay = (change: Partial<DeskCardDisplay>) => setDisplay((current) => ({ ...current, ...change }));
  const label = t('teachers.deskCards.button');
  // The table's own print (the list as shown), found the way TablePrintButton finds it.
  const tableActions: ContextMenuItem[] = useTableStore.use.toolbarActions();
  const toolbarLabels = useResolvedToolbarLabels(useTableStore.use.toolbarLabels());
  const printLabel = toolbarLabels.print ?? 'Print';
  const printList = tableActions.find((action) => action.label === printLabel);

  const backgrounds = useQuery({
    queryKey: BACKGROUNDS_KEY,
    queryFn: getDeskCardBackgroundsApi,
    enabled: open && canManage,
  });
  const saved: DeskCardBackgroundFile[] = backgrounds.data ?? [];
  const selected = [...BUILT_IN_BACKGROUNDS, ...saved].find((item) => item.filePath === choice);

  const importBackground = useMutation({
    mutationFn: importDeskCardBackgroundApi,
    // Select the file just stored, by its own path: never "the newest in the list", which the storage cannot always order.
    onSuccess: async (filePath) => {
      toast.success(t('teachers.deskCards.imported'));
      await queryClient.fetchQuery({ queryKey: BACKGROUNDS_KEY, queryFn: getDeskCardBackgroundsApi });
      setChoice(filePath);
    },
    onError: () => toast.error(t('teachers.deskCards.importFailed')),
  });

  const removeBackground = useMutation({
    mutationFn: deleteDeskCardBackgroundApi,
    onSuccess: (_, filePath) => {
      if (choice === filePath) setChoice('');
      return queryClient.invalidateQueries({ queryKey: BACKGROUNDS_KEY });
    },
    onError: () => toast.error(t('teachers.deskCards.removeFailed')),
  });

  const sorted = useMemo(() => [...teachers].sort((a, b) => a.name.localeCompare(b.name, language)), [teachers, language]);

  const options = (): DeskCardOptions => {
    const { school, assetOrigin, accent } = printOptions({ title: '', date: '', details: [], columns: [] });
    return {
      subjects,
      classes,
      school: { name: settings?.schoolName || schoolApp.appName, nameAr: settings?.schoolNameAr, logo: school.logo },
      year: viewingYear ?? '',
      fallback: language === 'ar' ? 'ar' : 'fr',
      assetOrigin,
      accent,
      backgroundImage: selected?.url ?? null,
      display,
    };
  };

  // The teacher whose card the preview shows; the arrows go through them all.
  const [previewAt, setPreviewAt] = useState(0);
  const previewIndex = sorted.length ? Math.min(previewAt, sorted.length - 1) : 0;
  const example = sorted[previewIndex];
  const preview = open && example ? buildTeacherDeskCards([example], options()) : '';

  // The preview takes its column's width: the A4 page is drawn at full size and scaled down to it.
  // A callback ref: the dialog may mount its content after `open` changes.
  const [previewBox, setPreviewBox] = useState<HTMLDivElement | null>(null);
  const [previewWidth, setPreviewWidth] = useState(560);
  useLayoutEffect(() => {
    if (!previewBox) return;
    const measure = () => setPreviewWidth(previewBox.clientWidth || 560);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(previewBox);
    return () => observer.disconnect();
  }, [previewBox]);
  const previewScale = previewWidth / PAGE_WIDTH;
  const sectionTitle = 'flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground';

  const choose = () => {
    if (!teachers.length) {
      toast.error(t('teachers.deskCards.none'));
      return;
    }
    setChoice(readChoice());
    setDisplay(readDisplay());
    setPreviewAt(0);
    setOpen(true);
  };

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('teachers.deskCards.notImage'));
      return;
    }
    importBackground.mutate(file);
  };

  const print = () => {
    saveChoice(selected?.filePath ?? '');
    saveDisplay(display);
    setOpen(false);
    return printSchoolDocument(buildTeacherDeskCards(sorted, options()));
  };

  const busy = importBackground.isPending || removeBackground.isPending;
  const tile = (active: boolean) => cn(
    'group relative aspect-[1.414] w-28 shrink-0 overflow-hidden rounded-md border-2 bg-white transition-colors sm:w-32',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active ? 'border-primary' : 'border-border hover:border-muted-foreground/50',
  );
  const tick = <Check aria-hidden="true" className="absolute end-1 top-1 size-5 rounded-full bg-primary p-0.5 text-primary-foreground" />;

  return (
    <>
      {/* One print button for everything this page prints: the teachers list, then their desk cards. */}
      {/* Not modal: the desk-card dialog opens from an item, and a modal menu would leave the page locked behind it. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <NButton
            type="button"
            variant="outline"
            size="icon"
            className="hidden h-10 w-10 md:inline-flex"
            aria-label={printLabel}
            title={printLabel}
            disabled={disabled}
            leftIcon={<Printer className="h-4 w-4" />}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {printList && (
            <DropdownMenuItem onSelect={() => printList.onSelect?.()}>
              <List aria-hidden="true" className="size-4" />
              {t('teachers.deskCards.printList')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={choose} title={t('teachers.deskCards.hint')}>
            <IdCard aria-hidden="true" className="size-4" />
            {label}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NDialog open={open} onOpenChange={setOpen} title={label} width="6xl" showButtons={false}>
        {/* On a short screen the content scrolls and the Print bar below stays in view. */}
        <div className="grid max-h-[calc(100dvh-13rem)] gap-5 overflow-y-auto pe-1 lg:grid-cols-[minmax(0,1fr)_210px]">
          {/* The preview: one card at the column's width, any teacher's. */}
          <section className="flex min-w-0 flex-col gap-3" aria-label={t('teachers.deskCards.preview')}>
            <div
              ref={setPreviewBox}
              className="relative w-full overflow-hidden rounded-xl border bg-white shadow-sm"
              style={{ height: Math.round((PAGE_HEIGHT / 2) * previewScale) }}
            >
              {example && (
                <iframe
                  title={t('teachers.deskCards.preview')}
                  srcDoc={preview}
                  scrolling="no"
                  tabIndex={-1}
                  className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
                  style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, transform: `scale(${previewScale})` }}
                />
              )}
            </div>
            {sorted.length > 1 && (
              <div className="flex items-center justify-center gap-2">
                <NButton
                  type="button" variant="ghost" size="icon-sm" aria-label={t('common.previous')} title={t('common.previous')}
                  onClick={() => setPreviewAt((at) => (at - 1 + sorted.length) % sorted.length)}
                  leftIcon={<ChevronLeft className="size-4 rtl:rotate-180" />}
                />
                <p className="min-w-0 truncate text-sm text-muted-foreground" aria-live="polite">
                  <bdi dir="ltr" className="font-medium tabular-nums text-foreground">{previewIndex + 1} / {sorted.length}</bdi>
                  {example && <> · <bdi>{example.name}</bdi></>}
                </p>
                <NButton
                  type="button" variant="ghost" size="icon-sm" aria-label={t('common.next')} title={t('common.next')}
                  onClick={() => setPreviewAt((at) => (at + 1) % sorted.length)}
                  leftIcon={<ChevronRight className="size-4 rtl:rotate-180" />}
                />
              </div>
            )}

            {/* The paper, under the card it shows on. */}
            <fieldset className="mt-1 space-y-2.5">
              <legend className={sectionTitle}><ImageIcon aria-hidden="true" className="size-4" />{t('teachers.deskCards.background')}</legend>
              {backgrounds.isError && <p className="text-sm text-destructive">{t('teachers.deskCards.loadFailed')}</p>}
              {/* One row that scrolls sideways: more imports never make the dialog taller and push Print off screen. */}
              <div className="flex gap-2 overflow-x-auto p-0.5 pb-2 [scrollbar-width:thin]">
                <button type="button" aria-pressed={!selected} onClick={() => setChoice('')} className={tile(!selected)}>
                  <span className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">{t('teachers.deskCards.plain')}</span>
                  {!selected && tick}
                </button>
              {BUILT_IN_BACKGROUNDS.map((item) => {
                const active = item.filePath === selected?.filePath;
                return (
                  <button key={item.filePath} type="button" aria-pressed={active} onClick={() => setChoice(item.filePath)} className={tile(active)}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- a small static asset shown as-is */}
                    <img src={item.url} alt="" loading="lazy" className="size-full object-cover" />
                    {active && tick}
                  </button>
                );
              })}
              {saved.map((item) => {
                const active = item.filePath === selected?.filePath;
                return (
                  <div key={item.filePath} className="relative shrink-0">
                    <button type="button" aria-pressed={active} onClick={() => setChoice(item.filePath)} className={tile(active)}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- a stored upload, served by the API */}
                      <img src={item.url} alt="" loading="lazy" className="size-full object-cover" />
                      {active && tick}
                    </button>
                    <button
                      type="button"
                      aria-label={t('teachers.deskCards.remove')}
                      title={t('teachers.deskCards.remove')}
                      disabled={busy}
                      onClick={() => removeBackground.mutate(item.filePath)}
                      className="absolute bottom-1 start-1 rounded bg-background/90 p-1 text-destructive opacity-0 transition-opacity hover:bg-background focus-visible:opacity-100 group-hover:opacity-100 [div:hover>&]:opacity-100"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                    </button>
                  </div>
                );
              })}
              {canManage && (
                <>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => { pickFile(event.target.files?.[0]); event.target.value = ''; }}
                  />
                  <button
                    type="button"
                    title={t('teachers.deskCards.importHint')}
                    disabled={busy}
                    onClick={() => fileInput.current?.click()}
                    className="flex aspect-[1.414] w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-center text-xs sm:w-32 text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {importBackground.isPending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <ImagePlus aria-hidden="true" className="size-4" />}
                    {t('teachers.deskCards.import')}
                  </button>
                </>
              )}
            </div>
          </fieldset>
          </section>

          {/* What the card says. */}
          <div className="flex min-w-0 flex-col gap-5">
          <div className="space-y-2.5">
            <p className={sectionTitle}><UserRound aria-hidden="true" className="size-4" />{t('teachers.deskCards.display.names.label')}</p>
            <SegmentedControl<DeskCardNameMode>
              size="sm"
              value={display.names}
              ariaLabel={t('teachers.deskCards.display.names.label')}
              options={DESK_CARD_NAME_MODES.map((mode) => ({ value: mode, label: t(`teachers.deskCards.display.names.${mode}`) }))}
              onChange={(names) => changeDisplay({ names })}
            />
          </div>

          <div className="space-y-2.5">
            <p className={sectionTitle}><Type aria-hidden="true" className="size-4" />{t('teachers.deskCards.display.textSize.label')}</p>
            <SegmentedControl<DeskCardTextSize>
              size="sm"
              value={display.textSize}
              ariaLabel={t('teachers.deskCards.display.textSize.label')}
              options={DESK_CARD_TEXT_SIZES.map((size) => ({ value: size, label: t(`teachers.deskCards.display.textSize.${size}`) }))}
              onChange={(textSize) => changeDisplay({ textSize })}
            />
          </div>

          <fieldset className="space-y-2.5">
            <legend className={sectionTitle}><CaseSensitive aria-hidden="true" className="size-4" />{t('teachers.deskCards.display.font.label')}</legend>
            {/* Each choice in its own letters: the families the card uses, loaded here too. */}
            {open && <style>{deskCardFontFaces(window.location.origin)}</style>}
            <div className="grid grid-cols-2 gap-2">
              {DESK_CARD_FONTS.map((font) => {
                const stack = DESK_CARD_FONT_STACKS[font];
                const active = display.font === font;
                return (
                  <button
                    key={font}
                    type="button"
                    aria-pressed={active}
                    onClick={() => changeDisplay({ font })}
                    className={cn(
                      'flex flex-col items-center gap-0.5 rounded-md border px-2 py-1.5 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted',
                    )}
                  >
                    <span className="flex items-baseline gap-1.5 text-lg leading-tight">
                      <span style={{ fontFamily: stack.latin }}>Aa</span>
                      <span lang="ar" style={{ fontFamily: stack.arabic }}>أب</span>
                    </span>
                    <span className="text-xs">{t(`teachers.deskCards.display.font.${font}`)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2.5">
            <legend className={sectionTitle}><ListChecks aria-hidden="true" className="size-4" />{t('teachers.deskCards.display.shown')}</legend>
            {/* One tap each: a part on the card is a filled chip with a tick. */}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {DESK_CARD_PARTS.map((part) => {
                const shown = display[part];
                return (
                  <button
                    key={part}
                    type="button"
                    aria-pressed={shown}
                    onClick={() => changeDisplay({ [part]: !shown })}
                    className={cn(
                      'flex h-9 items-center gap-2 rounded-md border px-2.5 text-start text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      shown ? 'border-primary/40 bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <span className={cn('grid size-4 shrink-0 place-items-center rounded-sm border', shown ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>
                      {shown && <Check aria-hidden="true" className="size-3" />}
                    </span>
                    <span className="truncate">{t(`teachers.deskCards.display.parts.${part}`)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">{t('teachers.deskCards.count', { count: teachers.length })}</p>
          <div className="flex gap-2">
            <NButton variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</NButton>
            <NButton onClick={print} disabled={busy} leftIcon={<Printer className="h-4 w-4" />}>{t('teachers.deskCards.print')}</NButton>
          </div>
        </div>
      </NDialog>
    </>
  );
}
