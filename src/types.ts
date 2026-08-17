export type SocialLinks = Record<string, string>;

export interface Profile {
  id: number;
  display_name: string;
  role_title: string;
  location: string;
  bio: string;
  quote: string;
  email: string;
  avatar_url: string;
  social_links: SocialLinks;
}

export type SettingType = 'text' | 'textarea' | 'url';

export interface SettingField {
  key: string;
  group: string;
  label: string;
  hint: string;
  type: SettingType;
  sort_order: number;
  default: string;
  value: string;
}

/** Flat key => value map of every piece of site copy. */
export type SiteContent = Record<string, string>;

export interface Favorite {
  id: number;
  title: string;
  description: string;
  icon: string;
  sort_order: number;
}

export interface MediaItem {
  id: number;
  title: string;
  description: string;
  media_type: 'photo' | 'video';
  category: string;
  thumbnail_url: string;
  media_url: string;
  size_label: string;
  aspect_ratio: 'portrait' | 'landscape' | 'square';
  captured_at: string;
  is_favorite: boolean;
  is_public: boolean;
  sort_order?: number;
}

export interface Conversation {
  id: number;
  visitor_id: string;
  visitor_name: string;
  visitor_email: string;
  avatar_url: string | null;
  status: 'open' | 'archived' | string;
  unread_count: number;
  last_message_at: string;
  visitor_user_id?: number | null;
  visitor_blocked?: boolean;
  visitor_blocked_reason?: string | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: string;
  sender_role: 'admin' | 'visitor';
  body: string;
  attachment_url: string | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'visitor';
  avatar_url: string | null;
  is_google: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  created_at: string | null;
  conversation_id: number | null;
  message_count: number;
  last_message_at: string | null;
}
