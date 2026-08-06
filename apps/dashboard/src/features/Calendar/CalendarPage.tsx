'use client';

import { NButton, NPageHeader, NPageHeaderActions, NTabs } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';

import React, { useCallback, useMemo, useState } from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  Bell,
  CalendarDays,
  Clock,
  Megaphone,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card } from 'najm-kit';
import { cn } from '@/lib/utils';
import { useAnnouncements } from '@/features/Announcements/hooks/useAnnouncements';
import AnnouncementForm from '@/features/Announcements/components/AnnouncementForm';
import EventForm from '@/features/Events/components/EventForm';
import { useEvents } from '@/features/Events/hooks/useEvents';
import { useTranslation } from '@/hooks/useLanguage';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import PageLoadingState from '@/shared/PageLoadingState';

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

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

export default function CalendarPage() {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(startOfDay(new Date()));
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

  const { openDialog, confirmDelete } = useConfirmDelete();

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
    const today = startOfDay(new Date());
    setCurrentDate(today);
    setSelectedDate(today);
  }, []);

  const handleSelectDate = useCallback((day: Date) => {
    setSelectedDate(day);
    if (viewMode === 'week') setCurrentDate(day);
  }, [viewMode]);

  const openEventDialog = (event = null) => {
    const isEdit = Boolean(event?.id);
    openDialog({
      title: isEdit ? `Edit Event - ${event.title}` : 'Create Event',
      children: <EventForm event={event} initialDate={selectedDate} />,
      primaryButton: {
        form: 'event-form',
        text: isEdit ? 'Update Event' : 'Create Event',
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
      title: isEdit ? `Edit Announcement - ${announcement.title}` : 'Create Announcement',
      children: (
        <AnnouncementForm
          announcement={announcement}
          defaultPublishDate={selectedDate ? toDateInput(selectedDate) : undefined}
        />
      ),
      primaryButton: {
        form: 'announcement-form',
        text: isEdit ? 'Update Announcement' : 'Create Announcement',
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
      itemName: item.title,
      confirmText: item.source === 'event' ? 'Delete Event' : 'Delete Announcement',
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
    ? format(currentDate, 'MMMM yyyy')
    : `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`;
  const displayDate = selectedDate || currentDate;
  const maxItems = viewMode === 'week' ? 7 : 4;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3">
      <NPageHeader icon={CalendarDays} title={t('navigation.calendar')}>
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border bg-card py-0 shadow-sm">
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4">
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background shadow-sm">
              <span className="text-sm font-bold leading-none text-foreground">{format(displayDate, 'd')}</span>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">{headerLabel}</h2>
            </div>
          </div>

          <div className="hidden flex-1 items-center justify-center gap-3 text-[11px] leading-none text-muted-foreground md:flex">
            <span className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', itemStyle.event.dot)} />
              Events
            </span>
            <span className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', itemStyle.announcement.dot)} />
              Announcements
            </span>
          </div>

          <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
            <NButton
              size="sm"
              variant="plain"
              onClick={goToToday}
              className="h-8 border border-dashed border-primary bg-background px-3 text-primary hover:bg-primary/10"
            >
              <CalendarDays className="size-3.5" />
              Today
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
                { value: 'month', label: 'Month view', icon: CalendarDays, content: null },
                { value: 'week', label: 'Week view', icon: Clock, content: null },
              ]}
            />
            <NButton size="sm" onClick={() => openEventDialog()} className="h-8 px-3">
              <Plus className="size-3.5" />
              Add event
            </NButton>
            <NButton size="sm" variant="tertiary" onClick={() => openAnnouncementDialog()} className="h-8 px-3">
              <Bell className="size-3.5" />
              Add announcement
            </NButton>
          </div>
        </div>

        {isLoading ? (
          <PageLoadingState label="Loading calendar..." className="min-h-0 flex-1" />
        ) : (
          <div className="flex min-h-0 flex-1 overflow-auto">
            <div className="flex min-w-[780px] flex-1 flex-col">
              <div className="grid shrink-0 grid-cols-7 border-b bg-secondary text-secondary-foreground">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="flex h-9 items-center justify-center border-r border-secondary-foreground/20 px-3 text-[11px] font-semibold text-secondary-foreground last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              <div
                className="grid min-h-0 flex-1 grid-cols-7"
                style={{ gridTemplateRows: `repeat(${Math.ceil(daysInView.length / 7)}, minmax(0, 1fr))` }}
              >
                {daysInView.map((day, index) => {
                  const dayItems = getItemsForDay(day);
                  const inMonth = viewMode === 'month' ? isSameMonth(day, currentDate) : true;
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const currentDay = isToday(day);

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
                        'group relative flex min-h-0 min-w-0 flex-col gap-1.5 border-r border-b bg-muted/60 p-2 text-left outline-none transition-colors last:border-r-0',
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
                          <span className="text-[10px] font-medium text-muted-foreground">{dayItems.length}</span>
                        )}
                      </div>

                      <div className="flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden">
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
                                onClick={() => handleEditItem(item)}
                                className={cn('min-w-0 flex-1 cursor-pointer truncate text-left font-medium', style.text)}
                                title={item.title}
                              >
                                {item.title}
                              </button>
                              {item.time && (
                                <span className={cn('hidden shrink-0 text-[10px] font-semibold md:inline', style.text)}>
                                  {item.time.split(' - ')[0]}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item)}
                                className="hidden shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-destructive group-hover/item:block"
                                aria-label={`Delete ${item.title}`}
                              >
                                <Trash2 className="size-3" />
                              </button>
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
                            {dayItems.length - maxItems} more...
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
