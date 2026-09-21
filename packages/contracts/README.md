# @sms/contracts

The values that cross a boundary: database enum members, API payload values,
and the values a dashboard select may submit. Declared once, consumed by both
`@sms/server` and `@sms/dashboard`.

## Rules

- **No dependencies.** Not Zod, not Drizzle, not React, not Next, not Najm, not
  translations, not server runtime code. This package is consumed straight from
  TypeScript source by a Bun server build and by a Next client bundle, so
  anything imported here is imported into the browser too.
- **Values only.** Labels, translation keys, icons, and colours belong to the
  feature that renders them. A value here says what the server accepts; it says
  nothing about how it reads.
- **Adding or removing a value changes what the database accepts.** Renaming
  one is a data migration, not an edit. `tests/enums.test.ts` pins the exact
  members and order of every persisted enum so a careless edit fails loudly.

## Consuming it

```ts
import { PAYMENT_METHOD_VALUES, type PaymentMethod } from '@sms/contracts';

const schema = z.enum(PAYMENT_METHOD_VALUES);
```

A dashboard feature may narrow a tuple to the subset its form should offer, but
it does so in its own `config/`, with a test saying why — never by editing the
tuple here.
