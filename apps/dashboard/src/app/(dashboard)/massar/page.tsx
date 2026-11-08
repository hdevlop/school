import { requirePageAccess } from '@/shared/requirePageAccess';
import { MassarPage } from '@/features/Massar/components/MassarPage';
export default async function Page() { await requirePageAccess('massarSheets'); return <MassarPage />; }
