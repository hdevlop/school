import { requirePageAccess } from '@/shared/requirePageAccess';
export default async function Layout({ children }: { children: React.ReactNode }) { await requirePageAccess('visitRequests'); return children; }
