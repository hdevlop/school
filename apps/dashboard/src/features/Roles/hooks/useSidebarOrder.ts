'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from 'najm-auth/client/react';
import { getOwnSidebarOrderApi } from '@/services/roleAccessApi';

export function useSidebarOrder() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sidebar-layout', user?.id, user?.role],
    queryFn: getOwnSidebarOrderApi,
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
