/**
 * Detects YouTube URLs and extracts the video ID.
 * Supports:
 *   - youtube.com/watch?v=ID
 *   - youtu.be/ID
 *   - youtube.com/shorts/ID
 *   - youtube.com/embed/ID
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Detects Vimeo URLs and extracts the video ID.
 */
export function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] || null;
}

/**
 * Trailing punctuation is almost always sentence punctuation rather than part
 * of the link — "see https://example.com." should not linkify the full stop.
 * Balanced closing parens are kept, since they appear in real URLs.
 */
function trimTrailingPunctuation(url: string): string {
  let out = url;
  while (out.length > 1) {
    const last = out[out.length - 1];
    if ('.,;:!?"\''.includes(last)) { out = out.slice(0, -1); continue; }
    if (last === ')' && !out.includes('(')) { out = out.slice(0, -1); continue; }
    break;
  }
  return out;
}

/** Matches bare http(s) URLs. Kept in one place so detection never drifts. */
const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

/** Extract all URLs from a text string. */
export function extractUrls(text: string): string[] {
  return (text.match(URL_PATTERN) || []).map(trimTrailingPunctuation);
}

/** The first URL in a body, or null. Used for the "Copy link" action. */
export function firstUrl(text: string): string | null {
  return extractUrls(text)[0] ?? null;
}

/** True when a body contains at least one URL we can render as a video embed. */
export function hasEmbed(text: string): boolean {
  return extractUrls(text).some((url) => extractYouTubeId(url) || extractVimeoId(url));
}

export interface EmbedInfo {
  type: 'youtube' | 'vimeo';
  id: string;
  embedUrl: string;
}

/**
 * Parse a text body and return a list of segments — either plain text or embeds.
 * Used to render message bodies with inline video players.
 */
export interface TextSegment { kind: 'text'; content: string }
export interface EmbedSegment { kind: 'embed'; info: EmbedInfo; originalUrl: string }
/** A URL with no known embed pattern — rendered as an ordinary clickable link. */
export interface LinkSegment { kind: 'link'; url: string }
export type BodySegment = TextSegment | EmbedSegment | LinkSegment;

export function parseBodyWithEmbeds(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  const pattern = new RegExp(URL_PATTERN.source, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body)) !== null) {
    const raw = match[0];
    const url = trimTrailingPunctuation(raw);
    const ytId = extractYouTubeId(url);
    const vimeoId = extractVimeoId(url);

    // Text sitting before this URL
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', content: body.slice(lastIndex, match.index) });
    }

    if (ytId) {
      segments.push({
        kind: 'embed',
        info: { type: 'youtube', id: ytId, embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}` },
        originalUrl: url,
      });
    } else if (vimeoId) {
      segments.push({
        kind: 'embed',
        info: { type: 'vimeo', id: vimeoId, embedUrl: `https://player.vimeo.com/video/${vimeoId}` },
        originalUrl: url,
      });
    } else {
      // No embed pattern matched: keep it as a plain clickable link.
      segments.push({ kind: 'link', url });
    }

    // Any punctuation trimmed off the match stays part of the following text.
    lastIndex = match.index + url.length;
  }

  if (lastIndex < body.length) {
    segments.push({ kind: 'text', content: body.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ kind: 'text', content: body }];
}
