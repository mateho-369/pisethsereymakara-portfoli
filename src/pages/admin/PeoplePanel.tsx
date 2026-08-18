import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, MessageCircle, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { useToast } from '../../components/ui/Toast';
import { TextField } from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import KebabMenu from '../../components/ui/KebabMenu';
import LoadingState from '../../components/LoadingState';
import type { AdminUser } from '../../types';

/**
 * Everyone who has signed up. Blocking pauses their messaging only — the
 * portfolio itself stays readable, which is the gentler choice.
 */
export default function PeoplePanel() {
  const { success, error: toastError } = useToast();
  const load = useCallback(() => api.admin.users.list(), []);
  const { data: users, loading, error, reload } = useResource<AdminUser[]>(load, []);

  const [search, setSearch] = useState('');
  const [blocking, setBlocking] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState('');
  const [removing, setRemoving] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <LoadingState label="Looking through the guest book…" />;
  if (error) return <div className="admin-card" style={{ color: 'var(--gold-deep)' }}>{error}</div>;

  const term = search.trim().toLowerCase();
  const visible = term ? users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(term)) : users;

  const block = async () => {
    if (!blocking) return;
    setBusy(true);
    try {
      await api.admin.users.block(blocking.id, reason.trim() || undefined);
      await reload();
      success(`${blocking.name} can no longer send messages.`);
      setBlocking(null); setReason('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not pause this visitor.');
    } finally {
      setBusy(false);
    }
  };

  const unblock = async (user: AdminUser) => {
    try { await api.admin.users.unblock(user.id); await reload(); success(`${user.name} can write to you again.`); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Could not restore this visitor.'); }
  };

  const remove = async (user: AdminUser) => {
    try { await api.admin.users.remove(user.id); await reload(); success('Account and conversation removed.'); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Could not remove this account.'); }
  };

  return (
    <div className="space-y-5">
      <div className="admin-card">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
          <input className="input-field !pl-10" placeholder="Search by name or email" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      <div className="admin-card">
        {visible.map((user) => {
          const isOwner = user.role === 'admin';
          const blocked = Boolean(user.blocked_at);
          return (
            <div key={user.id} className="admin-row md:grid-cols-[auto_1fr_auto] md:items-center">
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full font-serif" style={{ background: 'rgba(110,124,82,.12)', color: 'var(--moss)' }}>
                {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium" style={{ color: 'var(--ink)' }}>
                  {user.name}
                  {isOwner && <span className="admin-chip" style={{ background: 'rgba(92,122,137,.16)', color: 'var(--fjord)' }}>owner</span>}
                  {blocked && <span className="admin-chip" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>paused</span>}
                  {user.is_google && <span className="admin-chip" style={{ background: 'var(--border-soft)', color: 'var(--ink-3)' }}>google</span>}
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>{user.email}</p>
                <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[.14em]" style={{ color: 'var(--ink-4)' }}>
                  {user.message_count} letters{user.blocked_reason ? ` · ${user.blocked_reason}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {user.conversation_id && (
                  <Link to="/chat" className="icon-button" aria-label="Open conversation"><MessageCircle size={16} /></Link>
                )}
                {!isOwner && (
                  <KebabMenu actions={[
                    blocked
                      ? { label: 'Allow messaging', icon: <ShieldCheck size={15} />, onClick: () => unblock(user) }
                      : { label: 'Pause messaging', icon: <Ban size={15} />, danger: true, onClick: () => { setBlocking(user); setReason(''); } },
                    { label: 'Delete account', icon: <Trash2 size={15} />, danger: true, onClick: () => setRemoving(user) },
                  ]} />
                )}
              </div>
            </div>
          );
        })}
        {visible.length === 0 && <p className="py-8 text-center text-sm" style={{ color: 'var(--ink-4)' }}>Nobody here yet.</p>}
      </div>

      <Modal
        open={blocking !== null}
        title={`Pause ${blocking?.name || ''}?`}
        description="They can still read the site, but the message composer will be closed to them."
        onClose={() => setBlocking(null)}
        width="30rem"
        footer={
          <>
            <button onClick={() => setBlocking(null)} className="btn-outline !py-2.5">Cancel</button>
            <button onClick={block} disabled={busy} className="danger-button disabled:opacity-60">{busy ? 'Working…' : 'Pause messaging'}</button>
          </>
        }
      >
        <div className="pb-3">
          <TextField label="Private note (optional)" value={reason} onChange={setReason} placeholder="Why you paused this account" hint="Only you can see this." />
        </div>
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        title="Delete this account?"
        description={`${removing?.name}'s account, conversation and letters will be permanently removed.`}
        confirmLabel="Delete account"
        tone="destructive"
        onConfirm={async () => { if (removing) await remove(removing); }}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
