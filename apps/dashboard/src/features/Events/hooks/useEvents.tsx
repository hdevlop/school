'use client';

import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as eventApi from '@/services/eventApi';

export const useEvents = (options?) => {
  const { eventId, enabled = true } = options || {};

  const crud = useEntityCRUD('events', {
    getAll: eventApi.getEventsApi,
    getById: eventApi.getEventByIdApi,
    create: eventApi.createEventApi,
    update: eventApi.updateEventApi,
    delete: eventApi.deleteEventApi,
  });

  const { data: events, isLoading: isEventsLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: event, isLoading: isEventLoading } = crud.useGetById(eventId, !!eventId);
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
