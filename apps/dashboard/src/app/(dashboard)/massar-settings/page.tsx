import { requirePageAccess } from '@/shared/requirePageAccess';
import { MassarSettingsPage } from '@/features/Massar/components/MassarSetupPage';
export default async function Page() { await requirePageAccess('massarSetup'); return <MassarSettingsPage />; }
