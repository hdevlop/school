'use client';

import { useEntityCRUD } from 'najm-kit/query/crud';
import * as eventApi from '@/services/eventApi';
import { useYearScopedDetail, useYearScopedList } from '@/features/AcademicYears/hooks/useYearScopedQuery';

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
    useYearScopedList({ resource: 'events', fetch: eventApi.getEventsApi, enabled });
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
