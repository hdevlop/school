# Public school landing page — plan

Status: **implemented locally; Public school page and Visit requests dashboard
entries are removed and both dashboard pages return not found by user request**
(2026-10-11). The public `/welcome` page remains available. Current non-browser
validation and the scope of historical evidence are recorded in
[docs/evidence/landing/README.md](docs/evidence/landing/README.md).

Reference design: [docs/design/landing-page-reference.png](docs/design/landing-page-reference.png)
(third image-model iteration). It is a **design reference, not a spec**: where
this plan and the picture disagree, the plan wins. In particular the picture
hard-codes numbers, testimonials and a school name that a real installation
must own (see the product rules below).

## Goal

Every School installation gets a public page that **presents the school that
runs MyScolAI** to prospective and current parents: who the school is, what it
teaches, how parents follow their child through the platform, where it is, and
how to request a visit. MyScolAI appears only as "Powered by MyScolAI".

One codebase serves many schools, so nothing on the page is specific to the
mockup's "Al Nour International School". Everything school-specific comes from
data the school already owns (settings, cycles, branding) or owns after Phase 3
(landing content).

### Product rules

1. **No invented school facts.** School statistics, quotes and admissions
   claims require school-entered content. Student counts, "98% bac success",
   testimonials, admissions-open status and the admissions year render **only** when configured
   (Phase 3). Until then those sections are omitted, not filled with samples.
2. **No live private data on a public page.** Hero ornaments and the product
   showcase are illustrations (feature labels, real screenshots of the demo
   database), never this school's attendance, grades or fees. Demo screenshots
   and the static assistant transcript have a visible translated "Illustrative
   demo — sample data" caption. Their sample numbers are an explicit exception
   to rule 1 and never appear as school statistics or live results. Factory
   photography has a visible "Illustrative photography" disclosure until
   replaced with school-owned photos.
3. **Signed-out first.** The page works with no session, no academic year and
   no settings row (fresh install → the school name falls back to
   `schoolApp.appName`, contact blocks hide).
4. **Same app, same contracts.** The page lives in `apps/dashboard`, inside the
   one `NajmAppProvider`, reads the one preference source, and uses the shared
   catalog in all four languages, with Arabic rendered right-to-left.
5. **Only supported capabilities.** The feature tour describes attendance
   records, grades/report cards, timetables/exams, fees/payment records,
   transport arrangements and announcements. The current source supports
   recorded payments and route assignments; online checkout and live bus GPS
   tracking were not found. Do not copy those two promises from the image.

## Decisions

These decisions govern implementation. Change this plan first if a Phase 0
check disproves a contract or an implementation needs a different approach.

| # | Decision | Chosen | Why |
|---|---|---|---|
| D1 | URL | `/welcome`, added to `publicRoutes`, and anonymous visitors at `/` are sent there (D7) | `/` stays the dashboard home (`app/(dashboard)/page.tsx`), so no dashboard link moves. A parent typing the school's domain still lands on the school page. |
| D2 | Where it lives | Route group `app/(public)/welcome` + feature `features/Landing` | Keeps the auth group's "signed-in → redirect" rule away from the landing page, and follows the feature-module pattern. |
| D3 | Server vs client | Server section composition; client islands for nav/language controls, the visit form and the Phase 3 branding image adapter; existing Najm UI primitives retain their library boundaries | Data is read server-side through `@sms/server` exports. Keep interactivity and branding consumption in small leaves. |
| D4 | Public data reads | Narrow loader functions exported from `@sms/server` (like `loadSchoolUiSettings`), **no new public GET route** | Avoids widening `PUBLIC_ROUTES`. `GET /api/settings/public` stays behind sign-in. |
| D5 | Photos | Factory images in `public/images/landing/` (Phase 1), then extra najm-theme **branding slots** (Phase 3) so each school uploads its own | Branding is already a slot registry. `NThemeBrandingSettings` renders every registered slot, so no new upload UI is needed. |
| D6 | Visit form backend | New domain module `visitRequests`, `POST` marked `@Public()` + `@RateLimit` + honeypot; reads guarded by `@Can('read:visit-requests')` | Follows "every route states its guard". It is the only new public route. |
| D7 | Anonymous `/` | **Required** (Phase 1b). Add an `anonymousRedirects` option to the auth policy upstream in najm-auth and najm-next, publish, bump the pins, then set `{ '/': '/welcome' }` in `schoolApp.auth` | "One auth definition": route decisions belong to `schoolApp.auth`, not to custom code in `proxy.ts`. You own Najm, so the upstream change is the clean path. |
| D8 | Fonts | **Lora**, the app's font from `app/layout.tsx` and `theme.json`; `.landing` sets no font of its own | The school asked for one font across the app and the public page. A separate landing font (Readex Pro) was tried and removed. |
| D9 | Colors | Scoped aliases of existing theme tokens, with the mapping below; preserve the image's light/dark section rhythm | School's factory primary is purple and secondary is orange. Exact navy/teal reproduction is not promised; the reference's composition uses School's palette. Test light/dark contrast explicitly. |
| D10 | Testimonial portraits | Initials avatars (`NAvatar`), no uploaded photos | No personal photos of parents on a public page. |
| D11 | Language URLs and SEO | One canonical `/welcome`, with cookie-based language switching; no `alternates.languages` or sitemap language alternates | Four cookie states are not four crawlable URLs. Localized public routes require a separate routing decision. |
| D12 | Program photos | Phase 1 uses a neutral default photo. Phase 3 persists cycle-ID-to-branding-slot assignments | Reordering, disabling or creating a cycle must not silently change another program's photo. Three upload slots can be reused; unassigned cycles retain the default. |

## Visual contract

Follow the reference's composition, with the content adaptations in the product
rules. Compare a fully configured demo page against the image; an empty
installation intentionally omits school facts and contact blocks.

- A shared inner container is at most 1200 px wide, centered, with 24 px inline
  gutters at 768 px and above and 16 px below. Full-width bands share this inner
  alignment. Section padding is 48–64 px on desktop and 32 px on mobile;
  card/device gaps are 16–24 px. Use 12–16 px card corners and quiet shadows.
- Desktop composition starts at 1024 px. Between 768–1023 px use two-column
  grids where appropriate; below 768 px use the mobile arrangement below.
  Heading sizes are 48–64 px for the desktop hero, 32–40 px for mobile hero,
  and 28–40 px for section headings, with comfortable Arabic line height.

| Section | Desktop reference composition | Mobile behavior |
|---|---|---|
| Navigation | Compact logo/name, section anchors, language control, portal CTA; sticky 64–80 px header | 64 px header, logo, language control and menu trigger; anchors/portal in the sheet |
| Hero (`#about`) | Copy/photo split about 45:55, accent phrase and two CTAs; photo crop roughly 4:3 with a large rounded top-start corner, not the assistant's pointed arch; two restrained floating feature cards | Copy and CTAs, then photo; keep ornaments inside the image bounds; wrap CTAs without overflow |
| Stats | Full-width dark rounded strip immediately after the hero, four equal icon/value/label cells when configured | Two columns; one or two configured items fill available cells; no empty placeholders |
| Features (`#parents`) | Six light cards in a 3×2 grid, icon beside short title/body | One column, two at tablet widths |
| Platform showcase | Full-width pale tinted band, centered heading; laptop occupies about three quarters of the device row with a phone beside it; powered-by and demo caption below | Stack or overlap devices within the container without clipping; preserve screenshot aspect ratios |
| Assistant | Copy, phone transcript and pointed-arch parent photo in a 40:25:35 row; language pills wrap naturally | Copy, transcript, then photo; Darija bubbles stay RTL in every interface language |
| Programs (`#programs`) | Three equal image cards per row, 16:9 image area, title/subtitle and directional link | Two columns on tablet, one on mobile; additional cycles form new rows |
| Testimonials | Two cards per row with initials avatar, configured rating, quote and author | One column; a third configured testimonial wraps to the next row |
| Admissions/contact (`#contact`) | Full-width dark patterned band; map/address and contact/form in a 50:50 split | Stack map/address above contact/form; no empty map column when location is absent |
| Footer | Logo/name, contact and optional social/powered-by groups aligned to the same grid | Stack groups; hide absent contact/social fields |

`features/Landing/landing.css` owns presentation aliases under `.landing`:

| Alias | Source | Use |
|---|---|---|
| `--landing-ink` | `var(--tertiary)` | Headings and structural emphasis |
| `--landing-action` / `--landing-on-action` | `var(--primary)` / `var(--primary-foreground)` | Accent phrase, buttons and feature icons; buttons use the paired foreground |
| `--landing-band` / `--landing-on-band` | `var(--tertiary)` / `var(--tertiary-foreground)` | Stats and admissions bands |
| `--landing-tint` | `color-mix(in oklab, var(--primary) 8%, var(--background))` | Platform background and language pills |
| Card/body/muted text | Existing `--card`, `--card-foreground`, `--foreground`, `--muted-foreground` | Preserve School's theme contract |

Use readable foreground tokens for small labels if an accent fails contrast.
Dark mode and custom themes require the same contrast checks as light mode.
Do not add another provider or change the dashboard's factory palette.

The scroll owner sets `scroll-padding-block-start` to header height + 16 px;
anchor targets use a compatible `scroll-margin-block-start`. The skip link
targets `<main id="landing-main" tabIndex={-1}>` and moves focus there. Mirror
column order and directional corners/arrows for Arabic, while keeping faces,
logos and screenshot contents unflipped.

## Architecture

```
Browser ──GET / (no session, no refresh cookie)──▶ proxy.ts ──302──▶ /welcome   (Phase 1b, D7)
Browser ──GET /welcome──▶ proxy.ts (composeNajmProxy)
                           └─ '/welcome' ∈ publicRoutes → continue, CSP + nonce set
app/layout.tsx  (loadUiSnapshot: language, theme, direction; unchanged)
└─ app/(public)/layout.tsx      scroll container + landing font + .landing scope
   └─ app/(public)/welcome/page.tsx   (server component)
        ├─ getSession()                      → "Parent portal" vs "Open dashboard"
        ├─ loadSchoolLandingProfile()  ◀── @sms/server  (settings: name, address, lat/lng, phone, email, website)
        ├─ loadLandingCycles()         ◀── @sms/server  (active cycles: id, name, labels, sortOrder)
        ├─ loadSchoolLandingContent()  ◀── @sms/server  (Phase 3: stats, testimonials, blurbs, photo assignments, admissions)
        └─ <LandingPage data=… />  features/Landing/components/*
              └─ <VisitRequestForm/> (client) ──POST /api/visit-requests──▶ VisitRequestController (@Public, @RateLimit)
```

Dashboard side (Phase 2/3): `/visit-requests` inbox, `/public-page` content
editor, both inside `(dashboard)` and gated by `PAGE_ACCESS`.

## File map

New (✚) and changed (✎). Paths are from the repository root.

```
Desktop\najm (upstream, Phase 1b)
  packages/najm-auth/src/client/server/defineAuth.ts          ✎ anonymousRedirects option + validation
  packages/najm-auth/src/client/server/withAuthMiddleware.ts  ✎ apply it before redirectToLogin
  packages/najm-next/src/app.ts                               ✎ accept + assert it in the app auth policy
  tests in both packages                                      ✚

package.json                                        ✎ Phase 1b exact pins + Phase 2/3 test scripts
all workspaces declaring najm-auth / najm-next       ✎ Phase 1b matching exact pins
apps/dashboard/src/
  najm.config.ts                                    ✎ publicRoutes += '/welcome'; anonymousRedirects (1b)
  app/(public)/layout.tsx                           ✚ scroll container, font, .landing
  app/(public)/welcome/page.tsx                     ✚ data loading + generateMetadata
  app/layout.tsx                                   ✎ Phase 4 only if public pinch zoom needs a root viewport fix
  app/robots.ts                                    ✚ Phase 4 public page/render-asset rules
  app/sitemap.ts                                   ✚ Phase 4 single canonical public URL
  app/(auth)/AuthFrame.tsx                          ✎ "← School website" link to /welcome
  features/Landing/
    landing.css                                    ✚ scoped visual/font tokens and responsive rules
    components/LandingPage.tsx                      ✚ section composition
    components/LandingNav.tsx                       ✚ client: sticky nav, mobile sheet, NLanguageMenu
    components/HeroSection.tsx                      ✚
    components/StatsStrip.tsx                       ✚ Phase 3 data; renders nothing if empty
    components/FeatureGrid.tsx                      ✚ reuses shared/featureIcons.ts
    components/PlatformShowcase.tsx                 ✚ CSS laptop + phone frames around screenshots
    components/AssistantShowcase.tsx                ✚ static chat transcript, dir="rtl" bubbles
    components/ProgramsSection.tsx                  ✚ one card per active cycle
    components/TestimonialsSection.tsx              ✚ Phase 3 data; renders nothing if empty
    components/AdmissionsSection.tsx                ✚ map + contact / form
    components/SchoolMap.tsx                        ✚ Google Maps embed iframe (lazy)
    components/LandingImage.tsx                     ✚ Phase 3 optimized branding photo adapter
    components/VisitRequestForm.tsx                 ✚ client, Phase 2
    components/LandingFooter.tsx                    ✚
    config/landingSections.ts                       ✚ nav anchors, feature list (keys + icons)
    config/landingSchemas.ts                        ✚ visit form schema (Phase 2)
    config/landingOptions.ts                        ✚ cycle select builder taking t (Phase 2)
    config/landingContentSchemas.ts                 ✚ content editor schema (Phase 3)
  features/VisitRequests/                           ✚ Phase 2 inbox (Table, Card, hook, config/)
  features/PublicPage/                              ✚ Phase 3 content editor
  app/(dashboard)/visit-requests/{layout,page}.tsx  ✚ Phase 2
  app/(dashboard)/public-page/{layout,page}.tsx     ✚ Phase 3
  services/visitRequestApi.ts                       ✚ Phase 2
  services/landingContentApi.ts                     ✚ Phase 3
  shared/pageAccess.ts                              ✎ visitRequests, publicPage
  shared/DashboardShell/index.tsx                   ✎ nav items
  shared/featureIcons.ts                            ✎ visitRequests, publicPage icons
apps/dashboard/public/images/landing/               ✚ factory photos + screenshots (webp)
apps/dashboard/tests/features/Landing/              ✚ schema + option tests

packages/contracts/src/enums.ts                     ✎ VISIT_REQUEST_STATUS_VALUES
packages/contracts/tests/enums.test.ts              ✎ pin the new tuple
packages/contracts/src/locales/{en,fr,ar,es}.json   ✎ landing.*, visitRequests.*, publicPage.*

packages/server/src/landing.ts                      ✚ loadSchoolLandingProfile, loadLandingCycles, loadSchoolLandingContent
packages/server/src/index.ts                        ✎ export the loaders
packages/server/src/shared/enums.ts                 ✎ zod adapter for the new tuple
packages/server/src/modules/visitRequests/          ✚ Phase 2 (Schema, Dto, Repository, Validator, Service, Controller, index)
packages/server/src/modules/landing/                ✚ Phase 3 (Schema, Dto, Repository, Service, Controller, index)
packages/server/src/modules/index.ts                ✎ load both modules
packages/server/src/database/schema/index.ts        ✎ export both new tables before db:generate
packages/server/src/database/migrations/             ✚ reviewed Phase 2/3 migrations
packages/server/src/config/themeConfig.ts           ✎ Phase 3 brandingSlots
packages/server/tests/visitRequests/                ✚
packages/server/tests/landing/                      ✚ loaders/content DTOs/photo assignments
packages/server/tests/acceptance/RouteSecurityTransport.test.ts  ✎ PUBLIC_ROUTES += 'POST /api/visit-requests'
packages/seed/src/scripts/admin/data/permissions.json      ✎ read/update:visit-requests
packages/seed/src/scripts/admin/data/rolePermissions.json  ✎ admin, principal, secretary
```

---

## Phase 0 — verify before coding

1. Load the `najm` skill. Read Najm source under `Desktop\najm\packages\<pkg>\src`,
   never `node_modules`. Confirm the pinned versions in the root `package.json`
   (review snapshot: `najm-auth 6.3.0`, `najm-next 0.10.0`, `najm-theme 0.3.1`,
   `najm-kit 3.2.2`, `najm-rate 3.1.0`). Compare each local source manifest to
   the current root pin; report a mismatch before relying on that source.
2. Confirm route matching: `withAuthMiddleware` checks `publicRoutes` **before**
   `protectedRoutes` (`najm-auth/src/client/server/withAuthMiddleware.ts`), so
   adding `'/welcome'` is enough even though `'/:path*'` is protected.
3. Signed-out side effects: `app/layout.tsx` mounts `AcademicYearSelectionOwner`
   and `NajmClientRoot` on every page. Open `/login` signed out on the dev
   server (:3102, demo DB) and confirm in the network panel that they make no
   failing authenticated calls. `/welcome` inherits the same behavior.
4. `NLanguageMenu` is presentation-only and requires an `onChange` callback.
   Wire it to the existing preference command/provider language setter,
   persist `school-ui-language`, then refresh the server render so headings,
   metadata and direction update too. Signed-out changes must not call
   `POST /api/users/lang/:language`. Verify the callback, not just the menu.
5. Confirm the CSP allows the map: `csp.frameSrc` already includes
   `https://www.google.com`. The embed URL is
   `https://www.google.com/maps?q=<lat>,<lng>&z=15&output=embed`, which needs no API key.
6. Note the root `<body>` has `h-screen w-screen overflow-hidden`. The public
   layout must own its scroll container (Phase 1, step 2).
7. Recheck the six advertised capabilities against current source. Use the
   conservative copy in product rule 5 unless a working parent-facing flow
   proves a stronger promise. Confirm Phase 3's optimized branding adapter
   can read custom slots from the existing root branding snapshot.

**Gate:** items 2–7 are confirmed or the plan is adjusted before Phase 1.

## Phase 1 — public route and static sections (shippable)

Outcome: `/welcome` renders the school's own name, logo, programs, feature
tour, assistant showcase, map and contact details, in four languages, on
desktop and mobile, signed in or out. No stats, testimonials or form yet.

1. **Route.** Add `'/welcome'` to `schoolApp.auth.publicRoutes`. Nothing else in
   the auth definition changes.
2. **Layout** `app/(public)/layout.tsx`:
   - `<div className="landing h-svh overflow-y-auto scroll-smooth bg-background text-foreground">`.
     Anchors (`#programs`, `#contact`) scroll inside this container.
   - Imports the scoped `landing.css`. It inherits the app font (Lora, D8)
     and loads no font of its own. Does **not** call `requireSession` or
     redirect signed-in users.
   - `motion-reduce:scroll-auto`.
3. **Server loaders** `packages/server/src/landing.ts`, exported from
   `packages/server/src/index.ts`, following `uiSettings.ts`:
   - `loadSchoolLandingProfile()` selects **only** `schoolName, schoolAddress,
     schoolAddressLatitude, schoolAddressLongitude, schoolPhone, schoolEmail,
     schoolWebsite` from the latest settings row. Returns `null` on a fresh
     install. It must never spread the admin row.
   - `loadLandingCycles()` returns active cycles ordered by `sortOrder`:
     `id, name, labels`. Cycles are not year-scoped (not in
     `config/yearScope.ts`), so the read is safe outside a request scope.
     Re-check this if cycles are ever migrated to year history.
   - Never read year-scoped repositories here. They throw outside the scope, and
     live counts are a Phase 3 content decision anyway.
4. **Page** `app/(public)/welcome/page.tsx` (server component):
   - `const [session, profile, cycles] = await Promise.all([getSession(), …])`,
     using `getSession` from `@/najm.server` (shared resolution, never
     `auth.getSession()`). Loaders are imported with `await import('@sms/server')`,
     as `(dashboard)/layout.tsx` does.
   - `generateMetadata`: title `"<schoolName> — <landing.meta.tagline>"`,
     description, Open Graph image `/images/landing/og.webp`, and canonical
     `/welcome`. Use the existing `NEXT_PUBLIC_APP_URL` as `metadataBase`;
     validate its origin for the installation. No language alternates (D11).
   - Renders `<LandingPage …/>` with plain serializable props.
5. **Sections** (`features/Landing/components`), matching the reference top to bottom:

   | Section | Content and data | Kind |
   |---|---|---|
   | `LandingNav` | `NThemeImage slot="authLogo"` + school name; anchors About, Programs, Parents (features), Contact; EN·FR·AR·ES; **Parent portal** → `/login`, or **Open dashboard** → `/` when `session` exists. Below `md`: a menu button opening an `NSheet`. Sticky inside the scroll container. | client |
   | `HeroSection` | `#about`; `landing.hero.titleStart` + accented `landing.hero.titleAccent`, subtitle, buttons **Request a visit** (→ `#contact`) and **Our programs** (→ `#programs`). Hide a CTA whose target section is absent. Asymmetrically rounded photo `hero.webp`. Two ornament cards with **feature labels only** ("Attendance records", "Grades and report cards"), no live-event wording or figures. | server |
   | `StatsStrip` | Phase 3 only, directly after the hero; omitted entirely when there are no configured statistics. | server |
   | `FeatureGrid` | `#parents`; six cards from `config/landingSections.ts`, reusing `FEATURE_ICONS` for attendance, grades, classRoutines, fees, transport, announcements. Copy follows product rule 5. | server |
   | `PlatformShowcase` | Heading "One platform for the whole school". CSS laptop and phone frames around **real screenshots** `product-dashboard.webp` / `product-parent.webp` captured from the demo DB, with visible sample-data caption. "Powered by MyScolAI". | server |
   | `AssistantShowcase` | Static transcript: parent question and reply in Darija (`dir="rtl"` on the bubbles, `lang="ar"`), a small CSS sparkline, visible sample-data caption, language pills العربية · الدارجة · Français · English · Español. Parent photo `assistant.webp` uses a pointed arch. Not wired to `/api/chat`, which requires sign-in. | server |
   | `ProgramsSection` | `#programs`; one card per active cycle: current-language label (`labels?.[lang] ?? name`), neutral `program-default.webp` until Phase 3 assigns a photo slot by cycle ID, generic subtitle key. Each card links to `#contact` with a translated accessible label naming its cycle; omit the arrow if contact is absent. Hidden when there are no cycles. | server |
   | `TestimonialsSection` | Phase 3 only, after programs; configured quotes and ratings, initials avatars; omitted entirely when empty. | server |
   | `AdmissionsSection` | `#contact`; dark band using `--landing-band` and its paired foreground, low-opacity zellige SVG. Lazy map iframe (`title`, `referrerPolicy="no-referrer-when-downgrade"`) when both coordinates exist; otherwise address text. Phase 1 shows **contact actions** (`tel:`, `mailto:`, WhatsApp `https://wa.me/<digits>` for Moroccan mobile), with neutral **Request a visit** heading. Hide it if there is no contact/location data; Phase 2's form can keep it visible. Only Phase 3's explicit open status enables admissions-open wording. | server |
   | `LandingFooter` | Logo, address, phone, email, website, © year + school name, "Powered by MyScolAI" (`schoolApp.appName`). Social links are omitted until Phase 3 adds them. | server |

6. **Assets** in `apps/dashboard/public/images/landing/`, served outside the
   proxy (its matcher skips `images`): `hero.webp`, `assistant.webp`,
   `program-1..3.webp`, `program-default.webp`, `product-dashboard.webp`,
   `product-parent.webp`, `og.webp`, `zellige.svg`. Generate photos with the
   image model, one subject per image, so no face repeats across the page.
   Capture screenshots at 2× from the dev server on :3102 with the demo DB.
   Use `next/image` with explicit dimensions (or a fixed-ratio fill container),
   responsive `sizes` and hero-only eager/high-priority delivery using the
   installed Next image API. All other photos are lazy. Preserve this contract
   for Phase 3 uploads through `LandingImage`; do not replace photos with plain
   `<img>` tags. Logo rendering can keep `NThemeImage`. The public asset URLs
   serve optimized formats according to the existing Najm Next configuration.
7. **RTL.** Use logical utilities only (`ms-*`, `me-*`, `ps-*`, `text-start`,
   `rtl:-scale-x-100` on arrows only), as `AuthFrame.tsx` does. Mirror the hero
   column order and corner treatment under `dir="rtl"`; do not flip the photo,
   logos, text, charts or screenshots.
8. **Translations.** Add `landing.*` to all four catalogs: `meta`, `nav`,
   `hero`, `features.items.<key>.{title,body}`, `platform`, `assistant`
   (the Darija sample is the same text in every catalog), `programs`,
   `admissions`, `contact`, `footer`, demo/photo disclosures and cycle CTA labels.
   Run `bun run i18n:check`. Keep copy
   short and concrete, with no superlatives the school has not claimed itself.
9. **Login link back.** `AuthFrame.tsx` gets a small "← School website" link to
   `/welcome` (catalog key, logical arrow).

**Checks:** `bun run lint`, `bun run typecheck`, `bun run i18n:check`,
`bun run test:boundaries` (client islands import `@sms/contracts` only),
`bun run build`. Browser on :3102: signed out and signed in; en, fr, ar, es;
390px, 768px and 1440px; light and dark; no console errors; no failed requests.
Compare the section composition with the visual contract and confirm absent
sections leave no dangling nav anchors/CTAs. Phase 1 loader tests go in
`packages/server/tests/landing/`; add
`"test:landing": "bun test packages/server/tests/landing"` to root scripts
and the aggregate `test` command so `bun run check` actually runs them.

## Phase 1b — anonymous visitors at `/` (D7)

Outcome: someone with no session and no refresh cookie who opens `/` lands on
`/welcome`. Everyone else is unaffected: a signed-in user gets the dashboard,
and a returning user with only a refresh cookie still goes through session
recovery.

**Upstream release dependency:** implement Phase 1b's package change as a
separate Najm task. `Desktop\najm` stays read-only during School work under
the repository guide. School consumes the resulting published versions; this
plan update does not authorize package edits or publication.

**In that Najm task:**

1. `najm-auth` `defineAuth`: add
   `anonymousRedirects?: Readonly<Record<string, string>>` (exact path → target).
   It throws at definition time when a target is not matched by `publicRoutes`
   (that would loop) or when a key is itself public.
2. `withAuthMiddleware`: after the `publicRoutes` and `isProtected` checks, if
   the request carries **neither** the session cookie **nor** the refresh
   cookie and `anonymousRedirects[pathname]` exists, redirect there with no
   `from` parameter. Every other branch is unchanged. In particular, a present
   refresh cookie still goes through recovery, and a failed recovery still goes
   to `loginRoute`.
3. `najm-next` `app.ts`: accept the field in the app auth policy, validate it
   with `assertRoute` on both sides, and pass it through to `defineAuth`.
4. Tests in both packages:
   - anonymous `/` → 302 `/welcome`;
   - anonymous `/students` → `/login?from=/students` (unchanged);
   - `/` with a refresh cookie → recovery (unchanged);
   - `/` with a valid session → continues;
   - a non-public target → definition throws.
5. Publish with the repo's scripts (`bun scripts/publish-package.ts najm-auth --minor`,
   then `najm-next --minor`), never `npm publish` directly.

**In School:**

6. Bump `najm-auth` and `najm-next` in the root and every workspace that
   declares them to the same exact published versions. The root `overrides`
   already reference them with `$najm-auth` / `$najm-next`. Run `bun install`
   and `bun run test:boundaries` (pin check). Verify registry availability and
   compare the new pins with the read-only reference manifests.
7. Add `anonymousRedirects: { '/': '/welcome' }` to `schoolApp.auth` in
   `najm.config.ts`.
8. Extend `RouteSecurityTransport` or a proxy unit test to cover the three cases
   above against School's real `proxy.ts`.

**Checks:** `bun run check`. Browser: a private window at `/` lands on
`/welcome`; after signing in, `/` is the dashboard; after signing out, `/`
lands on `/welcome` again.

## Phase 2 — visit requests

Outcome: parents submit "Book a visit". Staff see the requests in the dashboard
inbox and are notified.

### Contracts

- `VISIT_REQUEST_STATUS_VALUES = ['new', 'contacted', 'scheduled', 'closed'] as const`
  and `VisitRequestStatus` in `packages/contracts/src/enums.ts`. Pin the exact
  members and order in `packages/contracts/tests/enums.test.ts`. Add the zod
  adapter in `packages/server/src/shared/enums.ts`. Add missing `status.<value>`
  catalog keys so `NBadge` resolves labels.

### Server module `packages/server/src/modules/visitRequests/`

Full domain module.

- **Schema** `visit_requests`: `id` (nanoid(5), system entity), `parentName`,
  `phone`, `email` (nullable), `cycleId` (nullable FK → cycles, `on delete set null`),
  `message` (nullable, ≤ 1000), `language` (language enum), `status`
  (default `new`), `handledBy` (nullable FK → users), `staffNote` (nullable),
  `createdAt`, `updatedAt`. Index on `(status, createdAt)`. Export the table
  from `packages/server/src/database/schema/index.ts` **before** running
  `bun run db:generate`: that is Drizzle's configured schema entry point.
  Review the generated migration and apply it with `bun run db:migrate` to
  the authorized development database before testing persistence. Production
  migration/release is a separate execution step; never use `db:push:force`.
- **Not year-scoped.** An enquiry is not academic history. Do not register it in
  `config/yearScope.ts`. Record this decision in the module's `index.ts` header.
- **Dto:**
  - `createVisitRequestDto`: `parentName` 2–120, `phone` (reuse the parent
    DTO's phone rule), `email` optional, `cycleId` optional, `message` optional
    ≤ 1000, and `website: z.string().max(1000).optional()` as a **honeypot**.
    Preserve a filled value through validation; do not refine it to empty or
    strip it. Wrong types and oversized strings are ordinary validation errors.
    `language` is not in the body. The service reads it from `X-Language`
    through najm-i18n.
  - `updateVisitRequestDto`: `status`, `staffNote`.
- **Validator:** `ensureActiveCycle(cycleId)`, `ensureExists(id)`. Refusals use
  catalog keys (`visitRequests.errors.*`), never English literals
  (`test:server-i18n`).
- **Service:**
  - `create`: first, if `website` is a non-empty string (including whitespace),
    return the same 201 `{ received: true }` success shape **without** cycle
    lookups, writes, events or notifications. Otherwise remove `website` from
    the persistence input, validate the selected cycle, insert and emit
    `visitRequest.created`.
  - `list` (filter by status), `update` (sets `handledBy` from `@User('id')`).
- **Notification:** an `@On('visitRequest.created')` handler adds one in-app
  notification per user holding `read:visit-requests`. Use a new
  `PersonalNotificationService` method modelled on `createFinancialReminder`,
  with recipient lookup in its repository. Email
  through najm-email is optional, behind a setting, and out of scope for this phase.
- **Controller** `@ToolGroup('visit-requests')` + `@Controller('/visit-requests')`:

  | Route | Guards | Notes |
  |---|---|---|
  | `POST /` | `@Public()`, `@RateLimit({ limit: 5, window: '1h' })`, `@Validate(createVisitRequestDto)` | No `@McpTool`. `@ResMsg({ message: 'visitRequests.success.received', status: 201 })`. Returns `{ received: true }` only, never the row. |
  | `GET /` | `@Can('read:visit-requests')` | `@McpTool` read-only, for the assistant and operator. |
  | `PUT /:id` | `@Can('update:visit-requests')` | Status and note only. |

- Load the module in `packages/server/src/modules/index.ts`.
- Add `"test:visit-requests": "bun test packages/server/tests/visitRequests"`
  to the root scripts and include it in the aggregate `test` command. Unit
  DTO/service tests belong there; real HTTP/limiter assertions belong in
  `RouteSecurityTransport.test.ts`, which `test:security:transport` runs.
- **Permissions:** add `read:visit-requests` and `update:visit-requests` to
  `permissions.json`. Grant them to admin, principal and secretary in
  `rolePermissions.json`. Reseed with `bun run seed:roles`.
- **Security lists:** add `'POST /api/visit-requests'` to `PUBLIC_ROUTES` in
  `RouteSecurityTransport.test.ts`, with a comment line in the header naming it.
  Nothing joins `SIGN_IN_ROUTES`.

### Dashboard

- `features/Landing/config/landingSchemas.ts`: the visit form schema
  (public form UX; the DTO decides) accepts the same bounded honeypot string.
  Do not add a client-side empty-only refinement.
  `landingOptions.ts` holds the cycle select builder `(t, cycles) => options`.
- `VisitRequestForm` (client): `NForm` + `FormInput` + phone input + cycle
  select + hidden honeypot (`tabIndex={-1}`, `autoComplete="off"`,
  visually hidden, not `display:none`). On success it shows a thank-you state
  in place of the form. Rate-limit (429) and validation errors show inline,
  translated. It replaces the Phase 1 contact actions, which stay below it as
  "Or call us".
- Active cycles for the select come from the server page (`loadLandingCycles`)
  as props, so there is no public cycles route.
- `features/VisitRequests/`: Table + Card + `useVisitRequests` (`useEntityCRUD`)
  + `config/` (columns, status options with `withStoredValue`). Table passes
  `{...tableErrorProps(error, rows)}`, and the page header count uses
  `isCountUnknown(error, rows, isLoading)`.
- `app/(dashboard)/visit-requests` with
  `PAGE_ACCESS.visitRequests = can('read:visit-requests')`, a sidebar item,
  and an icon.

**Checks:** `bun run test:config`, `test:server-i18n`, `test:security`,
`test:boundaries`, `test:visit-requests`; then
`bun run test:security:transport`
(the new public route is listed; the read and update routes are refused
signed out). New tests in `packages/server/tests/visitRequests/`:
- the DTO preserves a filled honeypot string, accepts empty/absent values and
  rejects non-strings/overlong values;
- the service drops filled honeypots before cycle lookups, writes, events and
  notifications, returning the normal success shape;
- an inactive cycle is refused with a catalog key;
- a normal request creates one row and notifies the permitted staff.

Transport checks use the existing isolated acceptance fixture and controlled
client address/limiter state: valid and honeypot POSTs both return the same
201 response, a filled honeypot creates no row, and the sixth POST within the
window gets 429. Honeypot submissions count toward the rate limit. Confirm
read/update permission separation with signed-in roles as well as signed-out
refusals. `bun run check` must include the new unit suite.

## Phase 3 — school-owned content and photos

Outcome: the school fills in its own stats, testimonials, program blurbs,
photo assignments, admissions status/year and social links, and uploads its
own photos. Statistics/testimonials appear when configured; the existing
programs and visit section use the configured content and admissions status.

- **Module** `packages/server/src/modules/landing/` (lightweight + repository),
  single row `school_landing`, enforced by a fixed `id='school'` primary key
  and check constraint; the editor uses an upsert:
  - `published` boolean, default `true`. When `false`, `/welcome` calls `notFound()`.
  - `stats`: jsonb, ≤ 4 × `{ value: string ≤ 12, label: Record<Language, string> }`.
  - `testimonials`: jsonb, ≤ 3 × `{ author, quote: Record<Language, string>, rating 1–5 }`.
  - `programBlurbs`: jsonb, `Record<cycleId, Record<Language, string>>`.
  - `programPhotoSlots`: jsonb, `Record<cycleId, LandingProgramSlot>` where
    `LandingProgramSlot` is the fixed union of `landingProgram1`,
    `landingProgram2`, `landingProgram3`. An absent assignment uses
    `program-default.webp`. Validate cycle IDs and slot keys; never infer
    assignment from `sortOrder`, labels or array position. More than three
    cycles may share a slot or use the default, so every active cycle remains
    visible. Keep assignments when a cycle is temporarily inactive; ignore
    removed cycles on public reads.
  - `admissionsOpen`: boolean, default `false`.
  - `admissionsYearLabel`: nullable text.
  - `socialLinks`: jsonb, `{ facebook?, instagram?, youtube?, linkedin? }`.
    Validate each as an `https://` URL on its own platform's host.
  - Use `LANGUAGE_VALUES` from `@sms/contracts` for the per-language records.
    Display falls back from the current language to the school's default
    language, then to `en`.
- Export `school_landing` from `database/schema/index.ts`, then generate,
  review and apply its migration to the authorized development database as
  in Phase 2. Extend `test:landing` with the new DTO/service/loader coverage;
  it remains part of the aggregate `test` and therefore `check` commands.
- Routes: `GET /landing/content` and `PUT /landing/content`, both
  `@isAdministrator()`. The public page reads through `loadSchoolLandingContent()`
  in `packages/server/src/landing.ts`, never over HTTP.
- **Branding slots** in `themeConfig.ts` via `brandingSlots`:
  `STANDARD_BRANDING_SLOTS` plus `landingHero` (hero), `landingAssistant`
  (image), `landingProgram1..3` (image), each with a `fallback` to the factory
  file in `public/images/landing/` and a `labelKey` under
  `theme.branding.slots.*` in all four catalogs. Preserve School's existing
  independent factory logo defaults when extending the standard registry.
  In matching `najm-theme 0.3.1` source, `applySlotCeilings` **does run** for
  custom registries and applies `heroBytes` to hero slots and `logoBytes` to
  other kinds. Keep the existing 5 MB/2 MB limits and test the resulting
  limits for both standard and landing slots; do not assume a per-slot
  `maxBytes` overrides those configured ceilings.
- **Optimized photos:** `LandingImage.tsx` is a small client leaf using
  `useNThemeBranding` from `najm-theme/react` and `next/image`. It reads the
  current slot URL from the existing root provider; no new provider, fetch
  or persisted branding state. Pass the slot's registered factory path as a
  serializable fallback prop, since the definition-backed bootstrap's
  factory map covers the four standard assets. On image failure use that
  fallback once, and show a stable placeholder if it also fails. Verify
  failures before and after hydration. Preserve dimensions/aspect ratio,
  `sizes` and hero loading priority from Phase 1. Confirm managed theme
  assets work through the existing Next image optimizer signed out; logos
  can continue to use `NThemeImage`, which renders an ordinary `<img>`.
- **Editor** `features/PublicPage` + `app/(dashboard)/public-page`,
  `PAGE_ACCESS.publicPage = inRoles(ADMINISTRATORS)`. Tabs:
  - Content: stats, testimonials, admissions-open toggle/year label, social links, with one
    language tab per field group.
  - Programs: a blurb and photo-slot select per active cycle, keyed by its ID.
    Options name the three photo slots and the neutral default; show previews.
  - Photos: `NThemeBrandingSettings slotKeys={[landing slots]}` inside the
    existing `NThemeSettingsProvider` pattern with save/discard actions.
    Explain that each program's assignment is chosen in the Programs tab.
  - Publish: the toggle, and a "View page" link to `/welcome`.
- `StatsStrip`, `TestimonialsSection` (initials avatars, D10) and footer
  social icons render **only** when their data is non-empty. Use "Admissions
  are open" only when `admissionsOpen=true`; append its year only when the
  school configured a label. Otherwise keep the neutral "Request a visit"
  heading and form, without implying admissions are open.

**Checks:** the DTO tests reject over-long lists, non-https and off-host social
URLs, ratings outside 1–5, invalid cycle/slot assignments, and invalid admissions
status. Reordering or disabling a cycle leaves every other cycle's photo
unchanged; test four active cycles and shared/default photos. The default
content row (`published=true`, `admissionsOpen=false`, empty content) matches
Phase 2 output. `published=false` returns 404. Verify SSR/hydration uses the
same photo and that uploads/fallbacks keep their layout and optimized delivery.

## Phase 4 — polish

1. **SEO:** `app/robots.ts` permits `/welcome` and its render assets
   (`/_next/`, `/images/`, publicly served theme assets), while disallowing
   dashboard/auth pages and other API paths. Add `app/sitemap.ts` with the
   single canonical `/welcome` URL using validated `NEXT_PUBLIC_APP_URL`.
   Omit the URL when the page is unpublished. Do not emit language alternates
   or `hreflang`: cookie-based language changes share one URL (D11).
   Localized crawlable URLs are outside this plan. Add JSON-LD `School`
   (name, address, geo, telephone) from configured profile fields only,
   escaped for safe script embedding and rendered with the CSP nonce.
2. **Performance budget** (Lighthouse, mobile, signed out): LCP < 2.5 s,
   CLS < 0.05, landing client JS < 60 kB gzip beyond the shared app chunks.
   The map iframe loads lazily below the fold. Measure both factory and
   uploaded hero photos; inspect their responsive optimized requests and
   ensure only the hero receives eager/high-priority delivery.
3. **Accessibility:** one `h1`; section `h2`s in order; skip link to main; the
   focus ring visible on the dark band; contrast ≥ 4.5:1 for normal text in
   light/dark and customized themes (add a gradient scrim over photos);
   `alt` text from the catalog; form labels and error `aria-describedby`.
   Confirm the landing permits pinch zoom; remove the root viewport's
   `maximumScale: 1` / `userScalable: false` restriction if Next's route
   viewport resolution cannot override it for this public route.
4. **Arabic QA:** a native reader reviews the `ar` catalog and the Darija
   sample (`ياسين داير مزيان! …`), mirrored layout, and numerals.

## Acceptance checklist

- [ ] Signed out, `/welcome` returns 200 with the school's own name, logo,
      cycles, address and phone.
- [ ] A fully anonymous visitor at `/` lands on `/welcome`. Any other
      protected path still goes to `/login?from=…`, and a visitor with a
      refresh cookie still goes through recovery.
- [ ] Signed in, `/welcome` shows **Open dashboard** and is not redirected away.
- [ ] Fresh install (no settings row): the page renders with the app name, and
      absent contact/map and zero-cycle programs are hidden. No error.
- [ ] School statistics, testimonials, admissions-open claims and year labels
      appear only when configured; sample data and factory photography are
      visibly disclosed and never presented as this school's facts.
- [ ] Feature copy makes no online-checkout or live-GPS promises without a
      verified corresponding parent-facing capability.
- [ ] en, fr, ar (RTL), es; 390 px, 768 px and 1440 px; light and dark. No raw
      catalog keys, no horizontal scroll.
- [ ] Section widths, rhythm, device/photo crops and responsive grids match
      the visual contract. Record the intentional token-color/content
      differences from the reference image.
- [ ] Language changes persist, refresh server content and metadata, switch
      direction, and make no signed-out user-preference mutation.
- [ ] Skip-link focus, sticky-header anchors, program CTAs and pinch zoom work;
      omitted sections leave no dead links.
- [ ] Program photo assignments survive cycle reordering/deactivation; more
      than three active cycles render with shared/default photos.
- [ ] Managed photos and missing-image fallbacks retain optimized delivery,
      stable dimensions and hero-only priority.
- [ ] The canonical and sitemap contain one real `/welcome` URL, no invented
      language alternates; unpublished pages are excluded from the sitemap.
- [ ] The visit form stores a request, notifies the staff who can read it,
      shows a thank-you state, rate-limits, and silently drops honeypot posts.
- [ ] `POST /api/visit-requests` is the only new public route, and
      `test:security:transport` passes with it listed.
- [ ] Both tables are exported through Drizzle's schema entry point and
      reviewed migrations run on the acceptance database. `test:landing` and
      `test:visit-requests` are included in the aggregate root `test` command.
- [ ] `bun run check` passes.

## Out of scope

- Online admissions applications with documents, and payment of registration fees.
- A multi-page public site (news, blog, calendar). The page links to nothing
  that requires sign-in except the portal button.
- Live public statistics computed from year-scoped data.
- Parent online checkout, live bus GPS tracking and locale-prefixed public
  routes/multilingual SEO; each requires its own capability/routing work.
- Captcha. Revisit only if the honeypot and rate limit prove insufficient,
  since Turnstile or reCAPTCHA need CSP `script-src` and `frame-src` changes.

## Risks

| Risk | Mitigation |
|---|---|
| The root layout's signed-in-only widgets misbehave signed out | Phase 0, item 3. If they do, render them only for a session, in one place, for `/login` too. |
| A future loader widens to the admin settings row | Explicit column projection in `landing.ts`, plus a unit test asserting the returned keys. |
| Spam through the public form | Honeypot + `@RateLimit` keyed on the client address (`SCHOOL_TRUSTED_PROXY_HOPS` must be right in production) + no echo of stored data. |
| Factory photos or demo figures read as the school's real students/results | Visible translated disclosures on the public page, plus Phase 3 replacement slots; no sample school statistics. |
| Slot-kind limits differ from the intended upload size | Verify `applySlotCeilings` against the pinned source and test both standard and extra slots with School's configured limits. |
| Uploaded hero loses optimization or its fallback | Keep `LandingImage` on `next/image`, test signed-out managed assets and failed candidates, and measure Phase 3 performance too. |
| Program reorder changes the apparent student age group | Persist photo-slot assignments by cycle ID; defaults for unassigned cycles and no positional mapping. |
