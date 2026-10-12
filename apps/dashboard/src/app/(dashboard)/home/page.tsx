import MobileHome from '@/features/Home/components/MobileHome';
import { requireSession } from '@/najm.server';

export default async function HomePage() {
  await requireSession();
  return <MobileHome />;
}
