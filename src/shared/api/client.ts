import createClient from 'openapi-fetch';
import { getAccessToken } from './token';
import { emitUnauthorized } from './unauthorized';
import type { paths } from './schema';

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  credentials: 'include',
});

api.use({
  onRequest({ request }) {
    const token = getAccessToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
  onResponse({ request, response }) {
    const path = new URL(request.url).pathname;
    const isAuthRequest = path.includes('/auth/');
    if (response.status === 401 && !isAuthRequest) {
      emitUnauthorized();
    }
    return response;
  },
});
