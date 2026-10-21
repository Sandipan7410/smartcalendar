import { auth } from './firebase';

/**
 * fetch() for the app's own /api routes. Attaches the signed-in user's Firebase
 * ID token so the server can confirm the request comes from a real app user
 * before it spends Gemini quota.
 */
export async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const user = auth.currentUser;
  if (user) {
    headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  }
  return fetch(url, { ...init, headers });
}
