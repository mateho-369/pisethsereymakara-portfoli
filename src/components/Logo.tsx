import { Link } from 'react-router-dom';
import { useContent } from '../contexts/ContentContext';

export default function Logo() {
  const { text } = useContent();
  const name = text('brand.name', 'Field Notes');

  return (
    <Link to="/" className="group inline-flex items-center gap-3" aria-label={`${name} home`}>
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-full" style={{ border: '1px solid rgba(110,124,82,.3)', background: 'var(--bg-surface)' }}>
        <span className="absolute bottom-2 h-px w-6 bg-gradient-to-r from-[#6E7C52] via-[#D9A441] to-[#5C7A89]" />
        <span className="absolute bottom-[9px] h-2.5 w-2.5 rounded-full blur-[1px] transition-transform duration-500 group-hover:-translate-y-0.5" style={{ background: 'rgba(217,164,65,.7)' }} />
      </span>
      <span className="font-serif text-[1.05rem] font-semibold tracking-[-0.02em]" style={{ color: 'var(--ink)' }}>{name}</span>
    </Link>
  );
}
