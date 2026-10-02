import { requirePageAccess } from '@/shared/requirePageAccess';

export default async function PageLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess('expenses');
  return children;
}
