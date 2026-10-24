'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NThemeImage } from 'najm-theme/react';
import { useTranslation } from 'najm-i18n/react';
import { ReliableThemeImage } from './ReliableThemeImage';

/**
 * The one frame every auth screen renders into — sign in, sign up, password
 * recovery, password reset, and first-login credential setup.
 *
 * Responsive background artwork and a hero build the whole layout:
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
 * Below `lg`, `auth-background-mobile.png` supplies portrait artwork with a
 * pale center for the form. The picture selects just one background to load.
 */
export function AuthFrame({ children }: { readonly children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-background">
      {/* Mirrored under `dir="rtl"`: the form moves to the other side of the
          page, and the pale field has to follow it. Dimmed rather than tinted
          in dark mode — this is light-key artwork, and at full strength it
          would put dark-theme foreground text on a white ground. */}
      <picture>
        <source media="(min-width: 64rem)" srcSet="/images/auth-background.png" />
        <img
          aria-hidden
          src="/images/auth-background-mobile.png"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover rtl:-scale-x-100 dark:opacity-[0.12]"
        />
      </picture>

      {/* `text-foreground` is not inherited from the document: nothing above
          this point sets a themed text colour, so bare text inside the frame
          would render black on a dark page. */}
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-[1600px] flex-col text-foreground lg:flex-row">
        <section className="flex w-full flex-col items-center justify-center px-6 py-10 sm:px-10 lg:w-[47%] lg:shrink-0 lg:px-14 xl:px-20">
          <div className="flex w-full max-w-[380px] flex-col">
            <div className="mb-8 flex justify-center">
              <NThemeImage
                slot="authLogo"
                className="h-32 w-32 shrink-0 object-contain sm:h-40 sm:w-40"
                alt={t('landing.nav.website')}
              />
            </div>

            {children}

            <Link href="/" className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} className="rtl:-scale-x-100" />{t('landing.nav.website')}</Link>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()}. {t('landing.footer.rights')}
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
