'use client';

import BehaviorRewardsTable from '@/features/BehaviorRewards/components/BehaviorRewardsTable';
import { useAuth } from 'najm-auth/client/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BehaviorRewardsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const role = (user as any)?.role;
  const allowed = role === 'admin' || role === 'teacher';

  useEffect(() => {
    if (user && !allowed) router.replace('/');
  }, [user, allowed, router]);

  if (!user || !allowed) return null;

  return <BehaviorRewardsTable />;
}
