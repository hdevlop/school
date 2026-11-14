'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogOut, UserRound } from 'lucide-react';
import { NAvatar, NBadge, NButton, NSheet, NSkeleton, cn } from 'najm-kit';
import { useAuth } from 'najm-auth/client/react';
import { useTranslation } from 'najm-i18n/react';
import { avatarVersion } from '@/lib/avatarVersion';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { getOwnStaffProfileApi } from '@/services/staffApi';
import { useSchoolSignOut } from '@/providers/SignOutTransition';
import { formatAssignments } from '@/features/Staff/utils/staffAssignments';
import { useCoversWholeSchool } from '@/features/Staff/hooks/useCoversWholeSchool';
import { usesTeacherDashboard } from '@/features/Dashboard/config/dashboardAudience';
import { useTeacherOverview } from '@/features/Dashboard/hooks/useTeacherDashboard';
import { accountAvatar, accountRoleLabelKey } from '../config/accountAvatar';
import { ProfileContact } from './profile/ProfileContact';
import { ProfilePreferences } from './profile/ProfilePreferences';

/** The portrait inside a ring in the theme's colours. */
function Portrait({ image, fallbackSrc, name, version }: { image?: string; fallbackSrc: string; name: string; version?: string | number }) {
  return (
    <div className="rounded-full bg-[conic-gradient(from_210deg,var(--primary),var(--chart-2),color-mix(in_oklab,var(--primary)_35%,transparent),var(--primary))] p-[3px] shadow-lg shadow-primary/15">
      <div className="rounded-full bg-background p-1">
        <NAvatar src={image} fallbackSrc={fallbackSrc} fallback={name} alt={name} size="xl" version={version} classNames={{ avatar: 'size-24 text-2xl' }} />
      </div>
    </div>
  );
}

type Fact = { key: string; label: string; value: ReactNode; wide?: boolean };

/** The staff record as a card: its code first, then what the contract says. */
function StaffCard({ code, facts }: { code?: string | null; facts: Fact[] }) {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/12 via-card to-card p-4">
      {/* A soft glow in the corner, behind the text. */}
      <span aria-hidden="true" className="pointer-events-none absolute -end-10 -top-10 size-32 rounded-full bg-primary/15 blur-2xl" />
      <p className="relative font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('mobileHome.profile.staffCard')}</p>
      {code && <p className="relative mt-1 font-mono text-2xl font-bold tracking-wider"><bdi dir="ltr">{code}</bdi></p>}
      {facts.length > 0 && (
        <dl className="relative mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          {facts.map((fact) => (
            <div key={fact.key} className={cn('min-w-0', fact.wide && 'col-span-2')}>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{fact.label}</dt>
              <dd className="text-sm font-medium wrap-break-word">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** A teacher's year in three figures: classes, students and weekly hours. */
function TeacherStats({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const { number } = useSchoolFormat();
  const { data: overview, isLoading, error } = useTeacherOverview(undefined, enabled);

  // Without an overview each figure would read 0, which is not what failed.
  if (error && !overview) return <p role="alert" className="text-sm text-destructive">{t('mobileHome.profile.statsLoadFailed')}</p>;

  const sections = new Set((overview?.classes ?? []).map((item) => item.sectionId)).size;
  const hours = overview?.teacher.workloadHours;
  const stats = [
    { key: 'classes', label: t('mobileHome.profile.classes'), value: number(sections) },
    { key: 'students', label: t('mobileHome.profile.students'), value: number(overview?.kpis.totalStudents ?? 0) },
    { key: 'hours', label: t('mobileHome.profile.hoursPerWeek'), value: hours == null ? '—' : number(hours) },
  ];

  return (
    <dl className="grid grid-cols-3 gap-2">
      {stats.map((stat) => (
        <div key={stat.key} className="flex flex-col-reverse items-center gap-0.5 rounded-2xl border bg-card px-2 py-3 text-center">
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</dt>
          <dd className="text-2xl font-bold tabular-nums text-primary">
            {isLoading ? <NSkeleton className="mx-auto h-7 w-10" /> : stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function HomeProfileSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const coversWholeSchool = useCoversWholeSchool();
  const { displayDateOnly } = useSchoolFormat();
  const { signOut, isSigningOut } = useSchoolSignOut();
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
  const roleLabel = staff?.role === 'monitor' || accountRole === 'monitor'
    ? t('staff.roles.monitor')
    : staff?.roleLabels?.[language] || staff?.roleLabel || accountRoleLabel;
  const assignments = coversWholeSchool(staff) ? t('staff.table.wholeSchool') : formatAssignments(staff, language);
  const name = person?.name || person?.email || '—';
  const isTeacher = usesTeacherDashboard(accountRole);

  // Only what this account's record holds: an administrator with no staff
  // record has no card rather than a card of empty cells.
  const facts = ([
    { key: 'employmentType', label: t('staff.form.employmentType'), value: staff?.employmentType && t(`staff.employmentTypes.${staff.employmentType}`) },
    { key: 'hireDate', label: t('staff.form.hireDate'), value: staff?.hireDate && displayDateOnly(staff.hireDate) },
    { key: 'department', label: t('staff.form.department'), value: staff?.department },
    { key: 'shift', label: t('staff.form.shift'), value: staff?.shift && t(`staff.shifts.${staff.shift}`) },
    { key: 'assignments', label: t('staff.table.assignments'), value: assignments !== '-' && assignments, wide: true },
  ] as Fact[]).filter((fact) => fact.value);

  return (
    <NSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('navigation.myProfile')}
      icon={UserRound}
      width={440}
      footer={(
        <NButton
          type="button"
          variant="outline"
          className="w-full gap-2 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={isSigningOut}
          onClick={signOut}
        >
          <LogOut className="size-4" aria-hidden="true" />
          {t('navigation.logout')}
        </NButton>
      )}
    >
      <div className="flex flex-col gap-5 pb-2">
        <header className="flex flex-col items-center gap-2 pt-2 text-center">
          <Portrait
            image={image}
            fallbackSrc={accountAvatar(person?.role, person?.gender)}
            name={name}
            version={avatarVersion(image, person?.updatedAt)}
          />
          <h2 className="mt-1 text-xl font-bold wrap-break-word">{name}</h2>
          {(roleLabel || staff?.status) && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {roleLabel && (
                <NBadge className="inline-flex w-fit items-center rounded-full bg-primary/10 font-medium text-primary ring-1 ring-inset ring-primary/20">
                  {roleLabel}
                </NBadge>
              )}
              {staff?.status && <NBadge status={staff.status} />}
            </div>
          )}
        </header>

        {isLoading && <NSkeleton className="h-36 w-full rounded-2xl" />}
        {/* A record that failed to load must not read as an account with no details. */}
        {isError && <p role="alert" className="text-sm text-destructive">{t('mobileHome.profileLoadFailed')}</p>}
        {staff && (staff.employeeCode || facts.length > 0) && <StaffCard code={staff.employeeCode} facts={facts} />}

        {isTeacher && <TeacherStats enabled={open} />}

        <ProfileContact email={person?.email} phone={staff?.phone || person?.phone} />
        <ProfilePreferences />
      </div>
    </NSheet>
  );
}
