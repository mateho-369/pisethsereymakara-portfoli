import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreVertical } from 'lucide-react';

export interface KebabAction {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface KebabMenuProps {
  actions: KebabAction[];
  label?: string;
}

/**
 * A "•••" trigger that opens a small dropdown.
 * Destructive actions (Delete, Block) live inside so they take an extra click.
 */
export default function KebabMenu({ actions, label = 'More actions' }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const esc = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="icon-button"
        aria-label={label}
        aria-expanded={open}
      >
        <MoreVertical size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] overflow-hidden rounded-xl py-1"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-soft)' }}
          >
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => { setOpen(false); action.onClick(); }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition"
                style={{
                  color: action.danger ? '#A4523C' : 'var(--ink)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = action.danger ? 'rgba(164,82,60,.08)' : 'var(--border-soft)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {action.icon && <span className="shrink-0">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
