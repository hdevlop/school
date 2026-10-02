import Dashboard from '@/features/Dashboard';
import { requirePageAccess } from '@/shared/requirePageAccess';

export default async function DashboardPage() {
  await requirePageAccess('dashboard');
  return <Dashboard />;
}
