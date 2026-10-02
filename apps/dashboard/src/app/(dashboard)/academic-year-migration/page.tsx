import { requirePageAccess } from '@/shared/requirePageAccess';
import MigrationIssueReviewPage from '@/features/AcademicYears/components/MigrationIssueReviewPage';

export const dynamic = 'force-dynamic';

export default async function AcademicYearMigrationRoute() {
  await requirePageAccess('settings');
  return <MigrationIssueReviewPage />;
}
