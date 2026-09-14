'use client';

import {
  NLocationInput,
  type NLocationProviderSelectionMeta,
  type NLocationValue,
} from 'najm-kit/location';
import { useActiveForm } from '@/hooks/useActiveForm';

type LocationFieldNames = {
  address: string;
  placeId: string;
  latitude: string;
  longitude: string;
};

type Props = {
  form?: any;
  names: LocationFieldNames;
  label: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  compact?: boolean;
};

export function LocationField({
  form,
  names,
  label,
  placeholder,
  required,
  compact = false,
}: Props) {
  const activeForm = useActiveForm(form);
  const address = String(activeForm.watch(names.address) || '');
  const rawPlaceId = activeForm.watch(names.placeId);
  const rawLatitude = activeForm.watch(names.latitude);
  const rawLongitude = activeForm.watch(names.longitude);
  const latitude = typeof rawLatitude === 'number' ? rawLatitude : null;
  const longitude = typeof rawLongitude === 'number' ? rawLongitude : null;
  const placeId = typeof rawPlaceId === 'string' && rawPlaceId ? rawPlaceId : null;
  const value: NLocationValue = { address, latitude, longitude };
  const providerMeta: NLocationProviderSelectionMeta | null = placeId
    ? { provider: 'google', placeId, address, latitude, longitude }
    : null;

  const updateLocation = (next: NLocationValue) => {
    activeForm.setValue(names.address, next.address, {
      shouldDirty: true,
      shouldValidate: true,
    });
    activeForm.setValue(names.latitude, next.latitude, { shouldDirty: true });
    activeForm.setValue(names.longitude, next.longitude, { shouldDirty: true });
  };

  const updateProviderMeta = (
    next: NLocationProviderSelectionMeta | null,
  ) => {
    activeForm.setValue(names.placeId, next?.placeId ?? null, {
      shouldDirty: true,
    });
  };

  return (
    <div className={compact ? 'space-y-2' : 'space-y-2 rounded-2xl border border-slate-200 bg-white p-4'}>
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <NLocationInput
        name={names.address}
        aria-label={label}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={updateLocation}
        providerMeta={providerMeta}
        onProviderMetaChange={updateProviderMeta}
        bordered={false}
      />
    </div>
  );
}
