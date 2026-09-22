# @sms/contracts

Browser-safe code shared by `@sms/dashboard`, `@sms/server` and `@sms/seed`,
exported as TypeScript source. Every consumer, including a Next client bundle,
reads it directly, so everything here must be safe in a browser.

| Export | Owns |
| --- | --- |
| `@sms/contracts` | Database enum members, API payload values, and the values a dashboard select may submit |
| `@sms/contracts/lookup` | The by-key `enumValues` registry. Server-only: it names every tuple |
| `@sms/contracts/locales` | The one en/fr/ar/es translation catalog and its `schoolI18n` definition |
| `@sms/contracts/fixtures` | Demo and development form-fill generators over static reference data |

## Rules

- **Browser-safe only.** No database schema, driver, environment read,
  filesystem access, auth initialization or other side effect. Dependencies
  are limited to the audited portable list in
  `scripts/workspace-boundaries.config.mjs` (`najm-i18n/define` for the
  catalog definition, `@faker-js/faker` and `nanoid` for fixtures).
  `bun run test:boundaries` fails on anything else.
- **Narrow exports.** The root barrel exports the tuples only. Catalogs,
  fixtures and the lookup registry each have their own subpath so a component
  importing one value does not load the rest.
- **Values, not presentation.** Labels, translation keys, icons, and colours
  belong to the feature that renders them. A tuple says what the server
  accepts; it says nothing about how it reads.
- **Adding or removing a value changes what the database accepts.** Renaming
  one is a data migration, not an edit. `tests/enums.test.ts` pins the exact
  members and order of every persisted enum so a careless edit fails loudly.
- **One catalog.** `tests/locales.test.ts` pins that the dashboard, the server
  i18n plugin and seed commands read the same four JSON files with English
  fallback. Run `bun run i18n:check` after adding keys.

## Consuming it

```ts
import { PAYMENT_METHOD_VALUES, type PaymentMethod } from '@sms/contracts';
import { schoolI18n } from '@sms/contracts/locales';

const schema = z.enum(PAYMENT_METHOD_VALUES);
```

A dashboard feature may narrow a tuple to the subset its form should offer, but
it does so in its own `config/`, with a test saying why — never by editing the
tuple here.
