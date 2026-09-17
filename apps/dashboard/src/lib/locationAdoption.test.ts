import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

import { defineNajmAppLocationRuntime } from 'najm-next/location/server';
import { schoolApp } from '../najm.config';

const schoolLocation = defineNajmAppLocationRuntime(schoolApp)!;

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('School shared Google location integration', () => {
  test('preserves the existing browser-key variable during transition', () => {
    const runtime = schoolLocation.resolve({
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'legacy-public-key',
    });

    expect(runtime.config.provider).toBe('google');
    if (runtime.config.provider === 'google') {
      expect(runtime.config.google.apiKey).toBe('legacy-public-key');
      expect(runtime.config.google.region).toBe('MA');
    }
    expect(runtime.csp.scriptSrc).toContain('https://maps.googleapis.com');
    expect(runtime.csp.connectSrc).toContain('https://*.googleapis.com');
  });

  test('prefers the runtime key and disables an invalid or missing provider', () => {
    const runtime = schoolLocation.resolve({
      SCHOOL_LOCATION_GOOGLE_API_KEY: 'runtime-public-key',
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'legacy-public-key',
    });
    expect(runtime.config.provider).toBe('google');
    if (runtime.config.provider === 'google') {
      expect(runtime.config.google.apiKey).toBe('runtime-public-key');
    }

    expect(schoolLocation.resolve({}).config.provider).toBe('disabled');
    expect(
      schoolLocation.resolve({ SCHOOL_LOCATION_MAP_PROVIDER: 'leaflet' }).config
        .provider,
    ).toBe('disabled');
  });

  test('delegates the Google SDK and Places geocoder to the shared app provider', () => {
    const provider = read('../app/providers.tsx');

    expect(provider).toContain('<NajmAppProvider');
    expect(provider).not.toContain("import('najm-kit/location/google')");
    expect(provider).not.toContain('createGooglePlacesGeocoder');
    expect(provider).not.toContain('SchoolLocationProvider');
    expect(provider).not.toContain('@react-google-maps/api');
    expect(provider).not.toContain('process.env');
  });

  test('persists common coordinates and separate Google place identity', () => {
    const field = read('../components/location/LocationField.tsx');

    expect(field).toContain('NLocationInput');
    expect(field).toContain('providerMeta={providerMeta}');
    expect(field).toContain('onProviderMetaChange={updateProviderMeta}');
    expect(field).toContain('next?.placeId ?? null');
    expect(field).toContain('next.latitude');
    expect(field).toContain('next.longitude');
    expect(field).not.toContain('@react-google-maps/api');
    expect(field).not.toContain('LocationPickerDialog');
  });
});
