import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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

interface MenuPosition { top: number; left: number; }

/** A portal-based overflow menu that is never clipped by a scrolling parent. */
export default function KebabMenu({ actions, label = 'More actions' }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const placeMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 192;
    const height = actions.length * 48 + 10;
    const gutter = 8;
    const left = rect.right + width + gutter <= window.innerWidth
      ? rect.right
      : Math.max(gutter, rect.left - width);
    const top = rect.bottom + height + gutter <= window.innerHeight
      ? rect.bottom + 4
      : Math.max(gutter, rect.top - height - 4);
    setPosition({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeOnMove = () => setOpen(false);
    const esc = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', closeOnMove, true);
    window.addEventListener('resize', closeOnMove);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', closeOnMove, true);
      window.removeEventListener('resize', closeOnMove);
    };
  }, [open]);

  return (
    <div ref={triggerRef} className="relative">
      <button
        onClick={() => {
          if (!open) placeMenu();
          setOpen((value) => !value);
        }}
        className="icon-button"
        aria-label={label}
        aria-expanded={open}
      >
        <MoreVertical size={16} />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[100] min-w-[12rem] overflow-hidden rounded-xl py-1 whitespace-nowrap"
              style={{ top: position.top, left: position.left, background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-soft)' }}
            >
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => { setOpen(false); action.onClick(); }}
                  className="flex min-h-11 w-full items-center gap-2.5 px-4 py-3 text-left text-sm transition"
                  style={{ color: action.danger ? '#A4523C' : 'var(--ink)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = action.danger ? 'rgba(164,82,60,.08)' : 'var(--border-soft)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {action.icon && <span className="shrink-0">{action.icon}</span>}
                  {action.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
