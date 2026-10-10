'use client';

import { useDialog, NButton, NPageHeader, NPageHeaderActions, NTabs, NLoadingState } from 'najm-kit';

import React, { useCallback, useMemo, useState } from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  Bell,
  CalendarDays,
  Clock,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card } from 'najm-kit';
import { cn } from 'najm-kit';
import { useAnnouncements } from '@/features/Announcements/hooks/useAnnouncements';
import AnnouncementForm from '@/features/Announcements/components/AnnouncementForm';
import EventForm from '@/features/Events/components/EventForm';
import { useEvents } from '@/features/Events/hooks/useEvents';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat, useSchoolToday } from '@/hooks/useSchoolFormat';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useViewingYearCalendar, useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { dateWithinYear } from '@/features/AcademicYears/utils/viewingYear';

type CalendarItemType = 'event' | 'announcement';

type CalendarItem = {
  id: string;
  source: CalendarItemType;
  title: string;
  date: Date;
  endDate?: Date;
  time?: string;
  location?: string;
  description?: string;
  status?: string;
  audience?: string;
  raw: any;
};

type ViewMode = 'month' | 'week';



const itemStyle = {
  event: {
    dot: 'bg-sky-500',
    bg: 'bg-sky-50 hover:bg-sky-100 dark:bg-sky-400/15 dark:hover:bg-sky-400/20',
    border: 'border-sky-200 dark:border-sky-400/25',
    text: 'text-sky-800 dark:text-sky-200',
    badge: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/25 dark:bg-sky-400/15 dark:text-sky-200',
  },
  announcement: {
    dot: 'bg-rose-500',
    bg: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-400/15 dark:hover:bg-rose-400/20',
    border: 'border-rose-200 dark:border-rose-400/25',
    text: 'text-rose-800 dark:text-rose-200',
    badge: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/15 dark:text-rose-200',
  },
};

const toLocalDate = (value?: string | Date | null) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const dateText = String(value);
  const [datePart] = dateText.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return new Date(year, month - 1, day);
};

const toDateInput = (value: Date) => format(value, 'yyyy-MM-dd');

const formatTimeRange = (start?: string, end?: string) => {
  if (start && end) return `${start} - ${end}`;
  return start || end || undefined;
};

const getItemDate = (item: CalendarItem) => item.date;

// The events and announcements are the viewed year's, so the calendar opens on
// a day of that year: today while the year holds it, otherwise its nearest
// teaching day, as the attendance date does.
function CalendarPageForYear({ openingDay }: Readonly<{ openingDay: Date }>) {
  const { t } = useTranslation();
  const { displayDate, locale } = useSchoolFormat();
  const today = useSchoolToday();
  const todayDate = useMemo(() => toLocalDate(today), [today]);
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1 + index))));
  // Everyone reads the calendar; only administrators add, change or delete on it.
  const { role } = useViewerRole();
  const canManage = role === 'admin' || role === 'principal';
  const [currentDate, setCurrentDate] = useState(openingDay);
  const [selectedDate, setSelectedDate] = useState<Date | null>(openingDay);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const {
    events,
    createEvent,
    updateEvent,
    deleteEvent,
    isEventsLoading,
    isCreating: isCreatingEvent,
    isUpdating: isUpdatingEvent,
    isDeleting: isDeletingEvent,
  } = useEvents();

  const {
    announcements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    isAnnouncementsLoading,
    isCreating: isCreatingAnnouncement,
    isUpdating: isUpdatingAnnouncement,
    isDeleting: isDeletingAnnouncement,
  } = useAnnouncements();

  const { openDialog, confirmDelete } = useDialog();

  const calendarItems = useMemo<CalendarItem[]>(() => {
    const eventItems = (events || [])
      .map((event) => {
        const date = toLocalDate(event.startDate);
        if (!date) return null;

        return {
          id: `event-${event.id}`,
          source: 'event' as const,
          title: event.title,
          date,
          endDate: toLocalDate(event.endDate) || undefined,
          time: formatTimeRange(event.startTime, event.endTime),
          location: event.venue || event.location,
          description: event.description,
          status: event.status,
          raw: event,
        };
      })
      .filter(Boolean) as CalendarItem[];

    const announcementItems = (announcements || [])
      .map((announcement) => {
        const date = toLocalDate(announcement.publishDate);
        if (!date) return null;

        return {
          id: `announcement-${announcement.id}`,
          source: 'announcement' as const,
          title: announcement.title,
          date,
          description: announcement.content,
          status: announcement.isPublished ? 'published' : 'draft',
          audience: announcement.targetAudience,
          raw: announcement,
        };
      })
      .filter(Boolean) as CalendarItem[];

    return [...eventItems, ...announcementItems].sort((a, b) => {
      const dateDiff = getItemDate(a).getTime() - getItemDate(b).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.title.localeCompare(b.title);
    });
  }, [events, announcements]);

  const daysInView = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calStart, end: calEnd });
    }

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate, viewMode]);

  const getItemsForDay = useCallback(
    (day: Date) => calendarItems.filter((item) => isSameDay(item.date, day)),
    [calendarItems],
  );

  const isLoading = isEventsLoading || isAnnouncementsLoading;

  const goToToday = useCallback(() => {
    setCurrentDate(todayDate);
    setSelectedDate(todayDate);
  }, [todayDate]);

  const handleSelectDate = useCallback((day: Date) => {
    setSelectedDate(day);
    if (viewMode === 'week') setCurrentDate(day);
  }, [viewMode]);

  const openEventDialog = (event = null) => {
    const isEdit = Boolean(event?.id);
    openDialog({
      title: isEdit ? `${t('events.dialogs.editTitle')} - ${event.title}` : t('events.dialogs.createTitle'),
      children: <EventForm event={event} initialDate={selectedDate} />,
      primaryButton: {
        form: 'event-form',
        text: isEdit ? t('events.dialogs.updateButton') : t('events.dialogs.createButton'),
        loading: isEdit ? isUpdatingEvent : isCreatingEvent,
        onClick: async (data) => {
          if (isEdit) {
            await updateEvent(data);
            return;
          }
          await createEvent(data);
        },
      },
    });
  };

  const openAnnouncementDialog = (announcement = null) => {
    const isEdit = Boolean(announcement?.id);
    openDialog({
      title: isEdit ? `${t('announcements.dialogs.editTitle')} - ${announcement.title}` : t('announcements.dialogs.createTitle'),
      children: (
        <AnnouncementForm
          announcement={announcement}
          defaultPublishDate={selectedDate ? toDateInput(selectedDate) : undefined}
        />
      ),
      primaryButton: {
        form: 'announcement-form',
        text: isEdit ? t('announcements.dialogs.updateButton') : t('announcements.dialogs.createButton'),
        loading: isEdit ? isUpdatingAnnouncement : isCreatingAnnouncement,
        onClick: async (data) => {
          if (isEdit) {
            await updateAnnouncement(data);
            return;
          }
          await createAnnouncement(data);
        },
      },
    });
  };

  const handleEditItem = (item: CalendarItem) => {
    if (item.source === 'event') {
      openEventDialog(item.raw);
      return;
    }
    openAnnouncementDialog(item.raw);
  };

  const handleDeleteItem = (item: CalendarItem) => {
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: item.title,
      confirmText: item.source === 'event' ? t('events.dialogs.deleteButton') : t('announcements.dialogs.deleteButton'),
      loading: item.source === 'event' ? isDeletingEvent : isDeletingAnnouncement,
      onConfirm: async () => {
        if (item.source === 'event') {
          await deleteEvent(item.raw.id);
          return;
        }
        await deleteAnnouncement(item.raw.id);
      },
    });
  };

  const headerLabel = viewMode === 'month'
    ? displayDate(currentDate, { month: 'long', year: 'numeric' })
    : t('calendar.weekOf', { date: displayDate(startOfWeek(currentDate, { weekStartsOn: 1 }), { month: 'short', day: 'numeric', year: 'numeric' }) });
  const selectedDisplayDate = selectedDate || currentDate;
  const selectedDayLabel = displayDate(selectedDisplayDate, { weekday: 'long', day: 'numeric', month: 'long' });
  const selectedItems = getItemsForDay(selectedDisplayDate);
  const maxItems = viewMode === 'week' ? 7 : 4;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3">
      <NPageHeader icon={CalendarDays} title={t('navigation.calendar')}>
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border bg-card py-0 shadow-sm">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background shadow-sm">
              <span className="text-sm font-bold leading-none text-foreground">{format(selectedDisplayDate, 'd')}</span>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">{headerLabel}</h2>
            </div>
          </div>

          <div className="hidden flex-1 items-center justify-center gap-3 text-[11px] leading-none text-muted-foreground md:flex">
            <span className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', itemStyle.event.dot)} />
              {t('calendar.events')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', itemStyle.announcement.dot)} />
              {t('navigation.announcements')}
            </span>
          </div>

          {/* Icons only at phone width, where the labels did not fit one row. */}
          <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
            <NButton
              size="sm"
              variant="plain"
              onClick={goToToday}
              aria-label={t('calendar.today')}
              title={t('calendar.today')}
              className="h-8 border border-dashed border-primary bg-background px-3 text-primary hover:bg-primary/10"
            >
              <CalendarDays className="size-3.5" aria-hidden />
              <span className="max-sm:hidden">{t('calendar.today')}</span>
            </NButton>
            <NTabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as ViewMode)}
              color="primary"
              classNames={{
                list: 'h-8 rounded-md bg-primary/10 p-0.5',
                trigger: 'h-7 rounded px-3 text-xs font-medium data-[state=active]:text-primary-foreground',
              }}
              styles={{
                activeTrigger: {
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                },
              }}
              items={[
                { value: 'month', label: <span className="max-sm:sr-only">{t('calendar.monthView')}</span>, icon: CalendarDays, content: null },
                { value: 'week', label: <span className="max-sm:sr-only">{t('calendar.weekView')}</span>, icon: Clock, content: null },
              ]}
            />
            {canManage && (
              <>
                <NButton
                  size="sm"
                  onClick={() => openEventDialog()}
                  aria-label={t('calendar.addEvent')}
                  title={t('calendar.addEvent')}
                  className="h-8 px-3"
                >
                  <Plus className="size-3.5" aria-hidden />
                  <span className="max-sm:hidden">{t('calendar.addEvent')}</span>
                </NButton>
                <NButton
                  size="sm"
                  variant="tertiary"
                  onClick={() => openAnnouncementDialog()}
                  aria-label={t('calendar.addAnnouncement')}
                  title={t('calendar.addAnnouncement')}
                  className="h-8 px-3"
                >
                  <Bell className="size-3.5" aria-hidden />
                  <span className="max-sm:hidden">{t('calendar.addAnnouncement')}</span>
                </NButton>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <NLoadingState surface="panel" label={t('calendar.loading')} className="min-h-0 flex-1" />
        ) : (
          // At phone width the seven days fit the screen as a compact grid of
          // dots, and the selected day's items are listed under it instead of
          // inside cells too narrow to read.
          <div className="flex min-h-0 flex-1 flex-col overflow-auto">
            <div className="flex flex-col max-sm:shrink-0 sm:min-w-[780px] sm:flex-1">
              <div className="grid shrink-0 grid-cols-7 border-b bg-secondary text-secondary-foreground">
                {weekdays.map((day) => (
                  <div key={day} className="flex h-9 items-center justify-center border-r border-secondary-foreground/20 px-0.5 text-[11px] font-semibold text-secondary-foreground last:border-r-0 sm:px-3">
                    {day}
                  </div>
                ))}
              </div>

              <div
                className="grid min-h-0 grid-cols-7 sm:flex-1 sm:[grid-template-rows:repeat(var(--calendar-rows),minmax(0,1fr))]"
                style={{ '--calendar-rows': Math.ceil(daysInView.length / 7) } as React.CSSProperties}
              >
                {daysInView.map((day, index) => {
                  const dayItems = getItemsForDay(day);
                  const inMonth = viewMode === 'month' ? isSameMonth(day, currentDate) : true;
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const currentDay = isSameDay(day, todayDate);

                  return (
                    <div
                      key={day.toISOString()}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectDate(day)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') handleSelectDate(day);
                      }}
                      className={cn(
                        'group relative flex min-h-0 min-w-0 flex-col gap-1.5 border-r border-b bg-muted/60 p-2 text-left outline-none transition-colors last:border-r-0 max-sm:h-14 max-sm:items-center max-sm:gap-1 max-sm:p-1',
                        index % 7 === 6 && 'border-r-0',
                        'hover:bg-muted/80 focus:z-10 focus:ring-2 focus:ring-primary/35 focus:ring-inset',
                        !inMonth && 'bg-muted/80 text-muted-foreground/55',
                        currentDay && 'bg-primary/[0.09]',
                        isSelected && 'z-10 ring-2 ring-primary/35 ring-inset',
                      )}
                    >
                      <div className="flex h-5 items-center justify-between gap-2">
                        <span
                          className={cn(
                            'flex size-5 items-center justify-center rounded-full text-[11px] font-semibold',
                            currentDay && 'bg-tertiary text-tertiary-foreground',
                            isSelected && !currentDay && 'bg-primary text-primary-foreground',
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                        {dayItems.length > 0 && (
                          <span className="text-[10px] font-medium text-muted-foreground max-sm:hidden">{dayItems.length}</span>
                        )}
                      </div>

                      {dayItems.length > 0 && (
                        <div className="flex items-center justify-center gap-0.5 sm:hidden" aria-hidden>
                          {dayItems.slice(0, 3).map((item) => (
                            <span key={item.id} className={cn('size-1.5 rounded-full', itemStyle[item.source].dot)} />
                          ))}
                        </div>
                      )}

                      <div className="flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden max-sm:hidden">
                        {dayItems.slice(0, maxItems).map((item) => {
                          const style = itemStyle[item.source];
                          const Icon = item.source === 'event' ? CalendarDays : Megaphone;

                          return (
                            <div
                              key={item.id}
                              className={cn(
                                'group/item flex min-w-0 cursor-pointer items-center gap-1 rounded border px-1.5 py-1 text-[11px] leading-none shadow-sm',
                                style.border,
                                style.bg,
                              )}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Icon className={cn('size-3 shrink-0', style.text)} />
                              <button
                                type="button"
                                onClick={canManage ? () => handleEditItem(item) : undefined}
                                className={cn('min-w-0 flex-1 truncate text-left font-medium', canManage && 'cursor-pointer', style.text)}
                                title={item.title}
                              >
                                {item.title}
                              </button>
                              {item.time && (
                                <span className={cn('hidden shrink-0 text-[10px] font-semibold md:inline', style.text)}>
                                  {item.time.split(' - ')[0]}
                                </span>
                              )}
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item)}
                                  className="hidden shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-destructive group-hover/item:block"
                                  aria-label={`${t('common.delete')} ${item.title}`}
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {dayItems.length > maxItems && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleSelectDate(day);
                            }}
                            className="w-fit cursor-pointer rounded px-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            {t('calendar.more', { count: dayItems.length - maxItems })}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <section className="flex flex-col gap-2 p-3 sm:hidden" aria-label={selectedDayLabel}>
              <h3 className="text-sm font-semibold text-foreground">{selectedDayLabel}</h3>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('calendar.noItemsOnDay')}</p>
              ) : selectedItems.map((item) => {
                const style = itemStyle[item.source];
                const Icon = item.source === 'event' ? CalendarDays : Megaphone;

                return (
                  <div key={item.id} className={cn('flex min-w-0 items-center gap-2 rounded-md border px-3 py-2', style.border, style.bg)}>
                    <Icon className={cn('size-4 shrink-0', style.text)} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm font-medium', style.text)}>{item.title}</p>
                      {(item.time || item.location) && (
                        <p className="truncate text-xs text-muted-foreground">
                          {[item.time, item.location].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    {canManage && (
                      <>
                        <NButton size="icon" variant="ghost" className="size-8 shrink-0" onClick={() => handleEditItem(item)} aria-label={`${t('common.edit')} ${item.title}`}>
                          <Pencil className="size-4" aria-hidden />
                        </NButton>
                        <NButton size="icon" variant="ghost" className="size-8 shrink-0 hover:text-destructive" onClick={() => handleDeleteItem(item)} aria-label={`${t('common.delete')} ${item.title}`}>
                          <Trash2 className="size-4" aria-hidden />
                        </NButton>
                      </>
                    )}
                  </div>
                );
              })}
            </section>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function CalendarPage() {
  const yearKey = useViewingYearKey();
  const year = useViewingYearCalendar();
  const today = useSchoolToday();
  const openingDay = toLocalDate(dateWithinYear(today, year)) ?? toLocalDate(today);
  // Remount when the viewed year changes, and once its calendar has loaded.
  return <CalendarPageForYear key={`${yearKey}:${year ? 'dated' : 'pending'}`} openingDay={openingDay} />;
}
