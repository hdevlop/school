'use client'

import { useRouter } from 'next/navigation';
import { SchoolSettingsSheet } from '@/features/Settings/components/SchoolSettingsSheet';

// The role check lives in this route's layout, on the server. Repeating it here
// would only re-introduce the client-side redirect that used to sign people out.
// The sidebar opens the same sheet in place; this route keeps old links working.
export default function SettingsPage() {
  const router = useRouter();
  return <SchoolSettingsSheet open onOpenChange={(open) => { if (!open) router.replace('/'); }} />;
}
