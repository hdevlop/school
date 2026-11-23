'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn, NButton, NDialog } from 'najm-kit';
import { Check, IdCard, ImagePlus, Printer, Trash2 } from 'lucide-react';
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
import { buildTeacherDeskCards, type DeskCardClass, type DeskCardOptions, type DeskCardSubject, type DeskCardTeacher } from '../config/teacherDeskCards';

const BACKGROUNDS_KEY = ['desk-card-backgrounds'] as const;

/** The last background printed with (its file path, '' for plain), remembered in this browser only. */
const STORAGE_KEY = 'sms.teachers.deskCards.background';
const readChoice = () => {
  try { return window.localStorage.getItem(STORAGE_KEY) ?? ''; } catch { return ''; }
};
const saveChoice = (filePath: string) => {
  try { window.localStorage.setItem(STORAGE_KEY, filePath); } catch { /* the choice just isn't remembered */ }
};

/** An A4 page is 794 × 1123 CSS px; a card is its top half. The preview shows one card at this width. */
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PREVIEW_WIDTH = 560;
const PREVIEW_SCALE = PREVIEW_WIDTH / PAGE_WIDTH;

/**
 * Prints a half-A4 desk card for each teacher given: the selected ones, else
 * those the table shows. A dialog first previews the first card and lets the
 * user pick a background: plain paper or an image imported into the school's
 * file storage, which admins alone may import, list and delete.
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
  const canManage = viewer.role === 'admin';
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState('');
  const label = t('teachers.deskCards.button');

  const backgrounds = useQuery({
    queryKey: BACKGROUNDS_KEY,
    queryFn: getDeskCardBackgroundsApi,
    enabled: open && canManage,
  });
  const saved: DeskCardBackgroundFile[] = backgrounds.data ?? [];
  const selected = saved.find((item) => item.filePath === choice);

  const importBackground = useMutation({
    mutationFn: importDeskCardBackgroundApi,
    onSuccess: async () => {
      toast.success(t('teachers.deskCards.imported'));
      const list = await queryClient.fetchQuery({ queryKey: BACKGROUNDS_KEY, queryFn: getDeskCardBackgroundsApi });
      if (list[0]) setChoice(list[0].filePath);
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
    };
  };

  const example = sorted[0];
  const preview = open && example ? buildTeacherDeskCards([example], options()) : '';

  const choose = () => {
    if (!teachers.length) {
      toast.error(t('teachers.deskCards.none'));
      return;
    }
    setChoice(readChoice());
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
    setOpen(false);
    return printSchoolDocument(buildTeacherDeskCards(sorted, options()));
  };

  const busy = importBackground.isPending || removeBackground.isPending;
  const tile = (active: boolean) => cn(
    'group relative aspect-[1.414] overflow-hidden rounded-md border-2 bg-white transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active ? 'border-primary' : 'border-border hover:border-muted-foreground/50',
  );
  const tick = <Check aria-hidden="true" className="absolute end-1 top-1 size-5 rounded-full bg-primary p-0.5 text-primary-foreground" />;

  return (
    <>
      <NButton
        type="button"
        variant="outline"
        className="hidden h-10 md:inline-flex"
        aria-label={t('teachers.deskCards.hint')}
        title={t('teachers.deskCards.hint')}
        disabled={disabled}
        onClick={choose}
        leftIcon={<IdCard className="h-4 w-4" />}
      >
        {label}
      </NButton>
      <NDialog open={open} onOpenChange={setOpen} title={label} size="xl" showButtons={false}>
        <div className="space-y-4">
          {example && (
            <div
              className="relative mx-auto max-w-full overflow-hidden rounded-lg border bg-white shadow-sm"
              style={{ width: PREVIEW_WIDTH, height: Math.round((PAGE_HEIGHT / 2) * PREVIEW_SCALE) }}
            >
              <iframe
                title={label}
                srcDoc={preview}
                scrolling="no"
                tabIndex={-1}
                className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
                style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, transform: `scale(${PREVIEW_SCALE})` }}
              />
            </div>
          )}
          <fieldset className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <legend className="text-sm font-medium">{t('teachers.deskCards.background')}</legend>
              {canManage && (
                <>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => { pickFile(event.target.files?.[0]); event.target.value = ''; }}
                  />
                  <NButton
                    type="button"
                    variant="outline"
                    size="sm"
                    title={t('teachers.deskCards.importHint')}
                    loading={importBackground.isPending}
                    disabled={busy}
                    onClick={() => fileInput.current?.click()}
                    leftIcon={<ImagePlus className="h-4 w-4" />}
                  >
                    {t('teachers.deskCards.import')}
                  </NButton>
                </>
              )}
            </div>
            {backgrounds.isError && <p className="text-sm text-destructive">{t('teachers.deskCards.loadFailed')}</p>}
            <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto p-0.5 sm:grid-cols-4 lg:grid-cols-5">
              <button type="button" aria-pressed={!selected} onClick={() => setChoice('')} className={tile(!selected)}>
                <span className="absolute inset-x-0 bottom-0 bg-background/90 py-0.5 text-center text-xs">{t('teachers.deskCards.plain')}</span>
                {!selected && tick}
              </button>
              {saved.map((item) => {
                const active = item.filePath === selected?.filePath;
                return (
                  <div key={item.filePath} className="relative">
                    <button type="button" aria-pressed={active} onClick={() => setChoice(item.filePath)} className={cn(tile(active), 'w-full')}>
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
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">{t('teachers.deskCards.count', { count: teachers.length })}</p>
            <div className="flex gap-2">
              <NButton variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</NButton>
              <NButton onClick={print} disabled={busy} leftIcon={<Printer className="h-4 w-4" />}>{t('teachers.deskCards.print')}</NButton>
            </div>
          </div>
        </div>
      </NDialog>
    </>
  );
}
