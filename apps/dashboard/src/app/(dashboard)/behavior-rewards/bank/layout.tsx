import { requirePageAccess } from '@/shared/requirePageAccess';

export default async function PageLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess('rewardTemplates');
  return children;
}
