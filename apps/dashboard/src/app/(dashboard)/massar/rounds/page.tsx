import { requirePageAccess } from '@/shared/requirePageAccess';
import { MassarRoundsPage } from '@/features/Massar/components/MassarRoundsPage';
export default async function Page() { await requirePageAccess('massarRounds'); return <MassarRoundsPage />; }
