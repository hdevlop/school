import { VEHICLE_STATUS_VALUES, VEHICLE_TYPE_VALUES } from '@sms/contracts';
import type { VehicleStatus, VehicleType } from '@sms/contracts';

type Translate = (key: string, ...args: any[]) => string;

type EnumOption<Value extends string = string> = {
  readonly value: Value;
  readonly label: string;
};

const optionsFromValues = <Value extends string>(
  values: readonly Value[],
  t: Translate,
  translationPrefix: string,
): readonly EnumOption<Value>[] =>
  values.map((value) => ({ value, label: t(`${translationPrefix}.${value}`) }));

/**
 * The vehicle form's selects.
 *
 * Both lists were previously written out in the component and neither matched
 * the `vehicle_type` / `vehicle_status` columns:
 *
 * - the type select offered `van`, `truck` and `suv`, none of which the API
 *   accepts, and omitted `sedan` and `shuttle`, which it does. Choosing one of
 *   the three invalid types produced a form that could not be submitted;
 * - the status select omitted `inactive`, so a bus could be taken off the road
 *   only by retiring it.
 *
 * Deriving both from the contract tuples fixes all four cases at once and
 * makes the mismatch unexpressible. No stored row is affected: the columns are
 * Postgres enums over exactly these values, so nothing outside them exists.
 */

export const VEHICLE_TYPE_TRANSLATION_PREFIX = 'vehicles.types';
export const VEHICLE_STATUS_TRANSLATION_PREFIX = 'vehicles.status';

export const buildVehicleTypeOptions = (t: Translate): readonly EnumOption<VehicleType>[] =>
  optionsFromValues(VEHICLE_TYPE_VALUES, t, VEHICLE_TYPE_TRANSLATION_PREFIX);

export const buildVehicleStatusOptions = (t: Translate): readonly EnumOption<VehicleStatus>[] =>
  optionsFromValues(VEHICLE_STATUS_VALUES, t, VEHICLE_STATUS_TRANSLATION_PREFIX);
