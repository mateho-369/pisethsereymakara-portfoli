import { useCallback, useState } from 'react';
import { api } from './api';
import { captureVideoPoster } from './videoThumbnail';

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const sizeLabel = (bytes: number) =>
  bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

/**
 * Shared browser → MinIO upload flow (presign, PUT, progress feedback).
 * Both the gallery manager and the chat composer use this, so the size limit,
 * error copy and progress behaviour can never drift apart.
 */
export function useUpload(kind: 'media' | 'chat') {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const resetProgress = useCallback(() => {
    window.setTimeout(() => { setUploading(false); setProgress(0); }, 400);
  }, []);

  const upload = useCallback(async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error('Please choose a file smaller than 4 MB.');
    }

    setUploading(true);
    setProgress(20);
    try {
      setProgress(45);
      const uploaded = await api.uploads.file(file, kind);
      setProgress(100);
      return { ...uploaded, sizeLabel: sizeLabel(file.size), isVideo: file.type.startsWith('video/') };
    } finally {
      resetProgress();
    }
  }, [kind, resetProgress]);

  const uploadMedia = useCallback(async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error('Please choose a file smaller than 4 MB.');
    }

    const isVideo = file.type.startsWith('video/');
    setUploading(true);
    setProgress(10);

    try {
      const poster = isVideo ? await captureVideoPoster(file) : null;
      setProgress(35);
      const uploaded = await api.uploads.file(file, 'media');
      let thumbnailUrl = uploaded.url;
      let posterMissing = isVideo;

      if (poster) {
        setProgress(72);
        try {
          const uploadedPoster = await api.uploads.file(poster, 'media');
          thumbnailUrl = uploadedPoster.url;
          posterMissing = false;
        } catch {
          // Keep the video upload usable; the editor offers a manual cover fallback.
        }
      }

      setProgress(100);
      return {
        url: uploaded.url,
        thumbnailUrl,
        sizeLabel: sizeLabel(file.size),
        isVideo,
        posterMissing,
      };
    } finally {
      resetProgress();
    }
  }, [resetProgress]);

  return { upload, uploadMedia, uploading, progress };
}
