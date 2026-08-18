import { useEffect, useRef, useState } from 'react';
import { type BodySegment, parseBodyWithEmbeds } from '../lib/embeds';

interface RichBodyProps {
  body: string;
}

/**
 * Renders a message body with inline YouTube/Vimeo embeds.
 * Video iframes are lazy-loaded — they only mount when scrolled into view.
 */
export default function RichBody({ body }: RichBodyProps) {
  const segments = parseBodyWithEmbeds(body);

  return (
    <>
      {segments.map((segment, i) =>
        segment.kind === 'text' ? (
          <span key={i} className="whitespace-pre-wrap">{segment.content}</span>
        ) : (
          <LazyEmbed key={i} segment={segment} />
        )
      )}
    </>
  );
}

function LazyEmbed({ segment }: { segment: BodySegment & { kind: 'embed' } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-2 overflow-hidden rounded-lg" style={{ background: 'var(--bg-muted)' }}>
      {visible ? (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={segment.info.embedUrl}
            title={`${segment.info.type} video`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center text-sm" style={{ color: 'var(--ink-4)' }}>
          Loading video…
        </div>
      )}
    </div>
  );
}
