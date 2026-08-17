import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Image, Inbox, Type, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import LoadingState from '../../components/LoadingState';

interface Stat { label: string; value: string; to: string; hint: string; Icon: typeof Type }

export default function OverviewPanel() {
  const load = useCallback(async () => {
    const [media, favorites, users, conversations] = await Promise.all([
      api.media.list(true),
      api.favorites.list(),
      api.admin.users.list(),
      api.conversations.list(true, 'all'),
    ]);
    return { media, favorites, users, conversations };
  }, []);

  const { data, loading, error } = useResource(load, { media: [], favorites: [], users: [], conversations: [] });

  if (loading) return <LoadingState label="Opening the studio…" />;
  if (error) return <div className="admin-card" style={{ color: 'var(--gold-deep)' }}>{error}</div>;

  const unread = data.conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const blocked = data.users.filter((u) => u.blocked_at).length;

  const stats: Stat[] = [
    { label: 'Photographs & films', value: String(data.media.length), to: '/admin/media', hint: `${data.media.filter((m) => !m.is_public).length} private`, Icon: Image },
    { label: 'Things I love', value: String(data.favorites.length), to: '/admin/favorites', hint: 'Cards on the home page', Icon: Heart },
    { label: 'People', value: String(data.users.filter((u) => u.role !== 'admin').length), to: '/admin/people', hint: `${blocked} paused`, Icon: Users },
    { label: 'Conversations', value: String(data.conversations.length), to: '/chat', hint: `${unread} unread`, Icon: Inbox },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map(({ label, value, to, hint, Icon }) => (
          <Link key={label} to={to} className="admin-card transition hover:-translate-y-0.5">
            <span className="grid h-10 w-10 place-items-center rounded-full" style={{ background: 'rgba(110,124,82,.1)', color: 'var(--moss)' }}>
              <Icon size={18} />
            </span>
            <p className="mt-5 font-serif text-4xl" style={{ color: 'var(--ink)' }}>{value}</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>{label}</p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[.14em]" style={{ color: 'var(--ink-4)' }}>{hint}</p>
          </Link>
        ))}
      </div>

      <div className="admin-card">
        <h2 className="font-serif text-2xl" style={{ color: 'var(--ink)' }}>Where things live</h2>
        <ul className="mt-4 space-y-3 text-sm" style={{ color: 'var(--ink-2)' }}>
          <li><Link className="text-link" to="/admin/profile">Profile <ArrowRight size={14} /></Link> — your name, bio, quote, portrait and links.</li>
          <li><Link className="text-link" to="/admin/content">Site text <ArrowRight size={14} /></Link> — every heading, button and paragraph on the site.</li>
          <li><Link className="text-link" to="/admin/media">Media <ArrowRight size={14} /></Link> — add, edit, replace, reorder or hide gallery pieces.</li>
          <li><Link className="text-link" to="/chat">Inbox <ArrowRight size={14} /></Link> — reply, remove messages, archive threads and pause a visitor.</li>
        </ul>
      </div>
    </div>
  );
}
