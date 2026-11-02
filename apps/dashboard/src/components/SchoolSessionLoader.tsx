'use client';

import { NThemeImage } from 'najm-theme/react';
import styles from './SchoolSessionLoader.module.css';

/** Shared by explicit sign-out and the shell's brief session-to-login transition. */
export function SchoolSessionLoader({ label }: Readonly<{ label: string }>) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={`${styles.screen} fixed inset-0 z-[9999] flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-foreground`}>
      <div aria-hidden="true" className="relative grid h-40 w-40 place-items-center">
        <span className="absolute inset-0 rounded-full border border-primary/15" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/30 motion-safe:animate-spin" />
        <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-white p-4 shadow-sm ring-1 ring-border/60">
          <NThemeImage slot="authLogo" alt="" className="h-[90px] w-[90px] object-contain" />
        </div>
      </div>
      <p className="text-center text-base font-medium tracking-wide">{label}</p>
    </div>
  );
}
