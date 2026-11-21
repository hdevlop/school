'use client';

import { Search, X } from 'lucide-react';
import { cn, NButton, Popover, PopoverContent, PopoverTrigger, TextInput } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

/** Lower-case and strip accents, so "eleve" finds "Élève". */
export const normalizeSearch = (value: string) => value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

/**
 * A phone list's search, as an icon in the page header: the box opens in a popover, so the
 * list gets the row back. The icon stays highlighted while a search narrows the list.
 */
export function HeaderSearchButton({ search, onSearch, label, placeholder }: {
  search: string;
  onSearch: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  const { t } = useTranslation();
  const clear = t('common.clearSearch');
  const active = search.trim().length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <NButton type="button" variant="ghost" size="icon" aria-label={label} title={label}
          className={cn('relative size-11', active && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary')}>
          <Search className="size-5" aria-hidden />
          {active && <span aria-hidden className="absolute end-2 top-2 size-2 rounded-full bg-primary" />}
        </NButton>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-[min(22rem,calc(100vw-1.5rem))] p-2">
        <div className="flex items-center gap-1">
          <TextInput value={search} onChange={onSearch} placeholder={placeholder} aria-label={label}
            icon={Search} autoFocus className="w-full min-w-0 [&_input]:text-sm" />
          {active && (
            <NButton type="button" variant="ghost" size="icon" className="size-10 shrink-0" aria-label={clear} title={clear}
              onClick={() => onSearch('')}>
              <X className="size-4" aria-hidden />
            </NButton>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
