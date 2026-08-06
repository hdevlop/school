import { auth } from '@/lib/auth';
import { toFormData, hasFiles } from './formDataHelper';

function buildURL(path: string, params?: Record<string, any>): string {
  if (!params) return path;
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (entries.length === 0) return path;
  const qs = new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)])
  ).toString();
  return qs ? `${path}?${qs}` : path;
}

function wrap(body: any): { data: any } {
  return { data: body };
}

let pendingAccessTokenRefresh: Promise<void> | null = null;

async function ensureAccessToken(url: string) {
  if (url.startsWith('/auth/')) return;

  const state = auth.client.getState();
  if (!state.isAuthenticated || state.accessToken) return;

  pendingAccessTokenRefresh ??= auth.client.refresh().finally(() => {
    pendingAccessTokenRefresh = null;
  });

  await pendingAccessTokenRefresh;
}

export const api = {
  async get(url: string, opts?: { params?: Record<string, any> }): Promise<{ data: any }> {
    const path = buildURL(url, opts?.params);
    await ensureAccessToken(path);
    const result = await auth.api.get(path);
    return wrap(result);
  },

  async post(url: string, data?: any): Promise<{ data: any }> {
    await ensureAccessToken(url);
    const result = await auth.api.post(url, data !== undefined ? { body: data } : undefined);
    return wrap(result);
  },

  async put(url: string, data?: any): Promise<{ data: any }> {
    await ensureAccessToken(url);
    const result = await auth.api.put(url, data !== undefined ? { body: data } : undefined);
    return wrap(result);
  },

  async patch(url: string, data?: any): Promise<{ data: any }> {
    await ensureAccessToken(url);
    const result = await auth.api.patch(url, data !== undefined ? { body: data } : undefined);
    return wrap(result);
  },

  async delete(url: string, opts?: { data?: any }): Promise<{ data: any }> {
    await ensureAccessToken(url);
    const fetchOpts: any = {};
    if (opts?.data !== undefined) fetchOpts.body = opts.data;
    const result = await auth.api.delete(url, Object.keys(fetchOpts).length ? fetchOpts : undefined);
    return wrap(result);
  },
};

async function fetchWithAuth(method: string, url: string, body?: any) {
  await ensureAccessToken(url);
  const token = auth.client.getAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${url}`, {
    method,
    headers,
    body,
    credentials: 'include',
  });

  if (res.status === 401 && !url.startsWith('/auth/')) {
    await auth.client.refresh();
    const newToken = auth.client.getAccessToken();
    if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
    const retry = await fetch(`/api${url}`, {
      method,
      headers,
      body,
      credentials: 'include',
    });
    if (!retry.ok) {
      const errBody = await retry.json().catch(() => ({}));
      const err: any = new Error(errBody.message || retry.statusText);
      err.response = { status: retry.status, data: errBody };
      throw err;
    }
    return { data: await retry.json() };
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const err: any = new Error(errBody.message || res.statusText);
    err.response = { status: res.status, data: errBody };
    throw err;
  }
  return { data: await res.json() };
}

async function formRequest(method: 'post' | 'put', endpoint: string, data: any) {
  if (hasFiles(data)) {
    const formData = toFormData(data);
    return fetchWithAuth(method, endpoint, formData);
  }
  return api[method](endpoint, data);
}

export const formApi = {
  post: (endpoint: string, data: any) => formRequest('post', endpoint, data),
  put: (endpoint: string, data: any) => formRequest('put', endpoint, data),
};
