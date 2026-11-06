import { requirePageAccess } from '@/shared/requirePageAccess';
import { MassarSheetPage } from '@/features/Massar/components/MassarSheetPage';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAccess('massarSheets'); const { id } = await params; return <MassarSheetPage id={id} />;
}
