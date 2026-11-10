'use client';

import { useState } from 'react';
import { NButton, NEmptyState, NErrorState, NForbiddenState } from 'najm-kit';
import { Check, UserPlus, X } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useDialog } from '@/shared/useDialog';
import { announceInvitation } from '@/shared/invitationNotice';
import { hasFailedToLoad, isAuthorizationError } from '@/services/apiError';
import { useResetLogin } from '@/features/Users/hooks/useResetLogin';
import { useTeacherRequests, type TeacherRequestRow } from '../hooks/useTeacherRequests';

function TeacherRequestItem({ request }: { request: TeacherRequestRow }) {
  const { t } = useTranslation();
  const { approveRequest, rejectRequest } = useTeacherRequests();
  const { canReset, openReset } = useResetLogin();
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null);
  const [confirmingReject, setConfirmingReject] = useState(false);

  const approve = async () => {
    setPending('approve');
    try {
      const response = await approveRequest(request.id);
      announceInvitation(response?.data?.emailSent, request.email, {
        sent: t('teachers.invitation.sent', { email: request.email }),
        notSent: t('teachers.invitation.notSent'),
        notSentAction: canReset && response?.data?.userId ? {
          label: t('users.accessReset.action'),
          onClick: () => openReset(response.data.userId),
        } : undefined,
      });
    } catch (error) {
      // The request stays in the list: a refusal says why, such as a CIN already in use.
      toast.error(error instanceof Error && error.message ? error.message : t('teacherRequests.list.failed'));
      setPending(null);
    }
  };

  const reject = async () => {
    setPending('reject');
    try {
      await rejectRequest(request.id);
    } catch {
      // The mutation reports the refusal in a toast.
      setPending(null);
    }
  };

  const facts: Array<[string, string | number | null]> = [
    [t('teachers.form.cin'), request.cin],
    [t('teachers.form.address'), request.address],
    [t('teachers.form.specialization'), request.specialization],
    [t('teachers.form.yearsOfExperience'), request.yearsOfExperience],
    [t('teachers.form.academicDegrees'), request.academicDegrees],
  ];

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1 text-sm">
        <p className="font-semibold" dir="auto">{request.name}</p>
        <p className="flex flex-wrap gap-x-3">
          <a className="break-all text-primary" href={`mailto:${request.email}`}>{request.email}</a>
          <a className="text-primary" dir="ltr" href={`tel:${request.phone}`}>{request.phone}</a>
        </p>
        <dl className="space-y-0.5 text-muted-foreground">
          {facts.filter(([, value]) => value !== null && value !== '').map(([label, value]) => (
            <div key={label} className="flex gap-1.5">
              <dt className="shrink-0">{label} :</dt>
              <dd className="min-w-0 break-words" dir="auto">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {confirmingReject ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm">{t('teacherRequests.list.rejectConfirm')}</span>
          <NButton size="sm" variant="destructive" loading={pending === 'reject'} onClick={reject}>{t('teacherRequests.list.reject')}</NButton>
          <NButton size="sm" variant="ghost" disabled={pending === 'reject'} onClick={() => setConfirmingReject(false)}>{t('common.cancel')}</NButton>
        </div>
      ) : (
        <div className="flex shrink-0 gap-2">
          <NButton size="sm" leftIcon={Check} loading={pending === 'approve'} onClick={approve}>{t('teacherRequests.list.approve')}</NButton>
          <NButton size="sm" variant="outline" leftIcon={X} disabled={pending === 'approve'} onClick={() => setConfirmingReject(true)}>{t('teacherRequests.list.reject')}</NButton>
        </div>
      )}
    </li>
  );
}

function TeacherRequestsList() {
  const { t } = useTranslation();
  const { data, error, isLoading } = useTeacherRequests();
  const requests: TeacherRequestRow[] = Array.isArray(data) ? data : [];

  if (isLoading && requests.length === 0) return <p role="status" className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  if (hasFailedToLoad(error, requests)) return isAuthorizationError(error) ? <NForbiddenState surface="panel" /> : <NErrorState surface="panel" />;
  if (requests.length === 0) return <NEmptyState surface="panel" icon={FEATURE_ICONS.teachers} title={t('teacherRequests.list.empty')} />;
  return <ul className="divide-y divide-border">{requests.map(request => <TeacherRequestItem key={request.id} request={request} />)}</ul>;
}

/** Shows only when there is something to review, or when the list could not be read. */
export function TeacherRequestsButton() {
  const { t } = useTranslation();
  const { openDialog } = useDialog();
  const { data, error } = useTeacherRequests();
  const count = Array.isArray(data) ? data.length : 0;
  if (count === 0 && !error) return null;
  return (
    <NButton
      size="sm"
      variant="outline"
      leftIcon={UserPlus}
      onClick={() => openDialog({ title: t('teacherRequests.list.title'), children: <TeacherRequestsList />, width: 'xl', showButtons: false })}
    >
      {t('teacherRequests.list.button')}{count > 0 ? ` (${count})` : ''}
    </NButton>
  );
}
