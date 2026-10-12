# Mobile Home

At widths below 1024px, the authenticated root route shows a Home screen with
three columns of illustrated feature cards, search, a user card, notifications, and the
existing language switcher. Desktop keeps the existing role-dependent
landing behaviour. The full dashboard is available at `/dashboard`, with its
existing server page guard. `/home` and the mobile drawer's Home entry return to the grid.
Direct links to other modules keep their destinations.

Home has no footer bar. Its font and card styles are scoped to the feature.
Avatar fallbacks contain two initials rather than the full name. Dashboard
uses a compact shortcut beside search, with no empty Overview row in the
default grid. Feature cards form one continuous three-column grid without
section headings, preserving their previous order.

The generated 36-icon transparent PNG atlas lives at
`apps/dashboard/public/images/home/feature-icons-v1.png`. Its exact generation
and edit prompts are recorded in [the icon evidence](../evidence/mobile-home-icons.md).

## Permissions

- Any granted action on a feature resource shows the feature's card.
- Najm's action, resource, and full wildcards are supported.
- Fees includes fee, payment, and installment permissions.
- Cards use the shared navigation's destinations, with the illustrated atlas
  mapped to those same feature IDs. Future unmapped features retain their
  shared vector icon as a fallback.
- Theme and branding cards open the shell's existing sheets and share their
  state with the sidebar.
- A shown card is locked when its existing page guard denies entry; a
  create-only grant does not grant list access.
- The personal inbox remains available to every signed-in account. Dashboard
  visibility follows its existing role guard because it has no catalog resource.
- Home does not define roles, change grants, or change backend guards.

## Source validation

Run from the dashboard workspace:

```powershell
bun test ./tests/features/Home/config/homeFeatures.test.ts ./tests/features/Dashboard/config
```

From the repository root:

```powershell
bun run --cwd apps/dashboard typecheck
bun run lint
bun run i18n:check
bun run test:boundaries
$env:NAJM_NEXT_DIST_DIR = '.next-mobile-home-build'
bun run build
```

Implementation-session evidence (2026-10-12):

| Check | Result |
| --- | --- |
| Home and dashboard tests | PASS: 30 tests |
| Dashboard and server typechecks | PASS |
| Root lint | PASS |
| Translation scan and Home key parity across all four locales | PASS |
| Workspace boundary tests and final graph scan | PASS |
| Final isolated production build | PASS |
| Anonymous HTTP requests to `/`, `/home`, and `/dashboard` | PASS: redirect to login |
| Authenticated HTTP smoke | BLOCKED: documented seed login returned 401 |
| Browser / phone interaction | NOT RUN: no browser connection available |

Illustrated Home revision:

- PASS: 30 Home/dashboard regression tests, root lint, dashboard typecheck,
  translation scan, workspace graph check, and the isolated production build.
- PASS: all 36 feature cards map to distinct generated icon cells; the PNG
  keeps genuine alpha transparency and is served by the app with HTTP 200.
- NOT RUN: rendered mobile/browser acceptance. The browser connection remained
  unavailable; the user's earlier screenshot was the visual input for this revision.

## Browser acceptance

NOT RUN: no browser connection was available in the implementation session.
Source tests and production compilation do not prove the following UI checks.

Authenticated HTTP smoke: BLOCKED. The local application's documented seed
login returned HTTP 401. No records or credentials were changed for this check.

- At 320px, 390px, and 768px, normal login and opening `/` show Home.
- Desktop `/` retains the dashboard or existing family/non-staff destination.
- Cards fit three columns, scroll vertically, and do not overflow.
- Search filters translated labels and shows an empty-search state.
- Cards with no feature permission are absent; guarded cards remain locked.
- Menu, notification bell, language switcher, dashboard shortcut, and the
  drawer's Home entry work using their existing state and services.
- Confirm no Home footer is rendered, the account initials fit their circle,
  the phone uses sans-serif text, and every illustrated icon matches its label.
- Parents see “My children”; students see “My profile”.
- Confirm the actual sessions for every supported role, including Supervisor
  after its separate implementation is complete.
- Confirm Arabic RTL, other languages, dark mode, keyboard focus, and safe-area
  spacing on a phone.
- A direct module link survives login and browser Back restores its prior page.
