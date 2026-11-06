import { requirePageAccess } from '@/shared/requirePageAccess';
import { MassarSetupPage } from '@/features/Massar/components/MassarSetupPage';
export default async function Page() { await requirePageAccess('massarSetup'); return <MassarSetupPage />; }
