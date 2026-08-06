'use client'

import SettingsForm from '@/features/Settings/components/SettingsForm';
import { useAuth } from 'najm-auth/client/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const role = (user as any)?.role;
  const allowed = role === 'admin' || role === 'principal';

  useEffect(() => {
    if (user && !allowed) router.replace('/');
  }, [user, allowed, router]);

  if (!user || !allowed) return null;

  return <SettingsForm />;
}
