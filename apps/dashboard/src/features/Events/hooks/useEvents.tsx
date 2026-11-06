'use client';

import { useEntityCRUD } from 'najm-kit/query/crud';
import * as eventApi from '@/services/eventApi';
import { useYearScopedDetail, useYearScopedList, type YearScopedRead } from '@/features/AcademicYears/hooks/useYearScopedQuery';

/** The list this feature's page opens with; the page warm-up asks for the same. */
export const eventListRead = { resource: 'events', fetch: eventApi.getEventsApi } satisfies YearScopedRead;

// The viewed year's events: those whose dates overlap it. Mutations refresh every year.
export const useEvents = (options?) => {
  const { eventId, enabled = true } = options || {};

  const crud = useEntityCRUD('events', {
    getAll: eventApi.getEventsApi,
    create: eventApi.createEventApi,
    update: eventApi.updateEventApi,
    delete: eventApi.deleteEventApi,
  });

  const { data: events, isLoading: isEventsLoading, isError, error, refetch } =
    useYearScopedList({ ...eventListRead, enabled });
  const { data: event, isLoading: isEventLoading } = useYearScopedDetail({
    resource: 'events', parts: [eventId], fetch: () => eventApi.getEventByIdApi(eventId), enabled: !!eventId,
  });
  const { mutateAsync: createEvent, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateEvent, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteEvent, isLoading: isDeleting } = crud.useDelete();

  return {
    events,
    event,
    isError,
    error,
    refetch,
    createEvent,
    updateEvent,
    deleteEvent,
    isEventsLoading,
    isEventLoading,
    isCreating,
    isUpdating,
    isDeleting,
  };
};
