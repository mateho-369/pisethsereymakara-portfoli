import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';
interface Toast { id: number; tone: ToastTone; message: string }

interface ToastValue {
  notify: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastValue>({ notify: () => undefined, success: () => undefined, error: () => undefined });

const toneStyle: Record<ToastTone, { bg: string; color: string; Icon: typeof Info }> = {
  success: { bg: 'rgba(110,124,82,.14)', color: 'var(--moss)', Icon: CheckCircle2 },
  error: { bg: 'var(--gold-pale)', color: 'var(--gold-deep)', Icon: TriangleAlert },
  info: { bg: 'rgba(92,122,137,.14)', color: 'var(--fjord)', Icon: Info },
};

/** Gentle, self-dismissing feedback shared by every admin action. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, tone, message }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const value = useMemo<ToastValue>(() => ({
    notify,
    success: (message: string) => notify(message, 'success'),
    error: (message: string) => notify(message, 'error'),
  }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[95] flex w-[min(92vw,22rem)] flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map(({ id, tone, message }) => {
            const { bg, color, Icon } = toneStyle[tone];
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                className="pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
                style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-soft)' }}
                role="status"
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ background: bg, color }}>
                  <Icon size={14} />
                </span>
                <p className="flex-1 leading-relaxed" style={{ color: 'var(--ink-2)' }}>{message}</p>
                <button onClick={() => dismiss(id)} aria-label="Dismiss" style={{ color: 'var(--ink-4)' }}><X size={15} /></button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
