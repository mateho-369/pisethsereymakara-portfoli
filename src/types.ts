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
}

export interface Conversation {
  id: number;
  visitor_id: string;
  visitor_name: string;
  visitor_email: string;
  avatar_url: string | null;
  status: string;
  unread_count: number;
  last_message_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: string;
  sender_role: 'admin' | 'visitor';
  body: string;
  attachment_url: string | null;
  created_at: string;
}
