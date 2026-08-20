import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PenLine } from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../lib/categories';

interface CategoryPickerProps {
  value: string;
  onChange: (value: string) => void;
  /** Extra one-click chips — e.g. categories already used in the gallery. */
  suggestions?: string[];
  label?: string;
  hint?: string;
}

/**
 * Chips + free text, in one place so the gallery's Quick manage panel and the
 * studio's composer always offer exactly the same category experience: pick a
 * preset with one click, or type any custom category of your own.
 */
export default function CategoryPicker({ value, onChange, suggestions = [], label = 'Category', hint }: CategoryPickerProps) {
  const chips = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const tag of [...DEFAULT_CATEGORIES, ...suggestions]) {
      const key = tag.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      list.push(tag.trim());
    }
    return list;
  }, [suggestions]);

  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {chips.map((tag) => {
          const active = value.trim().toLowerCase() === tag.toLowerCase();
          return (
            <motion.button
              key={tag}
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onChange(tag)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? 'border-transparent text-white' : ''}`}
              style={{
                background: active ? 'var(--fjord)' : 'var(--bg)',
                borderColor: active ? 'transparent' : 'var(--border)',
                color: active ? '#F8F4E9' : 'var(--ink-3)',
              }}
            >
              {tag}
            </motion.button>
          );
        })}
      </div>
      <div className="relative mt-2">
        <input
          className="input-field pr-10"
          value={value}
          placeholder="Or type your own category…"
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-4)' }}>
          <PenLine size={14} />
        </span>
      </div>
      {hint && <span className="mt-1.5 block text-xs leading-relaxed" style={{ color: 'var(--ink-4)' }}>{hint}</span>}
    </div>
  );
}
