import { requirePageAccess } from '@/shared/requirePageAccess';

export default async function PlanningLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess('exams');
  return children;
}
