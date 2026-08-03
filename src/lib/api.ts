import type { Conversation, Favorite, MediaItem, Message, Profile } from '../types';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'visitor';
  avatar_url?: string | null;
}

interface ApiOptions extends Omit<RequestInit, 'body'> { body?: unknown; csrf?: boolean }
interface PresignResponse { upload_url: string; headers: Record<string, string>; key: string; public_url: string }

export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function cookie(name: string) {
  const value = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`))?.split('=').slice(1).join('=');
  return value ? decodeURIComponent(value) : '';
}

let csrfReady = false;
async function ensureCsrf() {
  if (csrfReady && cookie('XSRF-TOKEN')) return;
  const response = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, { credentials: 'include' });
  if (!response.ok) throw new Error('Could not establish a secure session.');
  csrfReady = true;
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  if (options.csrf !== false && !['GET', 'HEAD', 'OPTIONS'].includes(method)) await ensureCsrf();
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  const xsrf = cookie('XSRF-TOKEN');
  if (xsrf) headers.set('X-XSRF-TOKEN', xsrf);
  headers.set('Accept', 'application/json');
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, method, headers, credentials: 'include', body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404 && path.startsWith('/api/')) {
      throw new Error('The Laravel API is not available. Start the complete stack with: docker compose up --build -d');
    }
    if (response.status >= 500) {
      throw new Error(data.error || data.message || 'The Laravel API could not reach MySQL or MinIO. Check docker compose logs app mysql minio.');
    }
    const firstValidation = data.errors ? Object.values(data.errors).flat()[0] : null;
    throw new Error(String(firstValidation || data.error || data.message || 'Something went wrong.'));
  }
  return data as T;
}

export const api = {
  system: {
    status: () => request<{ ok: boolean; database_driver: string; checks: Record<string, boolean> }>('/api/status', { csrf: false }),
  },
  profile: {
    get: () => request<Profile>('/api/profile', { csrf: false }),
    update: (patch: Partial<Profile>) => request<Profile>('/api/admin/profile', { method: 'PUT', body: patch }),
  },
  favorites: {
    list: () => request<Favorite[]>('/api/favorites', { csrf: false }),
    create: (favorite: Omit<Favorite, 'id'>) => request<Favorite>('/api/admin/favorites', { method: 'POST', body: favorite }),
    update: (id: number, patch: Partial<Favorite>) => request<Favorite>(`/api/admin/favorites/${id}`, { method: 'PUT', body: patch }),
    remove: (id: number) => request<void>(`/api/admin/favorites/${id}`, { method: 'DELETE' }),
  },
  media: {
    list: (manage = false) => request<MediaItem[]>(manage ? '/api/admin/media' : '/api/media', { csrf: false }),
    create: (media: Omit<MediaItem, 'id'>) => request<MediaItem>('/api/admin/media', { method: 'POST', body: media }),
    update: (id: number, patch: Partial<MediaItem>) => request<MediaItem>(`/api/admin/media/${id}`, { method: 'PUT', body: patch }),
    remove: (id: number) => request<void>(`/api/admin/media/${id}`, { method: 'DELETE' }),
  },
  auth: {
    me: () => request<{ user: AuthUser }>('/api/auth/me', { csrf: false }),
    login: (email: string, password: string) => request<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: { email, password } }),
    register: (name: string, email: string, password: string) => request<{ user: AuthUser }>('/api/auth/register', { method: 'POST', body: { name, email, password } }),
    logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
    forgotPassword: (email: string) => request<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: { email } }),
    googleUrl: () => `${API_BASE_URL}/api/auth/google/redirect`,
  },
  conversations: {
    list: (admin: boolean) => request<Conversation[]>(admin ? '/api/admin/conversations' : '/api/conversations', { csrf: false }),
    create: () => request<Conversation>('/api/conversations', { method: 'POST', body: {} }),
    markRead: (id: number) => request<Conversation>(`/api/admin/conversations/${id}/read`, { method: 'POST', body: {} }),
  },
  messages: {
    list: (conversationId: number) => request<Message[]>(`/api/conversations/${conversationId}/messages`, { csrf: false }),
    send: (conversationId: number, body: string, attachment_url: string | null) => request<Message>(`/api/conversations/${conversationId}/messages`, { method: 'POST', body: { body, attachment_url } }),
  },
  uploads: {
    file: async (file: File, kind: 'media' | 'chat') => {
      const path = kind === 'media' ? '/api/admin/uploads/presign' : '/api/uploads/presign';
      const signed = await request<PresignResponse>(path, { method: 'POST', body: { file_name: file.name, content_type: file.type || 'application/octet-stream', size: file.size } });
      const upload = await fetch(signed.upload_url, { method: 'PUT', headers: signed.headers, body: file });
      if (!upload.ok) throw new Error('The file could not be uploaded to media storage.');
      return { url: signed.public_url, key: signed.key };
    },
  },
};
