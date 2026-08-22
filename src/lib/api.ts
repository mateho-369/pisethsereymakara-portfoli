import type {
  AdminCampaign, AdminCampaignResponses, AdminUser, CampaignBlock, CampaignInput,
  CampaignResponseInput, CampaignStatus, CampaignUpdateInput, Conversation, Favorite,
  MediaItem, Message, ModerationStatus, MyCampaignResponse, Profile, PublicCampaign,
  SettingField, SiteContent,
} from '../types';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'visitor';
  avatar_url?: string | null;
  blocked_at?: string | null;
  blocked_reason?: string | null;
}

interface ApiOptions extends Omit<RequestInit, 'body'> { body?: unknown; csrf?: boolean }
interface PresignResponse { upload_url: string; headers: Record<string, string>; key: string; public_url: string | null }

function cookie(name: string) {
  const value = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`))?.split('=').slice(1).join('=');
  return value ? decodeURIComponent(value) : '';
}

let csrfReady = false;
async function ensureCsrf() {
  if (csrfReady && cookie('XSRF-TOKEN')) return;
  const response = await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
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
  const response = await fetch(path, { ...options, method, headers, credentials: 'include', body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404 && path.startsWith('/api/')) {
      throw new Error('The Laravel API is not available. Start the complete stack with: docker compose up --build -d');
    }
    if (response.status === 429) {
      const retry = Number(response.headers.get('Retry-After'));
      throw new Error(
        retry > 0
          ? `Too many attempts. Please wait ${retry} second${retry === 1 ? '' : 's'} and try again.`
          : 'Too many attempts. Please wait a moment and try again.',
      );
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
  content: {
    /** Public copy for the whole site, defaults already merged in. */
    get: () => request<SiteContent>('/api/settings', { csrf: false }),
  },
  favorites: {
    list: () => request<Favorite[]>('/api/favorites', { csrf: false }),
    create: (favorite: Omit<Favorite, 'id'>) => request<Favorite>('/api/admin/favorites', { method: 'POST', body: favorite }),
    update: (id: number, patch: Partial<Favorite>) => request<Favorite>(`/api/admin/favorites/${id}`, { method: 'PUT', body: patch }),
    remove: (id: number) => request<void>(`/api/admin/favorites/${id}`, { method: 'DELETE' }),
    reorder: (order: number[]) => request<Favorite[]>('/api/admin/favorites/reorder', { method: 'POST', body: { order } }),
  },
  media: {
    list: (manage = false) => request<MediaItem[]>(manage ? '/api/admin/media' : '/api/media', { csrf: false }),
    reorder: (order: number[]) => request<MediaItem[]>('/api/admin/media/reorder', { method: 'POST', body: { order } }),
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
    /** `returnTo` brings the visitor back to e.g. /ask/{slug} after Google sign-in. */
    googleUrl: (returnTo?: string) =>
      returnTo ? `/api/auth/google/redirect?return_to=${encodeURIComponent(returnTo)}` : '/api/auth/google/redirect',
  },
  campaigns: {
    /** Public campaign payload. Works signed-out; adds `my_response` when signed in. */
    get: (slug: string) => request<PublicCampaign>(`/api/campaigns/${encodeURIComponent(slug)}`, { csrf: false }),
    respond: (slug: string, body: CampaignResponseInput) =>
      request<{ campaign: PublicCampaign; response: MyCampaignResponse }>(`/api/campaigns/${encodeURIComponent(slug)}/respond`, { method: 'POST', body }),
    /** Presign into the private campaigns/ prefix; returns the object key only. */
    uploadPhoto: async (file: File) => {
      const signed = await request<PresignResponse>('/api/campaigns/uploads/presign', {
        method: 'POST',
        body: { file_name: file.name, content_type: file.type || 'application/octet-stream', size: file.size },
      });
      const upload = await fetch(signed.upload_url, { method: 'PUT', headers: signed.headers, body: file });
      if (!upload.ok) throw new Error('The photo could not be uploaded. Please try again.');
      return { key: signed.key };
    },
  },
  conversations: {
    list: (admin: boolean, status: 'open' | 'archived' | 'all' = 'open') =>
      request<Conversation[]>(admin ? `/api/admin/conversations?status=${status}` : '/api/conversations', { csrf: false }),
    create: () => request<Conversation>('/api/conversations', { method: 'POST', body: {} }),
    markRead: (id: number) => request<Conversation>(`/api/admin/conversations/${id}/read`, { method: 'POST', body: {} }),
    archive: (id: number) => request<Conversation>(`/api/admin/conversations/${id}/archive`, { method: 'POST', body: {} }),
    restore: (id: number) => request<Conversation>(`/api/admin/conversations/${id}/restore`, { method: 'POST', body: {} }),
    remove: (id: number) => request<void>(`/api/admin/conversations/${id}`, { method: 'DELETE' }),
  },
  messages: {
    list: (conversationId: number) => request<Message[]>(`/api/conversations/${conversationId}/messages`, { csrf: false }),
    send: (conversationId: number, body: string, attachment_url: string | null) => request<Message>(`/api/conversations/${conversationId}/messages`, { method: 'POST', body: { body, attachment_url } }),
    remove: (id: number) => request<Message>(`/api/admin/messages/${id}`, { method: 'DELETE' }),
  },
  admin: {
    settings: {
      list: () => request<SettingField[]>('/api/admin/settings', { csrf: false }),
      save: (settings: Record<string, string>) => request<SettingField[]>('/api/admin/settings', { method: 'PUT', body: { settings } }),
      reset: (key?: string) => request<SettingField[]>('/api/admin/settings/reset', { method: 'POST', body: key ? { key } : {} }),
    },
    campaigns: {
      list: () => request<AdminCampaign[]>('/api/admin/campaigns', { csrf: false }),
      create: (campaign: CampaignInput) => request<AdminCampaign>('/api/admin/campaigns', { method: 'POST', body: campaign }),
      update: (id: number, patch: CampaignUpdateInput) => request<AdminCampaign>(`/api/admin/campaigns/${id}`, { method: 'PUT', body: patch }),
      setStatus: (id: number, status: CampaignStatus) => request<AdminCampaign>(`/api/admin/campaigns/${id}/status`, { method: 'POST', body: { status } }),
      remove: (id: number) => request<void>(`/api/admin/campaigns/${id}`, { method: 'DELETE' }),
      responses: (id: number) => request<AdminCampaignResponses>(`/api/admin/campaigns/${id}/responses`, { csrf: false }),
      moderate: (responseId: number, moderation_status: ModerationStatus) =>
        request<{ id: number; moderation_status: ModerationStatus; published_media_id: number | null }>(`/api/admin/campaign-responses/${responseId}/moderate`, { method: 'POST', body: { moderation_status } }),
      /** Explicit, owner-initiated copy into the public gallery. */
      publish: (responseId: number, body: { title: string; description?: string; category?: string; is_public?: boolean }) =>
        request<{ id: number; published_media_id: number; media: MediaItem }>(`/api/admin/campaign-responses/${responseId}/publish`, { method: 'POST', body }),
      removeResponse: (responseId: number) => request<void>(`/api/admin/campaign-responses/${responseId}`, { method: 'DELETE' }),
    },
    campaignBlocks: {
      list: () => request<CampaignBlock[]>('/api/admin/campaign-blocks', { csrf: false }),
      /** `campaign_id: null` blocks the person from every campaign. */
      create: (user_id: number, campaign_id: number | null, reason?: string) =>
        request<{ id: number; user_id: number; campaign_id: number | null }>('/api/admin/campaign-blocks', { method: 'POST', body: { user_id, campaign_id, reason: reason || null } }),
      remove: (id: number) => request<void>(`/api/admin/campaign-blocks/${id}`, { method: 'DELETE' }),
    },
    users: {
      list: (search = '') => request<AdminUser[]>(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`, { csrf: false }),
      block: (id: number, reason?: string) => request<Partial<AdminUser>>(`/api/admin/users/${id}/block`, { method: 'POST', body: { reason: reason || null } }),
      unblock: (id: number) => request<Partial<AdminUser>>(`/api/admin/users/${id}/unblock`, { method: 'POST', body: {} }),
      remove: (id: number) => request<void>(`/api/admin/users/${id}`, { method: 'DELETE' }),
    },
  },
  uploads: {
    file: async (file: File, kind: 'media' | 'chat') => {
      const path = kind === 'media' ? '/api/admin/uploads/presign' : '/api/uploads/presign';
      const signed = await request<PresignResponse>(path, { method: 'POST', body: { file_name: file.name, content_type: file.type || 'application/octet-stream', size: file.size } });

      // This PUT goes straight to storage, bypassing our own API -- with no
      // timeout, a stalled connection hung forever with zero feedback, even
      // though the file had often already finished uploading server-side.
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 45000);
      let upload: Response;
      try {
        upload = await fetch(signed.upload_url, { method: 'PUT', headers: signed.headers, body: file, signal: controller.signal });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('The upload timed out. It may have still finished -- check the gallery in a moment before retrying.');
        }
        throw error;
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (!upload.ok) throw new Error('The file could not be uploaded to media storage.');
      return { url: signed.public_url as string, key: signed.key };
    },
  },
};
