import { useEffect, useState } from 'react';
import { Github, Instagram, LogOut, Mail, Menu, MessageCircle, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import type { Profile } from '../types';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const iconFor = (name: string) => name === 'github' ? Github : name === 'instagram' ? Instagram : Mail;

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    api.profile.get().then(setProfile).catch(() => null);
  }, []);
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const navClass = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'nav-link-active' : ''}`;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Rising horizon progress bar */}
      <div className="fixed left-0 top-0 z-[70] h-[2px] w-full bg-gradient-to-r from-[#6E7C52] via-[#D9A441] to-[#5C7A89]" />

      <header
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{ borderBottom: '1px solid var(--border-soft)', background: 'color-mix(in srgb, var(--bg) 88%, transparent)' }}
      >
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <Logo />

          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <NavLink to="/" className={navClass} end>Home</NavLink>
            <NavLink to="/gallery" className={navClass}>Gallery</NavLink>
            <Link to="/#favorites" className="nav-link">Favorites</Link>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {user ? (
              <>
                <Link to="/chat" className="btn-outline !px-4 !py-2.5">
                  <MessageCircle size={16} />{isAdmin ? 'Inbox' : 'Messages'}
                </Link>
                <button onClick={signOut} className="icon-button" aria-label="Sign out">
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Sign in</Link>
                <Link to="/signup" className="btn-primary !px-5 !py-2.5">Say hello</Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              className="icon-button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div
            className="px-5 py-5 md:hidden"
            style={{ borderTop: '1px solid var(--border-soft)', background: 'var(--bg-surface)' }}
          >
            <nav className="flex flex-col gap-1">
              <NavLink to="/" className="mobile-nav-link">Home</NavLink>
              <NavLink to="/gallery" className="mobile-nav-link">Gallery</NavLink>
              <Link to="/#favorites" className="mobile-nav-link">Favorites</Link>
              {user ? (
                <>
                  <NavLink to="/chat" className="mobile-nav-link">{isAdmin ? 'Inbox' : 'Messages'}</NavLink>
                  <button onClick={signOut} className="mobile-nav-link text-left">Sign out</button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className="mobile-nav-link">Sign in</NavLink>
                  <NavLink to="/signup" className="btn-primary mt-3 justify-center">Say hello</NavLink>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <main><Outlet /></main>

      <footer
        className="mt-20"
        style={{ borderTop: '2px solid transparent', borderImage: 'linear-gradient(90deg,#6E7C52,#D9A441,#5C7A89) 1', background: 'var(--bg-surface)' }}
      >
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-5 px-5 py-10 text-center sm:flex-row sm:px-8 sm:text-left">
          <div>
            <p className="font-serif text-lg" style={{ color: 'var(--ink)' }}>Made slowly, shared warmly.</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>© {new Date().getFullYear()} {profile?.display_name || 'Field Notes'}</p>
          </div>
          <div className="flex items-center gap-2">
            {profile && Object.entries(profile.social_links || {}).map(([name, url]) => {
              const Icon = iconFor(name);
              return <a key={name} href={url} target="_blank" rel="noreferrer" className="icon-button" aria-label={name}><Icon size={17} /></a>;
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}
