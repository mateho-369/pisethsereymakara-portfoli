const POSTER_TIMEOUT_MS = 10_000;
const MAX_POSTER_EDGE = 1280;

/**
 * Captures a lightweight JPEG poster in the browser so video bytes never need
 * to pass through the application server. Unsupported codecs fail closed: the
 * original upload can continue and the owner can add a cover image manually.
 */
export function captureVideoPoster(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    let objectUrl = '';
    let settled = false;
    let capturing = false;
    let timeoutId = 0;
    let video: HTMLVideoElement | null = null;

    const finish = (poster: File | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      try {
        if (video) {
          video.pause();
          video.removeAttribute('src');
          video.load();
          video.remove();
        }
      } catch {
        // Cleanup must never turn a codec failure into a rejected upload.
      }
      try {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      } catch {
        // The object URL may already have been released by the browser.
      }
      resolve(poster);
    };

    const capture = () => {
      if (!video || capturing || settled) return;
      capturing = true;

      try {
        const sourceWidth = video.videoWidth;
        const sourceHeight = video.videoHeight;
        if (!sourceWidth || !sourceHeight) return finish(null);

        const scale = Math.min(1, MAX_POSTER_EDGE / Math.max(sourceWidth, sourceHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(sourceWidth * scale));
        canvas.height = Math.max(1, Math.round(sourceHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) return finish(null);

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) return finish(null);
          try {
            const stem = file.name.replace(/\.[^.]+$/, '') || 'video';
            finish(new File([blob], `${stem}-poster.jpg`, { type: 'image/jpeg', lastModified: Date.now() }));
          } catch {
            finish(null);
          }
        }, 'image/jpeg', 0.82);
      } catch {
        finish(null);
      }
    };

    try {
      objectUrl = URL.createObjectURL(file);
      video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.style.position = 'fixed';
      video.style.left = '-10000px';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0';
      video.addEventListener('error', () => finish(null), { once: true });
      video.addEventListener('seeked', capture, { once: true });
      video.addEventListener('loadedmetadata', () => {
        if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return finish(null);
        try {
          video.currentTime = Math.min(1, video.duration / 10);
        } catch {
          finish(null);
        }
      }, { once: true });

      document.body.appendChild(video);
      timeoutId = window.setTimeout(() => finish(null), POSTER_TIMEOUT_MS);
      video.src = objectUrl;
      video.load();
    } catch {
      finish(null);
    }
  });
}
