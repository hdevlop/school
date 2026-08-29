'use client'

import SettingsForm from '@/features/Settings/components/SettingsForm';

// The role check lives in this route's layout, on the server. Repeating it here
// would only re-introduce the client-side redirect that used to sign people out.
export default function SettingsPage() {
  return <SettingsForm />;
}
