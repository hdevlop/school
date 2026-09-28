'use client';

import AlertsTable from '@/features/Alerts/components/AlertsTable';

// Everyone signed in has an alerts inbox; the server decides which alerts it holds.
export default function AlertsPage() {
  return <AlertsTable />;
}
