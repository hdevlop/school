import { auth } from '@/najm.auth';
import { AuthError } from 'najm-auth/client';
import { captureRequestHeaders, languageHeader } from '@/lib/requestHeaders';
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

/**
 * The headers of a request, read once, synchronously, as it starts (see
 * `lib/requestHeaders`): the interface language, so the server answers in it,
 * and the scoped headers, which authentication endpoints do not get. The same
 * object is reused for the request's retries, so a retry keeps its headers.
 */
function headersFor(url: string): Record<string, string> | undefined {
  const headers = {
    ...languageHeader(),
    ...(url.startsWith('/auth/') ? {} : captureRequestHeaders()),
  };
  return Object.keys(headers).length ? headers : undefined;
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
    const headers = headersFor(path);
    await ensureAccessToken(path);
    const result = await auth.api.get(path, headers ? { headers } : undefined);
    return wrap(result);
  },

  async post(url: string, data?: any): Promise<{ data: any }> {
    const headers = headersFor(url);
    await ensureAccessToken(url);
    const result = await auth.api.post(url, { body: data, headers });
    return wrap(result);
  },

  async put(url: string, data?: any): Promise<{ data: any }> {
    const headers = headersFor(url);
    await ensureAccessToken(url);
    const result = await auth.api.put(url, { body: data, headers });
    return wrap(result);
  },

  async patch(url: string, data?: any): Promise<{ data: any }> {
    const headers = headersFor(url);
    await ensureAccessToken(url);
    const result = await auth.api.patch(url, { body: data, headers });
    return wrap(result);
  },

  async delete(url: string, opts?: { data?: any }): Promise<{ data: any }> {
    const headers = headersFor(url);
    await ensureAccessToken(url);
    const result = await auth.api.delete(url, { body: opts?.data, headers });
    return wrap(result);
  },
};

async function fetchWithAuth(method: string, url: string, body?: any) {
  const scoped = headersFor(url);
  await ensureAccessToken(url);
  const token = auth.client.getAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json', ...scoped };
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
      throw new AuthError(retry.status, errBody.message || retry.statusText, errBody);
    }
    return { data: await retry.json() };
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new AuthError(res.status, errBody.message || res.statusText, errBody);
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
