"use client";

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  NAvatar,
  NBadge,
  NButton,
  NCard,
  NCardAction,
  NCardFooter,
  NEmptyState,
  NErrorState,
  NLoadingState,
  NPageHeader,
  NPageHeaderActions,
  NProgress,
  NStatCard,
} from 'najm-kit';
import {
  ArrowLeft,
  Award,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  CreditCard,
  GraduationCap,
  MapPin,
  ReceiptText,
  Star,
  UsersRound,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'najm-i18n/react';
import type { TranslationParams } from 'najm-i18n';
import { getAvatarFallback, personAvatarClassNames } from '@/lib/avatar';
import { formatMAD, type SupportedLocale } from '@/lib/format';
import { useParentDashboard } from '../../hooks/useParentDashboard';

interface ParentProfileProps {
  parentId: string;
}

const ABSENT_COLOR = '#E11D48';
const LATE_COLOR = '#F1B814';

const toNumber = (value: unknown) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const getGradePercent = (grade: any) => {
  const total = toNumber(grade?.assessment?.totalMarks ?? grade?.exam?.totalMarks);
  return total > 0 ? Math.min(100, (toNumber(grade?.marksObtained) / total) * 100) : 0;
};

const getGradeDate = (grade: any) =>
  grade?.assessment?.date ?? grade?.exam?.date ?? grade?.createdAt;

const formatDate = (
  value: string | Date | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, options).format(date);
};

const getAttendanceScore = (rows: any[]) => {
  if (!rows.length) return null;
  const score = rows.reduce((sum, row) => {
    if (row.status === 'present') return sum + 1;
    if (row.status === 'late') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((score / rows.length) * 100);
};

const ParentProfile: React.FC<ParentProfileProps> = ({ parentId }) => {
  const router = useRouter();
  const { t, language } = useTranslation();
  const locale = language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-MA' : 'en-US';
  const moneyLocale: SupportedLocale = language === 'fr' || language === 'ar' ? language : 'en';
  const text = (key: string, params?: TranslationParams) =>
    t(`parents.profile.dashboard.${key}`, params);

  const {
    parent,
    children,
    childData,
    assessments,
    events,
    isLoading,
    isError,
    refetch,
  } = useParentDashboard(parentId);

  const dashboard = useMemo(() => {
    const attendanceRows = childData.flatMap((item) => asArray<any>(item.attendance));
    const gradeRows = childData.flatMap((item) =>
      asArray<any>(item.grades).map((grade) => ({
        ...grade,
        child: item.child,
      })),
    );
    const feeRows = childData.flatMap((item) =>
      asArray<any>(item.fees).map((fee) => ({
        ...fee,
        child: item.child,
      })),
    );

    const gradePercentages = gradeRows.map(getGradePercent).filter((value) => value > 0);
    const averageGrade = gradePercentages.length
      ? Math.round(gradePercentages.reduce((sum, value) => sum + value, 0) / gradePercentages.length)
      : null;
    const overallAttendance = getAttendanceScore(attendanceRows);

    const childClassIds = new Set(children.map((child) => child.classId).filter(Boolean));
    const childSectionIds = new Set(children.map((child) => child.sectionId).filter(Boolean));

    const pendingAssessments = assessments
      .filter((assessment) => {
        const targetSections = Array.isArray(assessment.sectionIds) ? assessment.sectionIds : [];
        return (
          childClassIds.has(assessment?.class?.id) ||
          childSectionIds.has(assessment?.section?.id) ||
          targetSections.some((sectionId: string) => childSectionIds.has(sectionId))
        );
      })
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const upcomingEvents = events
      .filter((event) => {
        const eventDate = new Date(event.startDate);
        const classIds = Array.isArray(event.classIds) ? event.classIds : [];
        const isAudienceMatch =
          (!event.classId && !event.sectionId && classIds.length === 0) ||
          childClassIds.has(event.classId) ||
          childSectionIds.has(event.sectionId) ||
          classIds.some((classId: string) => childClassIds.has(classId));
        return (
          !Number.isNaN(eventDate.getTime()) &&
          eventDate >= new Date(new Date().toDateString()) &&
          event.status !== 'cancelled' &&
          isAudienceMatch
        );
      })
      .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))
      .slice(0, 3);

    const recentGrades = gradeRows
      .toSorted((a, b) => String(getGradeDate(b)).localeCompare(String(getGradeDate(a))))
      .slice(0, 5);

    const totalFees = feeRows.reduce((sum, fee) => sum + toNumber(fee.netAmount), 0);
    const totalPaid = feeRows.reduce((sum, fee) => sum + toNumber(fee.paidAmount), 0);
    const outstandingFees = Math.max(0, totalFees - totalPaid);
    const paymentProgress = totalFees > 0 ? Math.min(100, (totalPaid / totalFees) * 100) : 0;
    const nextFee = feeRows
      .filter((fee) => toNumber(fee.netAmount) > toNumber(fee.paidAmount))
      .toSorted((a, b) =>
        String(a.effectiveDate ?? a.createdAt).localeCompare(String(b.effectiveDate ?? b.createdAt)),
      )[0];

    const monthlyAttendance = new Map<string, { absent: number; late: number }>();
    attendanceRows.forEach((row) => {
      const date = new Date(row.date ?? row.createdAt);
      if (Number.isNaN(date.getTime())) return;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const counts = monthlyAttendance.get(monthKey) ?? { absent: 0, late: 0 };
      if (row.status === 'absent') counts.absent += 1;
      if (row.status === 'late') counts.late += 1;
      monthlyAttendance.set(monthKey, counts);
    });

    const attendanceChart = Array.from(monthlyAttendance.entries())
      .toSorted(([monthA], [monthB]) => monthA.localeCompare(monthB))
      .map(([month, counts]) => ({
        month: formatDate(`${month}-01`, locale, { month: 'short' }),
        ...counts,
      }));

    return {
      averageGrade,
      overallAttendance,
      pendingAssessments,
      upcomingEvents,
      recentGrades,
      totalFees,
      totalPaid,
      outstandingFees,
      paymentProgress,
      nextFee,
      attendanceChart,
    };
  }, [assessments, childData, children, events, locale]);

  if (isLoading) {
    return (
      <NLoadingState
        label={text('loadingOverview')}
        className="min-h-96 flex-1"
        spinnerVariant="ring"
      />
    );
  }

  if (isError || !parent) {
    return (
      <NErrorState
        title={t('parents.profile.parentNotFound')}
        message={text('loadError')}
        retryLabel={text('tryAgain')}
        onRetry={() => void refetch()}
        className="min-h-96 flex-1"
      />
    );
  }

  const firstName = parent.name?.split(' ')[0] || parent.name;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={UsersRound}
        title={text('welcomeBack', { name: firstName })}
        subtitle={text('subtitle')}
      >
        <NPageHeaderActions>
          <NButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push('/parents')}
            className="gap-2"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {text('backToParents')}
          </NButton>
          <NButton type="button" variant="outline" size="sm" className="gap-2">
            <CalendarDays className="size-4" />
            {formatDate(new Date(), locale, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </NButton>
        </NPageHeaderActions>
      </NPageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 pb-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <NStatCard
              icon={UsersRound}
              label={t('parents.profile.totalChildren')}
              value={children.length}
              onClick={() => router.push('/students')}
            />
            <NStatCard
              icon={Star}
              label={text('averageGrade')}
              value={dashboard.averageGrade === null ? '—' : `${dashboard.averageGrade}%`}
              onClick={() => router.push('/grades')}
            />
            <NStatCard
              icon={CheckCircle2}
              label={text('overallAttendance')}
              value={dashboard.overallAttendance === null ? '—' : `${dashboard.overallAttendance}%`}
              onClick={() => router.push('/attendance/students')}
            />
            <NStatCard
              icon={BookOpenCheck}
              label={text('pendingTasks')}
              value={dashboard.pendingAssessments.length}
              onClick={() => router.push('/assessments')}
            />
          </div>

          <div className="grid min-h-[320px] grid-cols-1 gap-3 xl:grid-cols-12 [&>*]:min-h-0 [&>*]:min-w-0">
            <NCard
              title={text('myChildren')}
              icon={UsersRound}
              className="flex h-full w-full xl:col-span-3"
            >
              <NCardAction>
                <NButton type="button" variant="ghost" size="sm" onClick={() => router.push('/students')}>
                  {t('parents.profile.viewAllChildren')}
                </NButton>
              </NCardAction>

              {children.length === 0 ? (
                <NEmptyState
                  icon={UsersRound}
                  title={t('parents.profile.noChildrenLinked')}
                  description={text('noChildrenDescription')}
                  className="min-h-56"
                />
              ) : (
                <div className="flex flex-col gap-2 overflow-y-auto">
                  {children.map((child) => {
                    const childRecords = childData.find((item) => item.child.id === child.id);
                    const attendance = getAttendanceScore(asArray<any>(childRecords?.attendance));
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => router.push(`/students/${child.id}`)}
                        className="flex w-full items-center gap-3 rounded-lg border border-border/50 p-2 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <NAvatar
                          src={child.image}
                          fallback={getAvatarFallback(child.name)}
                          size="md"
                          version={child.updatedAt}
                          classNames={personAvatarClassNames}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{child.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {child.class?.name ?? text('class')}
                            {child.section?.name ? ` · ${child.section.name}` : ''}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <NBadge size="sm" look="soft">
                              {child.status
                                ? t(`students.status.${child.status}`)
                                : t('common.notSpecified')}
                            </NBadge>
                            {attendance !== null ? (
                              <span className="text-xs text-muted-foreground">
                                {text('attendancePercent', { percent: attendance })}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </NCard>

            <NCard
              title={text('childrenAttendance')}
              icon={CalendarRange}
              className="flex h-full w-full xl:col-span-9"
            >
              <NCardAction>
                <NButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/attendance/students')}
                >
                  {text('childrenAttendance')}
                </NButton>
              </NCardAction>

              {dashboard.attendanceChart.length === 0 ? (
                <NEmptyState
                  icon={CalendarRange}
                  title={text('noAttendance')}
                  description={text('noAttendanceDescription')}
                  className="min-h-56"
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="mb-2 flex flex-wrap gap-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="size-3 rounded-full" style={{ backgroundColor: ABSENT_COLOR }} />
                      {t('dashboard.attendance.absent')}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="size-3 rounded-full" style={{ backgroundColor: LATE_COLOR }} />
                      {t('dashboard.attendance.late')}
                    </div>
                  </div>
                  <div className="min-h-[220px] flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashboard.attendanceChart} margin={{ top: 8, right: 14, left: -14, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip
                          formatter={(value, name) => [value ?? 0, name]}
                          contentStyle={{
                            borderRadius: 'var(--radius)',
                            borderColor: 'hsl(var(--border))',
                            fontSize: 12,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="absent"
                          name={t('dashboard.attendance.absent')}
                          stroke={ABSENT_COLOR}
                          strokeWidth={3}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="late"
                          name={t('dashboard.attendance.late')}
                          stroke={LATE_COLOR}
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </NCard>
          </div>

          <div className="grid min-h-[320px] grid-cols-1 gap-3 xl:grid-cols-3 [&>*]:min-h-0 [&>*]:min-w-0">
            <NCard title={text('recentGrades')} icon={Award} className="flex h-full w-full">
              <NCardAction>
                <NButton type="button" variant="ghost" size="sm" onClick={() => router.push('/grades')}>
                  {text('recentGrades')}
                </NButton>
              </NCardAction>

              {dashboard.recentGrades.length === 0 ? (
                <NEmptyState
                  icon={Award}
                  title={text('noGrades')}
                  description={text('noGradesDescription')}
                  className="min-h-56"
                />
              ) : (
                <div className="flex flex-col gap-2 overflow-y-auto">
                  {dashboard.recentGrades.map((grade) => {
                    const percentage = Math.round(getGradePercent(grade));
                    return (
                      <div
                        key={grade.id}
                        className="flex items-center gap-3 rounded-lg border border-border/50 p-2 hover:bg-muted/30"
                      >
                        <GraduationCap className="size-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {grade.subject?.name ??
                              grade.assessment?.title ??
                              grade.exam?.title ??
                              text('assessment')}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {grade.child.name} ·{' '}
                            {formatDate(getGradeDate(grade), locale, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <NBadge size="sm" look="soft">
                          {percentage}%
                        </NBadge>
                      </div>
                    );
                  })}
                </div>
              )}
            </NCard>

            <NCard title={text('feesPayments')} icon={CreditCard} className="flex h-full w-full">
              <NCardAction>
                <NButton type="button" variant="ghost" size="sm" onClick={() => router.push('/fees')}>
                  {t('parents.profile.viewAllFees')}
                </NButton>
              </NCardAction>

              {dashboard.totalFees <= 0 ? (
                <NEmptyState
                  icon={ReceiptText}
                  title={text('noFees')}
                  description={text('noFeesDescription')}
                  className="min-h-56"
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{text('outstandingBalance')}</p>
                    <p className="mt-1 text-2xl font-bold">
                      {formatMAD(dashboard.outstandingFees, moneyLocale)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {dashboard.nextFee?.child?.name ?? text('familyAccount')}
                      {dashboard.nextFee?.name ?? dashboard.nextFee?.feeType?.name
                        ? ` · ${dashboard.nextFee?.name ?? dashboard.nextFee?.feeType?.name}`
                        : ''}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{text('paymentStatus')}</span>
                      <span>
                        {text('percentPaid', { percent: Math.round(dashboard.paymentProgress) })}
                      </span>
                    </div>
                    <NProgress value={dashboard.paymentProgress} color="primary" className="h-2" />
                    <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                      <span>
                        {text('paidAmount', {
                          amount: formatMAD(dashboard.totalPaid, moneyLocale),
                        })}
                      </span>
                      <span>
                        {text('totalAmount', {
                          amount: formatMAD(dashboard.totalFees, moneyLocale),
                        })}
                      </span>
                    </div>
                  </div>

                  <NCardFooter className="mt-auto">
                    <NButton
                      type="button"
                      className="w-full gap-2"
                      onClick={() =>
                        dashboard.nextFee?.child?.id
                          ? router.push(`/students/${dashboard.nextFee.child.id}/fees`)
                          : router.push('/fees')
                      }
                    >
                      <CreditCard className="size-4" />
                      {text('openPaymentDetails')}
                    </NButton>
                  </NCardFooter>
                </div>
              )}
            </NCard>

            <NCard title={text('upcomingEvents')} icon={CalendarDays} className="flex h-full w-full">
              <NCardAction>
                <NButton type="button" variant="ghost" size="sm" onClick={() => router.push('/calendar')}>
                  {text('upcomingEvents')}
                </NButton>
              </NCardAction>

              {dashboard.upcomingEvents.length === 0 ? (
                <NEmptyState
                  icon={CalendarDays}
                  title={text('noEvents')}
                  description={text('noEventsDescription')}
                  className="min-h-56"
                />
              ) : (
                <div className="flex flex-col gap-2 overflow-y-auto">
                  {dashboard.upcomingEvents.map((event) => (
                    <button
                      type="button"
                      key={event.id}
                      onClick={() => router.push('/calendar')}
                      className="flex w-full gap-3 rounded-lg border border-border/50 p-2 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <time className="flex w-11 shrink-0 flex-col items-center justify-center text-primary">
                        <span className="text-xs font-semibold uppercase">
                          {formatDate(event.startDate, locale, { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold leading-none">
                          {formatDate(event.startDate, locale, { day: '2-digit' })}
                        </span>
                      </time>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{event.title}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock3 className="size-3" />
                          {event.startTime ? String(event.startTime).slice(0, 5) : text('allDay')}
                          {event.endTime ? ` – ${String(event.endTime).slice(0, 5)}` : ''}
                        </p>
                        <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">
                            {event.venue ?? event.location ?? text('schoolCampus')}
                          </span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </NCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentProfile;
