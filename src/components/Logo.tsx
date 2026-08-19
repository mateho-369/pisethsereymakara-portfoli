import { Link } from 'react-router-dom';
import { useContent } from '../contexts/ContentContext';
import { useTheme } from '../contexts/ThemeContext';

function LogoMark({ isDark }: { isDark: boolean }) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <defs>
        <linearGradient id="logo-horizon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6E7C52" />
          <stop offset="50%" stopColor="#D9A441" />
          <stop offset="100%" stopColor="#5C7A89" />
        </linearGradient>
        {isDark && (
          <linearGradient id="logo-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2B3328" />
            <stop offset="100%" stopColor="#1A1F18" />
          </linearGradient>
        )}
      </defs>

      {/* Background — dark mode gets the filled circle, light mode is transparent */}
      {isDark && (
        <>
          <circle cx="100" cy="100" r="92" fill="url(#logo-bg)" />
          <circle cx="100" cy="100" r="86" fill="none" stroke="url(#logo-horizon)" strokeOpacity=".5" strokeWidth="1" />
        </>
      )}

      {/* Fraunces serif M */}
      <text
        x="100" y="128"
        textAnchor="middle"
        fontFamily="'Fraunces', Georgia, serif"
        fontSize="100" fontWeight="600"
        fill={isDark ? '#E8EDE4' : 'var(--ink)'}
      >
        M
      </text>

      {/* Horizon gradient line */}
      <line x1="38" y1="148" x2="162" y2="148" stroke="url(#logo-horizon)" strokeWidth="2.5" strokeLinecap="round" />

      {/* Gold glow dot */}
      <circle cx="100" cy="145" r="3.5" fill="#D9A441" opacity=".7" />
    </svg>
  );
}

export default function Logo() {
  const { text } = useContent();
  const { isDark } = useTheme();
  const name = text('brand.name', 'Field Notes');

  return (
    <Link to="/" className="group inline-flex items-center gap-3" aria-label={`${name} home`}>
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-full transition-transform duration-500 group-hover:-translate-y-0.5" style={{ border: '1px solid rgba(110,124,82,.3)', background: isDark ? undefined : 'var(--bg-surface)' }}>
        <LogoMark isDark={isDark} />
      </span>
      <span className="font-serif text-[1.05rem] font-semibold tracking-[-0.02em]" style={{ color: 'var(--ink)' }}>{name}</span>
    </Link>
  );
}
