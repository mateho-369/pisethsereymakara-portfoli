import { useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface LightboxItem {
  url: string;
  type: 'image' | 'video';
  alt?: string;
  title?: string;
  description?: string;
  date?: string;
}

interface MediaLightboxProps {
  items: LightboxItem[];
  /** Index of the currently selected item, or null if closed. */
  activeIndex: number | null;
  onClose: () => void;
  onNavigate?: (index: number) => void;
  /** Show title/description/date panel below the media. */
  showDetails?: boolean;
}

/**
 * Shared lightbox viewer used by the gallery and chat attachments.
 * Supports arrow-key / swipe navigation and Esc to close.
 */
export default function MediaLightbox({ items, activeIndex, onClose, onNavigate, showDetails = true }: MediaLightboxProps) {
  const active = activeIndex !== null ? items[activeIndex] : null;

  const prev = useCallback(() => {
    if (activeIndex === null || !onNavigate) return;
    onNavigate(activeIndex <= 0 ? items.length - 1 : activeIndex - 1);
  }, [activeIndex, items.length, onNavigate]);

  const next = useCallback(() => {
    if (activeIndex === null || !onNavigate) return;
    onNavigate(activeIndex >= items.length - 1 ? 0 : activeIndex + 1);
  }, [activeIndex, items.length, onNavigate]);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') prev();
      if (event.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, onClose, prev, next]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center p-4 backdrop-blur-md"
          style={{ background: 'rgba(26,31,24,.85)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: .97, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .97 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl shadow-2xl"
            style={{ background: 'var(--bg-surface)' }}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full shadow backdrop-blur"
              style={{ background: 'var(--bg-surface)', color: 'var(--ink)' }}
              aria-label="Close"
            >
              <X size={19} />
            </button>

            {/* Navigation arrows */}
            {items.length > 1 && onNavigate && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-4 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full shadow backdrop-blur transition hover:scale-105"
                  style={{ background: 'var(--bg-surface)', color: 'var(--ink)' }}
                  aria-label="Previous"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={next}
                  className="absolute right-4 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full shadow backdrop-blur transition hover:scale-105"
                  style={{ background: 'var(--bg-surface)', color: 'var(--ink)' }}
                  aria-label="Next"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {active.type === 'video'
              ? <video src={active.url} controls autoPlay className="max-h-[70vh] w-full object-contain" style={{ background: 'var(--bg-muted)' }} />
              : <img src={active.url} alt={active.alt || active.title || ''} className="max-h-[70vh] w-full object-contain" style={{ background: 'var(--bg-muted)' }} />}

            {showDetails && active.title && (
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-serif text-3xl" style={{ color: 'var(--ink)' }}>{active.title}</h2>
                  {active.date && (
                    <span className="font-mono text-[9px] uppercase tracking-[.16em]" style={{ color: 'var(--ink-3)' }}>
                      {new Date(active.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  )}
                </div>
                {active.description && (
                  <p className="mt-3 max-w-2xl leading-relaxed" style={{ color: 'var(--ink-2)' }}>{active.description}</p>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
