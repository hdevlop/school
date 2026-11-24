'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { CompetencyDomain } from '@sms/contracts';
import { schoolI18n, type SchoolTranslationKey } from '@sms/contracts/locales';
import { useTranslation } from 'najm-i18n/react';
import { catalogLanguage } from '../config/competencyLanguage';

export type CompetencyText = {
  t: (key: string, params?: Record<string, string | number>) => string;
  language: string;
  dir: 'ltr' | 'rtl';
};

const ListLanguage = createContext<'ar' | null>(null);

/**
 * Lays out what is inside in the language of the list it shows: an Arabic
 * list's levels, months and summaries read in Arabic, right to left, under a
 * French or English page. The page's own header and filters stay outside.
 */
export function CompetencyTextScope({ domains, children, className }: {
  domains: readonly CompetencyDomain[];
  children: ReactNode;
  className?: string;
}) {
  const language = useMemo(() => catalogLanguage(domains), [domains]);
  return (
    <ListLanguage.Provider value={language}>
      {language ? <div lang={language} dir={schoolI18n.direction(language)} className={className}>{children}</div>
        : className ? <div className={className}>{children}</div> : children}
    </ListLanguage.Provider>
  );
}

/** `useTranslation` for the competency views: the list's language inside a scope, the interface's outside. */
export function useCompetencyText(): CompetencyText {
  return useTextIn(useContext(ListLanguage));
}

/** Uses the list language from outside the sheet, where the report data is shared with the header. */
export function useListText(domains: readonly CompetencyDomain[]): CompetencyText {
  return useTextIn(useMemo(() => catalogLanguage(domains), [domains]));
}

/** A list's text outside React: in its own language when it has one, else the page's. */
export function textForList(domains: readonly CompetencyDomain[], page: { t: (key: string, params?: any) => string; language: string }): CompetencyText {
  return textIn(catalogLanguage(domains), page);
}

function textIn(list: 'ar' | null, page: { t: (key: string, params?: any) => string; language: string }): CompetencyText {
  return list
    ? { t: (key, params) => schoolI18n.translate(list, key as SchoolTranslationKey, params), language: list, dir: schoolI18n.direction(list) }
    : { t: page.t as CompetencyText['t'], language: page.language, dir: schoolI18n.direction(schoolI18n.normalizeLanguage(page.language)) };
}

function useTextIn(list: 'ar' | null): CompetencyText {
  const page = useTranslation();
  return useMemo(() => textIn(list, page), [list, page]);
}
