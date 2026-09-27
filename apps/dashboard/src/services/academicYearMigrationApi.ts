import { api } from './http';

export type MigrationIssueStatus = 'open' | 'resolved' | 'dismissed';

export type AcademicYearMigrationIssue = {
  id: string;
  entityType: string;
  entityId: string;
  issueCode: string;
  academicYearLabel: string;
  evidenceSource: string;
  evidence: Record<string, string | null>;
  proposedResolution: string;
  reviewStatus: MigrationIssueStatus;
  resolutionNote: string | null;
  reviewedAt: string | null;
};

export type MigrationIssuePage = {
  items: AcademicYearMigrationIssue[];
  openCount: number;
  nextCursor: string | null;
};

function unwrap<T>(response: { data: unknown }): T {
  const outer = response.data as { data?: T } | T;
  return (outer && typeof outer === 'object' && 'data' in outer ? outer.data : outer) as T;
}

export async function listAcademicYearMigrationIssues(
  status: MigrationIssueStatus,
  cursor?: string,
): Promise<MigrationIssuePage> {
  return unwrap(await api.get('/academic-year-migration-issues', {
    params: { status, limit: 50, cursor },
  }));
}

export async function reviewAcademicYearMigrationIssue(
  id: string,
  status: 'resolved' | 'dismissed',
  resolutionNote: string,
) {
  return unwrap<AcademicYearMigrationIssue>(await api.post(
    `/academic-year-migration-issues/${encodeURIComponent(id)}/review`,
    { status, resolutionNote },
  ));
}
