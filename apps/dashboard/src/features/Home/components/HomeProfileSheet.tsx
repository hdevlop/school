'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell, Briefcase, Building2, CalendarDays, Clock, Hash, Mail, MapPinned, Phone, UserRound } from 'lucide-react';
import { NAvatar, NBadge, NButton, NSectionInfo, NSheet, NSkeleton } from 'najm-kit';
import { useAuth } from 'najm-auth/client/react';
import { useTranslation } from 'najm-i18n/react';
import { PersonCard } from '@/shared/PersonCard';
import { avatarVersion } from '@/lib/avatarVersion';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { getOwnStaffProfileApi } from '@/services/staffApi';
import { formatAssignments } from '@/features/Staff/utils/staffAssignments';
import { accountAvatar, accountRoleLabelKey } from '../config/accountAvatar';

export default function HomeProfileSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const { displayDateOnly } = useSchoolFormat();
  const person = user as typeof user & { gender?: string | null; phone?: string | null; updatedAt?: string | null };
  const image = typeof person?.image === 'string' ? person.image : undefined;
  const { data: staff, isLoading, isError } = useQuery({
    queryKey: ['staff', 'me'],
    queryFn: getOwnStaffProfileApi,
    enabled: open,
  });

  const accountRole = person?.role ?? '';
  const accountRoleKey = accountRoleLabelKey(accountRole);
  const accountRoleLabel = t(accountRoleKey) === accountRoleKey ? accountRole : t(accountRoleKey);
  const roleLabel = staff?.role === 'floorManager' || accountRole === 'floor_manager'
    ? t('staff.roles.floorManager')
    : staff?.roleLabels?.[language] || staff?.roleLabel || accountRoleLabel;
  const assignments = formatAssignments(staff, language);
  const phone = staff?.phone || person?.phone;

  // Only what this account's record holds: an administrator with no staff
  // record keeps a short card rather than a column of empty rows.
  const details = [
    { key: 'email', icon: Mail, label: t('users.table.email'), value: person?.email && <span className="break-all">{person.email}</span> },
    { key: 'phone', icon: Phone, label: t('teachers.form.phone'), value: phone && <bdi dir="ltr">{phone}</bdi> },
    { key: 'employeeCode', icon: Hash, label: t('staff.table.employeeCode'), value: staff?.employeeCode && <bdi dir="ltr">{staff.employeeCode}</bdi> },
    { key: 'assignments', icon: MapPinned, label: t('staff.table.assignments'), value: assignments !== '-' && assignments },
    { key: 'department', icon: Building2, label: t('staff.form.department'), value: staff?.department },
    { key: 'employmentType', icon: Briefcase, label: t('staff.form.employmentType'), value: staff?.employmentType && t(`staff.employmentTypes.${staff.employmentType}`) },
    { key: 'shift', icon: Clock, label: t('staff.form.shift'), value: staff?.shift && t(`staff.shifts.${staff.shift}`) },
    { key: 'hireDate', icon: CalendarDays, label: t('staff.form.hireDate'), value: staff?.hireDate && displayDateOnly(staff.hireDate) },
  ].filter((detail) => detail.value);

  return (
    <NSheet open={open} onOpenChange={onOpenChange} title={t('navigation.myProfile')} icon={UserRound} width={440}>
      <div className="rounded-xl border bg-card">
        <PersonCard
          avatar={(
            <NAvatar
              src={image}
              fallbackSrc={accountAvatar(person?.role, person?.gender)}
              fallback={person?.name || person?.email}
              alt={person?.name || ''}
              size="lg"
              version={avatarVersion(image, person?.updatedAt)}
            />
          )}
          name={person?.name || person?.email || '—'}
          meta={roleLabel && (
            <>
              <NBadge className="inline-flex w-fit items-center rounded-full bg-primary/10 font-medium text-primary ring-1 ring-inset ring-primary/20">
                {roleLabel}
              </NBadge>
              {staff?.status && <NBadge status={staff.status} />}
            </>
          )}
        >
          {details.map(({ key, ...detail }) => <NSectionInfo key={key} {...detail} maxChars={Infinity} className="flex-wrap items-start" />)}
          {isLoading && <NSkeleton className="h-4 w-2/3" />}
          {/* A record that failed to load must not read as an account with no details. */}
          {isError && <p role="alert" className="text-sm text-destructive">{t('mobileHome.profileLoadFailed')}</p>}
        </PersonCard>
      </div>
      <NButton asChild variant="outline" className="mt-4 w-full justify-start gap-2">
        <Link href="/preferences" onClick={() => onOpenChange(false)}>
          <Bell className="size-4" aria-hidden="true" />
          {t('notifications.pushTitle')}
        </Link>
      </NButton>
    </NSheet>
  );
}
