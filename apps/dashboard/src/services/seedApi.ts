import { api } from './http';
import { auth } from '@/lib/auth';
import axios from 'axios';

// Separate axios instance with a 10-minute timeout for long seed operations
const seedApi = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10 * 60 * 1000,
});

seedApi.interceptors.request.use((config) => {
  const token = auth.client.getAccessToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export interface SeedDemoOptions {
  students: number;
  teachers: number;
}

export const seedDemoApi = async (opts: SeedDemoOptions) => {
  const res = await seedApi.post('/seed/demo', opts, {
    headers: { 'seed_api_key': process.env.NEXT_PUBLIC_SEED_API_KEY || '' }
  });
  return res.data;
};

export const seedSystemApi = async () => {
  const res = await seedApi.post('/seed/system', {}, {
    headers: { 'seed_api_key': process.env.NEXT_PUBLIC_SEED_API_KEY || '' }
  });
  return res.data;
};

export const clearAllDataApi = async () => {
  const res = await api.post('/seed/clear', {});
  return res.data;
};
