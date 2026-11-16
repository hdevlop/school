import { requirePageAccess } from '@/shared/requirePageAccess';

// Reads the per-request session, so it cannot be prerendered.
export const dynamic = 'force-dynamic';

// The studio is a full-screen app with its own navigation, so it sits outside
// the dashboard shell. Its API routes are admin-only in najm-rag as well.
export default async function RagStudioLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess('ragStudio');
  return children;
}
