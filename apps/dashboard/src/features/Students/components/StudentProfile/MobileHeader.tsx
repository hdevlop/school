'use client';

import { ArrowLeft, Pencil } from 'lucide-react';
import { NAvatar, NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

/** "Jebara Mohamed Baraa" → "JM": the first two names' initials. */
const initials = (name?: string | null) =>
  (name ?? '').trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toLocaleUpperCase()).join('') || '?';

interface MobileHeaderProps {
  student?: {
    name?: string | null;
    image?: string | null;
    studentCode?: string | null;
    class?: { name?: string | null } | null;
    section?: { name?: string | null } | null;
  } | null;
  onBack: () => void;
  onEdit?: () => void;
}

/**
 * The profile's header on a phone: back to Home, then
 * who the student is — photo or initials, name, class and Massar code — in
 * place of the menu button and the page's generic title.
 */
export default function MobileHeader({ student, onBack, onEdit }: MobileHeaderProps) {
  const { t } = useTranslation();
  const classLabel = [student?.class?.name, student?.section?.name].filter(Boolean).join('-');
  const massarCode = student?.studentCode?.trim();

  return (
    <div className="flex min-h-14 items-center gap-2 rounded-xl border border-border bg-card px-1.5 py-2">
      <NButton
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={onBack}
        aria-label={t('mobileHome.title')}
        title={t('mobileHome.title')}
      >
        <ArrowLeft className="size-5 rtl:rotate-180" />
      </NButton>
      <NAvatar
        src={student?.image ?? undefined}
        fallback={initials(student?.name)}
        alt={student?.name ? t('students.profile.studentAvatarNamed', { name: student.name }) : t('students.profile.studentAvatar')}
        size="md"
        shape="circle"
        classNames={{ avatar: 'size-10 shrink-0 bg-primary/10 text-primary' }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{student?.name ?? t('students.profile.detailsTitle')}</p>
        {classLabel || massarCode ? (
          <p className="truncate text-xs text-muted-foreground">
            {classLabel}
            {classLabel && massarCode ? ' · ' : null}
            {massarCode ? <bdi dir="ltr" className="font-mono">{massarCode}</bdi> : null}
          </p>
        ) : null}
      </div>
      {onEdit ? (
        <NButton
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onEdit}
          aria-label={t('common.edit')}
          title={t('common.edit')}
        >
          <Pencil className="size-4" />
        </NButton>
      ) : null}
    </div>
  );
}
