import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

/** Shared dialog shell: same paper, same gradient hairline, same behaviour. */
export default function Modal({ open, title, description, onClose, children, footer, width = '34rem' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto p-4 backdrop-blur-md"
          style={{ background: 'rgba(26,31,24,.62)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog" aria-modal="true" aria-label={title}
        >
          <motion.div
            initial={{ scale: .97, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .97, opacity: 0 }}
            onClick={(event) => event.stopPropagation()}
            className="relative my-auto w-full overflow-hidden rounded-[1.4rem]"
            style={{ maxWidth: width, background: 'var(--bg-surface)', boxShadow: 'var(--shadow-xl)' }}
          >
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#6E7C52] via-[#D9A441] to-[#5C7A89]" />
            <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-7">
              <div>
                <h2 className="font-serif text-2xl" style={{ color: 'var(--ink)' }}>{title}</h2>
                {description && <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>{description}</p>}
              </div>
              <button onClick={onClose} className="icon-button shrink-0" aria-label="Close"><X size={18} /></button>
            </header>
            <div className="max-h-[68vh] overflow-y-auto px-6 pb-2">{children}</div>
            {footer && (
              <footer className="flex flex-wrap justify-end gap-2 px-6 py-5" style={{ borderTop: '1px solid var(--border-soft)' }}>
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
