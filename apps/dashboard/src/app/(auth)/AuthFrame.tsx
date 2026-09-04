'use client';

import type { ReactNode } from 'react';
import { NThemeImage } from 'najm-theme/react';
import { useTranslation } from 'najm-i18n/react';
import { SCHOOL_APP_NAME } from '@/lib/appName';
import { ReliableThemeImage } from './ReliableThemeImage';

/**
 * The one frame every auth screen renders into — sign in, sign up, password
 * recovery, password reset, and first-login credential setup.
 *
 * Two images build the whole layout and nothing else paints a surface:
 *
 * - `auth-background.png` is the page itself, edge to edge. It carries a wide
 *   pale field on its leading side and the curve that divides it from the pink,
 *   so the artwork *is* the ground the form is read on. There is no card, panel,
 *   or ring on top of it: anything drawn there would cover the very edge the
 *   composition depends on, and the column split would stop lining up with the
 *   curve. The form sits inside the pale field, the illustration takes the pink.
 * - `auth-hero.png` is the illustration, resolved through the `authHeroImage`
 *   branding slot rather than by path, so a school replacing its hero replaces
 *   the illustration alone and never the ground under the form.
 *
 * Below `lg` the background is dropped rather than cropped, falling back to
 * `bg-background`. `object-cover` on a tall narrow box keeps the middle of a
 * wide image, which is exactly the curve, and would leave the form sitting on
 * the pink half.
 */
export function AuthFrame({ children }: { readonly children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-background">
      {/* Mirrored under `dir="rtl"`: the form moves to the other side of the
          page, and the pale field has to follow it. Dimmed rather than tinted
          in dark mode — this is light-key artwork, and at full strength it
          would put dark-theme foreground text on a white ground. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        aria-hidden
        src="/images/auth-background.png"
        alt=""
        className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover rtl:-scale-x-100 lg:block dark:opacity-[0.12]"
      />

      {/* `text-foreground` is not inherited from the document: nothing above
          this point sets a themed text colour, so bare text inside the frame
          would render black on a dark page. */}
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-[1600px] flex-col text-foreground lg:flex-row">
        <section className="flex w-full flex-col items-center justify-center px-6 py-10 sm:px-10 lg:w-[47%] lg:shrink-0 lg:px-14 xl:px-20">
          <div className="flex w-full max-w-[380px] flex-col">
            <div className="mb-8 flex flex-col items-center gap-2 text-center">
              <NThemeImage
                slot="authLogo"
                className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20"
                alt={SCHOOL_APP_NAME}
              />
              <span className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
                {SCHOOL_APP_NAME}
              </span>
            </div>

            {children}

            <p className="mt-8 text-center text-xs text-muted-foreground">
              {t('auth.page.rightsReserved', {
                year: new Date().getFullYear(),
                app: SCHOOL_APP_NAME,
              })}
            </p>
          </div>
        </section>

        <aside aria-hidden className="relative hidden flex-1 items-center justify-center px-8 py-10 lg:flex">
          <ReliableThemeImage
            slot="authHeroImage"
            alt=""
            className="max-h-[86svh] w-auto max-w-full object-contain"
          />
        </aside>
      </div>
    </div>
  );
}
