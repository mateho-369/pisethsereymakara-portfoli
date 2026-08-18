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

/* ── Campaigns ──────────────────────────────────────────────────────────────
 * Shareable /ask/{slug} links. Separate from the gallery: nothing submitted
 * here reaches portfolio media unless the owner explicitly publishes it.
 */

export type CampaignType = 'poll' | 'question' | 'photo';
export type CampaignStatus = 'draft' | 'active' | 'closed';
/** Why a campaign is (not) accepting responses, decided by the server. */
export type CampaignState = 'draft' | 'scheduled' | 'open' | 'ended' | 'closed';
export type PollResultsVisibility = 'after_vote' | 'always' | 'after_close';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface CampaignOption {
  id: number;
  label: string;
  sort_order?: number;
}

export interface CampaignTallyOption {
  id: number;
  label: string;
  votes: number;
  percent: number;
}

export interface CampaignTally {
  total: number;
  options: CampaignTallyOption[];
}

/** The visitor's own submission — never anyone else's. */
export interface MyCampaignResponse {
  id: number;
  poll_option_id: number | null;
  answer_text: string | null;
  photo_url: string | null;
  moderation_status: ModerationStatus;
  referral_source: string | null;
  declared_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PublicCampaign {
  slug: string;
  type: CampaignType;
  title: string;
  prompt: string | null;
  state: CampaignState;
  is_open: boolean;
  start_date: string | null;
  end_date: string | null;
  allow_updates: boolean;
  ask_referral: boolean;
  referral_sources: string[];
  options: CampaignOption[];
  my_response: MyCampaignResponse | null;
  is_blocked: boolean;
  results: CampaignTally | null;
  response_count: number | null;
}

export interface AdminCampaign {
  id: number;
  slug: string;
  type: CampaignType;
  title: string;
  prompt: string | null;
  status: CampaignStatus;
  state: CampaignState;
  is_open: boolean;
  start_date: string | null;
  end_date: string | null;
  poll_results_visibility: PollResultsVisibility;
  allow_updates: boolean;
  ask_referral: boolean;
  response_count: number;
  pending_photo_count: number;
  options: CampaignOption[];
  created_at: string | null;
}

/** Owner view of a response, including the identity from their login. */
export interface AdminCampaignResponse {
  id: number;
  user_id: number;
  name: string;
  email: string | null;
  avatar_url: string | null;
  poll_option_id: number | null;
  poll_option_label: string | null;
  answer_text: string | null;
  photo_url: string | null;
  photo_size_label: string | null;
  moderation_status: ModerationStatus;
  published_media_id: number | null;
  referral_source: string | null;
  declared_name: string | null;
  site_blocked: boolean;
  campaign_blocked: boolean;
  created_at: string | null;
}

export interface AdminCampaignResponses {
  campaign: AdminCampaign;
  tally: CampaignTally | null;
  responses: AdminCampaignResponse[];
}

export interface CampaignBlock {
  id: number;
  user_id: number;
  name: string;
  email: string | null;
  avatar_url: string | null;
  campaign_id: number | null;
  campaign_title: string | null;
  reason: string | null;
  created_at: string | null;
}

export interface CampaignInput {
  type: CampaignType;
  title: string;
  prompt?: string | null;
  status?: CampaignStatus;
  slug?: string;
  start_date?: string | null;
  end_date?: string | null;
  poll_results_visibility?: PollResultsVisibility;
  allow_updates?: boolean;
  ask_referral?: boolean;
  options?: string[];
}

export interface CampaignUpdateInput extends Partial<Omit<CampaignInput, 'type' | 'options'>> {
  options?: { id?: number; label: string }[];
}

export interface CampaignResponseInput {
  poll_option_id?: number;
  answer_text?: string;
  photo_key?: string;
  photo_size_label?: string;
  referral_source?: string | null;
  declared_name?: string | null;
}
