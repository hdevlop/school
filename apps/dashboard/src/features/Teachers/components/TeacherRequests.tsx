'use client';

import { useMemo, useState } from 'react';
import { NButton, NEmptyState, NErrorState, NForbiddenState } from 'najm-kit';
import { Check, ChevronDown, UserPlus, X } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useDialog } from '@/shared/useDialog';
import { announceInvitation } from '@/shared/invitationNotice';
import { hasFailedToLoad, isAuthorizationError } from '@/services/apiError';
import { useResetLogin } from '@/features/Users/hooks/useResetLogin';
import { buildGenderOptions } from '../config/teacherOptions';
import { useTeacherRequests, type TeacherRequestRow } from '../hooks/useTeacherRequests';

/** First letters of the first two words: "Amina Bennani" → "AB". */
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(word => [...word][0] ?? '').join('');

/**
 * One request per row: who, when, how to reach them, and the two decisions.
 * The CIN, gender and address wait behind "Details", so a list of several
 * requests stays readable at a glance.
 */
function TeacherRequestItem({ request, genderLabel }: { request: TeacherRequestRow; genderLabel: string | null }) {
  const { t, language } = useTranslation();
  const { approveRequest, rejectRequest } = useTeacherRequests();
  const { canReset, openReset } = useResetLogin();
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [open, setOpen] = useState(false);

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

  const received = request.createdAt
    ? new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(new Date(request.createdAt))
    : null;
  const details = [
    [t('teachers.form.cin'), request.cin],
    [t('teachers.form.gender'), genderLabel],
    [t('teachers.form.address'), request.address],
  ].filter((entry): entry is [string, string] => !!entry[1]);

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
          {initials(request.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2">
            <span className="truncate font-semibold" dir="auto">{request.name}</span>
            {received ? <span className="shrink-0 text-xs text-muted-foreground">{received}</span> : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            <bdi>{request.email}</bdi> · <bdi dir="ltr">{request.phone}</bdi>
          </p>
        </div>
        {confirmingReject ? (
          <div className="flex shrink-0 items-center gap-1">
            <NButton size="sm" variant="ghost" disabled={pending === 'reject'} onClick={() => setConfirmingReject(false)}>{t('common.cancel')}</NButton>
            <NButton size="sm" variant="destructive" loading={pending === 'reject'} onClick={reject}>{t('teacherRequests.list.reject')}</NButton>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            {/* A phone keeps the name readable: the button shows its tick alone there. */}
            <NButton
              size="sm" leftIcon={Check} loading={pending === 'approve'} onClick={approve}
              aria-label={t('teacherRequests.list.approve')} title={t('teacherRequests.list.approve')}
            >
              <span className="max-sm:sr-only">{t('teacherRequests.list.approve')}</span>
            </NButton>
            <NButton
              size="sm" variant="ghost" className="px-2 text-muted-foreground hover:text-destructive"
              aria-label={t('teacherRequests.list.reject')} title={t('teacherRequests.list.reject')}
              disabled={pending === 'approve'} onClick={() => setConfirmingReject(true)}
            >
              <X className="size-4" />
            </NButton>
          </div>
        )}
      </div>

      {confirmingReject ? (
        <p className="mt-1 ps-11 text-xs font-medium text-destructive">{t('teacherRequests.list.rejectConfirm')}</p>
      ) : (
        <button
          type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}
          className="mt-1 ms-11 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {t('teacherRequests.list.details')}
          <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      )}
      {open && !confirmingReject ? (
        <dl className="mt-1 ms-11 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {details.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0 break-words" dir="auto">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
}

function TeacherRequestsList() {
  const { t } = useTranslation();
  const { data, error, isLoading } = useTeacherRequests();
  const requests: TeacherRequestRow[] = Array.isArray(data) ? data : [];
  const genders = useMemo(() => new Map<string, string>(buildGenderOptions(t).map(option => [option.value, option.label])), [t]);

  if (isLoading && requests.length === 0) return <p role="status" className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  if (hasFailedToLoad(error, requests)) return isAuthorizationError(error) ? <NForbiddenState surface="panel" /> : <NErrorState surface="panel" />;
  if (requests.length === 0) return <NEmptyState surface="panel" icon={FEATURE_ICONS.teachers} title={t('teacherRequests.list.empty')} />;
  return (
    <ul className="divide-y divide-border">
      {requests.map(request => (
        <TeacherRequestItem key={request.id} request={request} genderLabel={request.gender ? genders.get(request.gender) ?? null : null} />
      ))}
    </ul>
  );
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
      // The button's own short name, which fits beside the close button on a phone.
      onClick={() => openDialog({ title: t('teacherRequests.list.button'), children: <TeacherRequestsList />, width: 'lg', showButtons: false })}
    >
      {t('teacherRequests.list.button')}
      {count > 0 ? <span className="ms-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground"><bdi dir="ltr">{count}</bdi></span> : null}
    </NButton>
  );
}
