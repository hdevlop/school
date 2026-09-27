import { requireRole } from '@/najm.server';
import MigrationIssueReviewPage from '@/features/AcademicYears/components/MigrationIssueReviewPage';

export const dynamic = 'force-dynamic';

export default async function AcademicYearMigrationRoute() {
  await requireRole(['admin', 'principal']);
  return <MigrationIssueReviewPage />;
}
