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

/** Extract all URLs from a text string. */
export function extractUrls(text: string): string[] {
  return text.match(/https?:\/\/[^\s<>"']+/g) || [];
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
export type BodySegment = TextSegment | EmbedSegment;

export function parseBodyWithEmbeds(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  const urlPattern = /https?:\/\/[^\s<>"']+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlPattern.exec(body)) !== null) {
    const url = match[0];
    const ytId = extractYouTubeId(url);
    const vimeoId = extractVimeoId(url);

    if (ytId || vimeoId) {
      // Add any text before this URL
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
      }

      lastIndex = match.index + url.length;
    }
  }

  // Add remaining text
  if (lastIndex < body.length) {
    segments.push({ kind: 'text', content: body.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ kind: 'text', content: body }];
}
