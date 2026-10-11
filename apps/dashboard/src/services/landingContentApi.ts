import { api } from './http';
import type { LandingContent } from '@sms/contracts';
export const getLandingContentApi = async (): Promise<{ data: LandingContent }> => (await api.get('/landing/content')).data;
export const saveLandingContentApi = async (content: LandingContent) => (await api.put('/landing/content', content)).data;
