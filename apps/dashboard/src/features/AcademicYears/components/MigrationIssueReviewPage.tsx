'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Card, NButton, NDialog, NPageHeader } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import {
  listAcademicYearMigrationIssues,
  reviewAcademicYearMigrationIssue,
  type AcademicYearMigrationIssue,
  type MigrationIssueStatus,
} from '@/services/academicYearMigrationApi';

const statuses: MigrationIssueStatus[] = ['open', 'resolved', 'dismissed'];

export default function MigrationIssueReviewPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<MigrationIssueStatus>('open');
  const [cursor, setCursor] = useState<string | undefined>();
  const [previousCursors, setPreviousCursors] = useState<Array<string | undefined>>([]);
  const [reviewing, setReviewing] = useState<AcademicYearMigrationIssue | null>(null);
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<'resolved' | 'dismissed'>('resolved');

  const issues = useQuery({
    queryKey: ['academic-year-migration-issues', status, cursor],
    queryFn: () => listAcademicYearMigrationIssues(status, cursor),
  });
  const review = useMutation({
    mutationFn: (input: { id: string; status: 'resolved' | 'dismissed'; note: string }) =>
      reviewAcademicYearMigrationIssue(input.id, input.status, input.note),
    onSuccess: async () => {
      toast.success(t('academicYearMigration.reviewSaved'));
      setReviewing(null);
      setNote('');
      setCursor(undefined);
      setPreviousCursors([]);
      await queryClient.invalidateQueries({ queryKey: ['academic-year-migration-issues'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function changeStatus(next: MigrationIssueStatus) {
    setStatus(next);
    setCursor(undefined);
    setPreviousCursors([]);
    setReviewing(null);
  }

  function nextPage() {
    if (!issues.data?.nextCursor) return;
    setPreviousCursors((existing) => [...existing, cursor]);
    setCursor(issues.data.nextCursor);
  }

  function previousPage() {
    const previous = previousCursors.at(-1);
    setPreviousCursors((existing) => existing.slice(0, -1));
    setCursor(previous);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <NPageHeader icon={AlertTriangle} title={t('academicYearMigration.title')} />
      <p className="text-sm text-muted-foreground">{t('academicYearMigration.description')}</p>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('academicYearMigration.statusFilter')}>
        {statuses.map((option) => (
          <NButton key={option} type="button" size="sm" variant={status === option ? 'default' : 'outline'}
            aria-pressed={status === option} onClick={() => changeStatus(option)}>
            {t(`academicYearMigration.${option}`)}
          </NButton>
        ))}
        <span className="text-sm text-muted-foreground">
          {t('academicYearMigration.openCount')}: {issues.data?.openCount ?? '—'}
        </span>
      </div>

      {issues.isPending ? <p role="status">{t('academicYearMigration.loading')}</p> : null}
      {issues.isError ? (
        <Card className="space-y-3 p-4" role="alert">
          <p>{t('academicYearMigration.loadFailed')}</p>
          <NButton type="button" variant="outline" onClick={() => issues.refetch()}>
            {t('academicYearMigration.retry')}
          </NButton>
        </Card>
      ) : null}
      {issues.isSuccess && issues.data.items.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">{t('academicYearMigration.empty')}</Card>
      ) : null}

      {issues.isSuccess ? issues.data.items.map((issue) => (
        <Card key={issue.id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold">{issue.issueCode}</h2>
              <p className="text-sm text-muted-foreground">
                {issue.entityType} · {issue.academicYearLabel || t('academicYearMigration.unknownYear')}
              </p>
              <p className="break-all font-mono text-xs text-muted-foreground">{issue.entityId}</p>
            </div>
            {issue.entityType === 'student' ? (
              <Link className="text-sm text-primary underline-offset-2 hover:underline" href={`/students/${encodeURIComponent(issue.entityId)}`}>
                {t('academicYearMigration.openStudent')}
              </Link>
            ) : null}
          </div>
          <p className="text-sm">{issue.proposedResolution}</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(issue.evidence).map(([key, value]) => (
              <div key={key} className="min-w-0 rounded-md bg-muted/40 p-2">
                <dt className="text-xs text-muted-foreground">{key}</dt>
                <dd className="break-all">{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
          {issue.reviewStatus === 'open' ? (
            <NButton type="button" size="sm" variant="outline" onClick={() => {
              setReviewing(issue);
              setDecision('resolved');
              setNote('');
            }}>
              {t('academicYearMigration.review')}
            </NButton>
          ) : <p className="text-sm text-muted-foreground">{issue.resolutionNote}</p>}
        </Card>
      )) : null}

      {issues.isSuccess && (previousCursors.length > 0 || issues.data.nextCursor) ? (
        <nav className="flex gap-2" aria-label={t('academicYearMigration.pagination')}>
          <NButton type="button" variant="outline" disabled={!previousCursors.length || issues.isFetching} onClick={previousPage}>
            {t('academicYearMigration.previous')}
          </NButton>
          <NButton type="button" variant="outline" disabled={!issues.data.nextCursor || issues.isFetching} onClick={nextPage}>
            {t('academicYearMigration.next')}
          </NButton>
        </nav>
      ) : null}

      <NDialog title={t('academicYearMigration.review')} open={Boolean(reviewing)}
        onOpenChange={(open) => { if (!open && !review.isPending) setReviewing(null); }}
        showButtons={false} size="md">
        {reviewing ? (
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            review.mutate({ id: reviewing.id, status: decision, note: note.trim() });
          }}>
            <p className="text-sm text-muted-foreground">{reviewing.issueCode}</p>
            <div className="flex gap-2">
              {(['resolved', 'dismissed'] as const).map((option) => (
                <NButton key={option} type="button" variant={decision === option ? 'default' : 'outline'}
                  aria-pressed={decision === option} onClick={() => setDecision(option)}>
                  {t(`academicYearMigration.${option}`)}
                </NButton>
              ))}
            </div>
            <label className="block space-y-1 text-sm" htmlFor="migration-review-note">
              <span>{t('academicYearMigration.note')}</span>
              <textarea id="migration-review-note" className="min-h-28 w-full rounded-md border bg-background p-3"
                minLength={10} maxLength={2000} required value={note}
                onChange={(event) => setNote(event.target.value)} />
            </label>
            <p className="text-xs text-muted-foreground">{t('academicYearMigration.resolutionHelp')}</p>
            <div className="flex justify-end gap-2">
              <NButton type="button" variant="outline" disabled={review.isPending} onClick={() => setReviewing(null)}>
                {t('academicYearMigration.cancel')}
              </NButton>
              <NButton type="submit" disabled={review.isPending || note.trim().length < 10}>
                {t('academicYearMigration.save')}
              </NButton>
            </div>
          </form>
        ) : null}
      </NDialog>
    </div>
  );
}
