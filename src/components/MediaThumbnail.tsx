import { isVideoUrl } from '../lib/mediaUrl';

interface MediaThumbnailProps {
  url: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
}

/** Uses a video element as a safe fallback for legacy rows whose cover is an MP4. */
export default function MediaThumbnail({ url, alt, className, loading }: MediaThumbnailProps) {
  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        aria-label={alt || undefined}
        className={className}
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return <img src={url} alt={alt} className={className} loading={loading} />;
}
