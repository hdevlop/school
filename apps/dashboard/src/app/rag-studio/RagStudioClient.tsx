'use client';

import { RagStudio, RagStudioProvider } from 'najm-rag/studio';
import 'najm-rag/studio/styles.css';

import { auth } from '@/najm.auth';

// The studio calls the API with the dashboard's own access token, which the
// auth client keeps refreshed, so an admin does not sign in a second time.
const authHeaders = (): HeadersInit => {
  const token = auth.client.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function RagStudioClient() {
  return (
    <RagStudioProvider apiBase="/api/rag-studio" basePath="/rag-studio" auth="session" getAuthHeaders={authHeaders}>
      <div style={{ height: '100dvh', maxHeight: '100dvh', width: '100%', overflow: 'hidden' }}>
        <RagStudio />
      </div>
    </RagStudioProvider>
  );
}
