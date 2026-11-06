import { requirePageAccess } from '@/shared/requirePageAccess';
import { MassarSheetsPage } from '@/features/Massar/components/MassarSheetsPage';
export default async function Page({ searchParams }: { searchParams: Promise<{ roundId?: string }> }) {
  await requirePageAccess('massarSheets'); const { roundId } = await searchParams; return <MassarSheetsPage initialRoundId={roundId} />;
}
