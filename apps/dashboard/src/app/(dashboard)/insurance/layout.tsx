import { requirePageAccess } from '@/shared/requirePageAccess';
export default async function InsuranceLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess('insurance');
  return children;
}
