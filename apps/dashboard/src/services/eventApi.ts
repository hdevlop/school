import { api } from './http';

export const getEventsApi = async () => {
  const res = await api.get('/events');
  return res.data;
};

export const getEventByIdApi = async (id: string) => {
  const res = await api.get(`/events/${id}`);
  return res.data;
};

export const createEventApi = async (data) => {
  const res = await api.post('/events', data);
  return res.data;
};

export const updateEventApi = async (data) => {
  const res = await api.put(`/events/${data.id}`, data);
  return res.data;
};

export const deleteEventApi = async (id: string) => {
  const res = await api.delete(`/events/${id}`);
  return res.data;
};
