import { Link, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingState from './LoadingState';

/**
 * Owner-only gate. Signed-out visitors go to the sign-in page; signed-in
 * visitors get a calm explanation instead of a blank redirect loop.
 */
export default function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Checking the key…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (!isAdmin) {
    return (
      <div className="page-shell py-28 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>
          <ShieldAlert size={24} />
        </span>
        <h1 className="mt-6 font-serif text-4xl" style={{ color: 'var(--ink)' }}>This room is the owner's</h1>
        <p className="mx-auto mt-3 max-w-md leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          Your account does not have studio access. If you were looking for your messages, they are just through here.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/chat" className="btn-primary">Go to messages</Link>
          <Link to="/" className="btn-outline">Back home</Link>
        </div>
      </div>
    );
  }

  return children;
}
