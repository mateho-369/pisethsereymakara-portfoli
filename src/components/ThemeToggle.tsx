import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';

const icons: Record<ThemeMode, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
const labels: Record<ThemeMode, string> = { light: 'Light mode', dark: 'Dark mode', system: 'System theme' };
const nextLabel: Record<ThemeMode, string> = { light: 'Switch to dark', dark: 'Switch to system', system: 'Switch to light' };

export default function ThemeToggle() {
  const { mode, cycle } = useTheme();
  const Icon = icons[mode];
  return (
    <button
      onClick={cycle}
      className="icon-button"
      aria-label={nextLabel[mode]}
      title={labels[mode]}
    >
      <Icon size={17} strokeWidth={1.8} />
    </button>
  );
}
