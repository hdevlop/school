"use client";

import React, { useMemo, useState } from 'react';
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
  NajmScroll,
  NLoadingState,
  NPageHeader,
  NPageHeaderActions,
  NProgress,
  NStatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useDialog,
} from 'najm-kit';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  Pencil,
  ReceiptText,
  Star,
  UserRound,
  UsersRound,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'najm-i18n/react';
import type { TranslationParams } from 'najm-i18n';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useParentDashboard } from '../../hooks/useParentDashboard';
import { usePermissions } from 'najm-auth/client/react';
import { useParents } from '../../hooks/useParents';
import ParentForm from '../SimpleParentForm';
import ParentAttentionCard from './ParentAttentionCard';
import ParentDetailsTab from './ParentDetailsTab';

const TABS = ['overview', 'details'] as const;
type ParentTab = (typeof TABS)[number];

const TAB_ICONS: Record<ParentTab, typeof UserRound> = {
  overview: LayoutDashboard,
  details: UserRound,
};

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
  const { majorMoney } = useSchoolFormat();
  const { viewingYear } = useViewingAcademicYear();
  const { openDialog } = useDialog();
  const { can } = usePermissions();
  const { updateParent, isUpdating } = useParents({ enabled: false });
  const [tab, setTab] = useState<ParentTab>('overview');
  const locale = language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-MA' : 'en-US';
  const text = (key: string, params?: TranslationParams) =>
    t(`parents.profile.dashboard.${key}`, params);

  const {
    parent,
    children,
    currentChildren,
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

    // Upcoming assessments and events are today's, so they match today's classes.
    const childClassIds = new Set(currentChildren.map((child) => child.classId).filter(Boolean));
    const childSectionIds = new Set(currentChildren.map((child) => child.sectionId).filter(Boolean));

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
    const overdueFees = childData.reduce((sum, item) => sum + item.overdueAmount, 0);
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

    const absences = attendanceRows.filter((row) => row.status === 'absent').length;
    const lateArrivals = attendanceRows.filter((row) => row.status === 'late').length;
    // Below half marks. A grade without a total says nothing either way.
    const lowGrades = gradeRows.filter((grade) => {
      const total = toNumber(grade?.assessment?.totalMarks ?? grade?.exam?.totalMarks);
      return total > 0 && toNumber(grade?.marksObtained) / total < 0.5;
    }).length;
    const incidentCounts = childData.map((item) => item.openIncidents).filter((count): count is number => count !== null);
    const openIncidents = incidentCounts.length ? incidentCounts.reduce((sum, count) => sum + count, 0) : null;

    // With one child each row opens that child's own page; with several, the
    // list of children, since there is no family-wide view to send it to.
    const onlyChild = children.length === 1 ? children[0] : null;
    const overdueChild = childData.find((item) => item.overdueAmount > 0)?.child;
    const attentionLinks = {
      fees: overdueChild?.id ? `/students/${overdueChild.id}/fees` : onlyChild ? `/students/${onlyChild.id}/fees` : '/students',
      attendance: onlyChild ? `/students/${onlyChild.id}` : '/students',
      assessments: '/assessments',
      grades: onlyChild ? `/students/${onlyChild.id}` : '/grades',
      discipline: '/discipline',
    };

    return {
      absences,
      lateArrivals,
      lowGrades,
      openIncidents,
      attentionLinks,
      averageGrade,
      overallAttendance,
      pendingAssessments,
      upcomingEvents,
      recentGrades,
      totalFees,
      totalPaid,
      outstandingFees,
      overdueFees,
      paymentProgress,
      nextFee,
      attendanceChart,
    };
  }, [assessments, childData, children, currentChildren, events, locale]);

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

  const handleEdit = () => {
    openDialog({
      title: `${t('parents.dialogs.editTitle')} - ${parent.name}`,
      children: <ParentForm parent={parent} />,
      width: '4xl',
      primaryButton: {
        form: 'parent-form',
        text: t('parents.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (parentData) => {
          await updateParent(parentData);
          void refetch();
        },
      },
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={UsersRound}
        title={parent.name}
        subtitle={text('subtitle')}
      >
        <NPageHeaderActions>
          <NButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push('/parents')}
            aria-label={text('backToParents')}
            className="gap-2"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            <span className="max-sm:hidden">{text('backToParents')}</span>
          </NButton>
          {can('update:parents') ? (
            <NButton type="button" variant="outline" size="sm" onClick={handleEdit} className="gap-2">
              <Pencil className="size-4" />
              {t('common.edit')}
            </NButton>
          ) : null}
          {/* Same as the teacher overview: the date gives way to the title on phones. */}
          <NButton type="button" variant="outline" size="sm" className="gap-2 max-md:hidden">
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

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as ParentTab)}
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-3"
      >
        <TabsList variant="underline" className="shrink-0 flex-wrap justify-start">
          {TABS.map((value) => {
            const Icon = TAB_ICONS[value];
            return (
              <TabsTrigger
                key={value}
                value={value}
                variant="underline"
                className="gap-2 data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <Icon className="size-4" aria-hidden="true" />
                {text(`tabs.${value}`)}
              </TabsTrigger>
            );
          })}
        </TabsList>

      <NajmScroll axis="y" className="min-h-0 flex-1">
        <TabsContent value="details" className="mt-0 h-full">
          <ParentDetailsTab parent={parent} linkedChildren={children} />
        </TabsContent>
        <TabsContent value="overview" className="mt-0 h-full">
        <div className="flex min-h-full flex-col gap-3 pb-1">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
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
            <NStatCard
              icon={Wallet}
              label={text('outstandingBalance')}
              value={majorMoney(dashboard.outstandingFees)}
              onClick={() => router.push('/fees')}
            />
            <NStatCard
              icon={AlertTriangle}
              label={text('overdueAmount')}
              value={majorMoney(dashboard.overdueFees)}
              classNames={dashboard.overdueFees > 0 ? { value: 'text-destructive' } : undefined}
              onClick={() => router.push('/fees')}
            />
          </div>

          {/* Three equal columns, as on the teacher overview, so the chart is not
              stretched across two thirds of the page. */}
          <div className="grid min-h-[320px] flex-1 grid-cols-1 gap-3 xl:grid-cols-3 [&>*]:min-h-0 [&>*]:min-w-0">
            <NCard
              title={text('myChildren')}
              icon={UsersRound}
              className="flex h-full w-full"
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
                          fallback={child.name}
                          size="md"
                          version={child.updatedAt}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{child.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {/* A viewed year's read carries enrollment: null when not enrolled that year. */}
                            {child.enrollment === null
                              ? t('academicYearViewing.notEnrolled', { year: viewingYear ?? '' })
                              : child.class?.name ?? text('class')}
                            {child.section?.name ? ` · ${child.section.name}` : ''}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <NBadge look="soft">
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
              className="flex h-full w-full"
              // The card stretches to its row; the content must too, or the
              // chart's flex-1 stops at its 220px minimum and leaves a gap.
              classNames={{ content: 'min-h-0 flex-1' }}
            >
              <NCardAction>
                <NButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/attendance/students')}
                >
                  {text('viewAllAttendance')}
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
                      <BarChart data={dashboard.attendanceChart} margin={{ top: 8, right: 14, left: -14, bottom: 0 }} barGap={4} barCategoryGap="30%">
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
                          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                          formatter={(value, name) => [value ?? 0, name]}
                          contentStyle={{
                            borderRadius: 'var(--radius)',
                            borderColor: 'hsl(var(--border))',
                            fontSize: 12,
                          }}
                        />
                        <Bar
                          dataKey="absent"
                          name={t('dashboard.attendance.absent')}
                          fill={ABSENT_COLOR}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        />
                        <Bar
                          dataKey="late"
                          name={t('dashboard.attendance.late')}
                          fill={LATE_COLOR}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </NCard>

            <ParentAttentionCard
              overdueAmount={dashboard.overdueFees}
              absences={dashboard.absences}
              lateArrivals={dashboard.lateArrivals}
              upcomingAssessments={dashboard.pendingAssessments.length}
              lowGrades={dashboard.lowGrades}
              openIncidents={dashboard.openIncidents}
              links={dashboard.attentionLinks}
            />
          </div>

          <div className="grid min-h-[320px] flex-1 grid-cols-1 gap-3 xl:grid-cols-3 [&>*]:min-h-0 [&>*]:min-w-0">
            <NCard title={text('recentGrades')} icon={Award} className="flex h-full w-full">
              <NCardAction>
                <NButton type="button" variant="ghost" size="sm" onClick={() => router.push('/grades')}>
                  {text('viewAllGrades')}
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
                        <NBadge look="soft">
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
                      {majorMoney(dashboard.outstandingFees)}
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
                          amount: majorMoney(dashboard.totalPaid),
                        })}
                      </span>
                      <span>
                        {text('totalAmount', {
                          amount: majorMoney(dashboard.totalFees),
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
                  {text('viewAllEvents')}
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
        </TabsContent>
      </NajmScroll>
      </Tabs>
    </div>
  );
};

export default ParentProfile;
