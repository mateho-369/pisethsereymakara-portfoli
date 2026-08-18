import { NavLink, Outlet } from 'react-router-dom';
import { Heart, Image, Inbox, LayoutDashboard, Palette, Type, UserRound, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const tabs = [
  { to: '/admin', end: true, label: 'Overview', Icon: LayoutDashboard },
  { to: '/admin/profile', label: 'Profile', Icon: UserRound },
  { to: '/admin/content', label: 'Site text', Icon: Type },
  { to: '/admin/favorites', label: 'Favorites', Icon: Heart },
  { to: '/admin/media', label: 'Media', Icon: Image },
  { to: '/admin/people', label: 'People', Icon: Users },
  { to: '/admin/studio', label: 'Studio', Icon: Palette },
  { to: '/chat', label: 'Inbox', Icon: Inbox },
];

/** The studio shell: one calm sidebar, one place for every owner control. */
export default function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="page-shell py-10 md:py-14">
      <header className="mb-8">
        <p className="eyebrow">The studio</p>
        <h1 className="mt-4 font-serif text-[clamp(2.6rem,5vw,4rem)] leading-none tracking-tight" style={{ color: 'var(--ink)' }}>
          Everything, in your hands
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          Signed in as {user?.name}. Edit any word, photograph or conversation on the site from here — changes appear the moment you save.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Studio sections">
          {tabs.map(({ to, end, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `admin-tab ${isActive ? 'admin-tab-active' : ''}`}
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}
