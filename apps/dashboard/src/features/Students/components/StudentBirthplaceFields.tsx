'use client';

import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ComboboxInput, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type * as Catalog from '@sms/contracts/birthplaces';
import { formatBirthplaceEntry, parseBirthplaceEntry } from '../config/birthplaceEntry';

/** Load the reference data only on student forms, in a separate browser chunk. */
export function StudentBirthplaceFields({ prefix = '' }: { prefix?: string }) {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext();
  const field = (name: string) => prefix ? `${prefix}.${name}` : name;
  const selectedId = useWatch({ name: field('birthplaceId') });
  const [catalog, setCatalog] = useState<typeof Catalog | null>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    let mounted = true;
    import('@sms/contracts/birthplaces').then(module => { if (mounted) setCatalog(module); })
      .catch(() => { /* Manual names stay available if the catalog chunk fails. */ });
    return () => { mounted = false; };
  }, []);
  const selected = selectedId ? catalog?.findBirthplaceById(selectedId) : undefined;
  const matches = catalog?.searchBirthplaces(query) ?? [];
  const label = (place: Catalog.Birthplace) => formatBirthplaceEntry({ birthplace: place.nameLatin, birthplaceArabic: place.nameArabic });
  const items = [...(selected && !matches.some(place => place.id === selected.id) ? [selected] : []), ...matches]
    .map(place => ({ value: place.id, label: place.id !== selected?.id
      && catalog.findBirthplaces(place.nameLatin).filter(other => other.nameArabic === place.nameArabic).length > 1
      ? `${label(place)} (${place.provinceLatin})` : label(place) }));

  return (
    <div className="md:col-span-2">
      <FormField control={control} name={field('birthplaceEntry')} render={({ field: input, fieldState }) => (
        <FormItem>
          <FormLabel>{t('students.form.birthplace')}</FormLabel>
          <FormControl>
            <ComboboxInput
              ariaLabel={t('students.form.birthplace')}
              value={selected?.id ?? (input.value || undefined)}
              placeholder={t('students.form.birthplaceSearch')} searchPlaceholder={t('students.form.birthplaceSearch')}
              emptyMessage={t('students.form.birthplaceFormat')}
              items={[...items, { value: '', label: t('students.form.birthplaceClear') }]}
              loading={!catalog} onSearchChange={setQuery} shouldFilter={false} allowFreeText
              status={fieldState.invalid ? 'error' : 'default'}
              onChange={value => {
                const place = catalog?.findBirthplaceById(value);
                const entry = place ? label(place) : value;
                const parsed = place ? { birthplace: place.nameLatin, birthplaceArabic: place.nameArabic } : parseBirthplaceEntry(entry);
                input.onChange(entry);
                setValue(field('birthplaceId'), place?.id ?? null, { shouldDirty: true });
                setValue(field('birthplace'), parsed?.birthplace ?? null, { shouldDirty: true });
                setValue(field('birthplaceArabic'), parsed?.birthplaceArabic ?? null, { shouldDirty: true });
              }}
            />
          </FormControl>
          <FormDescription>{t('students.form.birthplaceFormat')}</FormDescription>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  );
}
