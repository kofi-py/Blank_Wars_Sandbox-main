import { apiClient } from './apiClient';

export async function ensureDevSession() {
  if (process.env.NODE_ENV !== 'development') return;
  try {
    // If you already have a session cookie, this is a no-op on the server.
    await apiClient.post('/auth/dev-session', {});
  } catch (e) {
    console.warn('[auth] dev-session creation failed', e);
  }
}