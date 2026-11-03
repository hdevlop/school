'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'najm-i18n/react';
import { getOwnStaffProfileApi } from '@/services/staffApi';

/** The job title the signed-in account's staff record names, which may be the school's own wording. */
export const useOwnJobTitle = (fallback: string) => {
  const { language } = useTranslation();
  const { data: staff } = useQuery({ queryKey: ['staff', 'me'], queryFn: getOwnStaffProfileApi });
  return staff?.roleLabels?.[language] || staff?.roleLabel || fallback;
};
