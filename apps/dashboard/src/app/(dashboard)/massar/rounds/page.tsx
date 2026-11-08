import { requirePageAccess } from '@/shared/requirePageAccess';
import { redirect } from 'next/navigation';
export default async function Page() { await requirePageAccess('massarSheets'); redirect('/massar'); }
