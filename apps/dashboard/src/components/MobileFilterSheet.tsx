'use client';

import type { ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { NButton, Sheet, SheetContent, SheetHeader, SheetTitle, useNPortalScope } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

export function FilterSummaryButton({ parts, onOpen }: { parts: string[]; onOpen: () => void }) {
  const { t } = useTranslation();
  const label = t('common.filters');
  return (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" aria-label={parts.length ? `${label}: ${parts.join(' · ')}` : label}
      className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/70 bg-card px-3 text-sm text-card-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <SlidersHorizontal aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span aria-hidden="true" className="min-w-0 flex-1 truncate text-start font-medium">
        {parts.length ? parts.map((part, index) => (
          <span key={index}>
            {index ? <span className="px-1 text-muted-foreground">·</span> : null}
            <bdi dir="auto">{part}</bdi>
          </span>
        )) : label}
      </span>
      <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export function MobileFilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function MobileFilterSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const { t } = useTranslation();
  const portal = useNPortalScope();
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent side="bottom" portalClassName={portal} aria-describedby={undefined}
        className="gap-0 rounded-t-2xl bg-background p-0 pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="border-b border-border/60 px-4 py-3">
          <SheetTitle className="text-base">{t('common.filters')}</SheetTitle>
        </SheetHeader>
        <div className="grid gap-3 p-4">
          {children}
          <NButton type="button" className="mt-1 w-full" onClick={onClose}>{t('common.close')}</NButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
