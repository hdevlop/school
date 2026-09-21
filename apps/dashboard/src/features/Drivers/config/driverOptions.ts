import { DRIVER_STATUS_VALUES } from '@sms/contracts';
import type { DriverStatus } from '@sms/contracts';

import { optionsFromValues, type EnumOption, type Translate } from '@/shared/forms/enumOptions';

/**
 * The driver form's selects.
 *
 * The status list used to be written out by hand in the component, and one of
 * its four entries was wrong: it offered the value `on_leave` under the label
 * `drivers.status.onLeave`. The schema, the DTO and the `driver_status` column
 * all spell it `onLeave`, so picking "On Leave" produced a form the user could
 * not submit. Building the list from `DRIVER_STATUS_VALUES` is what stops that
 * from being expressible — the label key is derived from the value, so the two
 * cannot disagree again.
 */

export const DRIVER_STATUS_TRANSLATION_PREFIX = 'drivers.status';

export const buildDriverStatusOptions = (t: Translate): readonly EnumOption<DriverStatus>[] =>
  optionsFromValues(DRIVER_STATUS_VALUES, t, DRIVER_STATUS_TRANSLATION_PREFIX);

/**
 * Moroccan licence categories.
 *
 * Frontend-only, and stored as free text: `licenseType` is a `varchar` the API
 * takes as given, so this is a convenience list rather than a contract. It
 * stays here — putting it in `@sms/contracts` would claim the server validates
 * it, and the server does not.
 */
export const DRIVER_LICENSE_TYPE_OPTIONS: readonly EnumOption[] = [
  { value: 'A', label: 'A (Motorcycle)' },
  { value: 'B', label: 'B (Car)' },
  { value: 'C', label: 'C (Truck)' },
  { value: 'D', label: 'D (Bus)' },
  { value: 'E', label: 'E (Trailer)' },
];
