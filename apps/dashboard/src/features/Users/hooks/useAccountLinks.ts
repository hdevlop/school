'use client'
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAccountLinksApi } from '@/services/userApi';
import type { AccountLinkKind } from '../config/accountLinks';

/**
 * Who each login belongs to, keyed by account id. Undefined while loading or
 * when the viewer may not read every person's login: the screen then marks
 * no account as unlinked rather than all of them.
 */
export const useAccountLinks = (enabled = true) => {
  const { data } = useQuery({ queryKey: ['users', 'account-links'], queryFn: getAccountLinksApi, enabled });
  return useMemo(
    () => data ? new Map<string, AccountLinkKind>(data.map(({ userId, kind }) => [userId, kind])) : undefined,
    [data],
  );
};
