'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from 'najm-auth/client/react';
import { getOwnSidebarOrderApi } from '@/services/roleAccessApi';
import { useSidebarOrderSeed } from '../context/SidebarOrderSeed';

export function useSidebarOrder() {
  const { user } = useAuth();
  // Read on the server for this page, so the first render already has the order
  // and the browser asks again only once it is stale.
  const seed = useSidebarOrderSeed(user?.id);
  return useQuery({
    queryKey: ['sidebar-layout', user?.id, user?.role],
    queryFn: getOwnSidebarOrderApi,
    enabled: !!user?.id,
    staleTime: 60_000,
    initialData: seed?.order,
    initialDataUpdatedAt: seed?.loadedAt,
  });
}
