import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Archive, ArchiveRestore, ArrowLeft, Ban, FileText, Inbox, LoaderCircle, MessageCircle, Paperclip, Search, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import { api } from '../lib/api';
import type { Conversation, Message, Profile } from '../types';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import LoadingState from '../components/LoadingState';

function relativeTime(value: string) {
  const s = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function ChatPage() {
  const { user, isAdmin } = useAuth();
  const { text } = useContent();
  const { success, error: toastError } = useToast();
  const [folder, setFolder] = useState<'open' | 'archived'>('open');
  const [pendingRemoval, setPendingRemoval] = useState<Message | null>(null);
  const [pendingThread, setPendingThread] = useState<Conversation | null>(null);
  const blocked = Boolean(user?.blocked_at) && !isAdmin;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async (id: number) => {
    setMessages(await api.messages.list(id));
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      let data = await api.conversations.list(isAdmin, folder);
      if (!isAdmin && data.length === 0) {
        const created = await api.conversations.create();
        data = [created];
      }
      setConversations(data);
      setSelected((cur) => cur ? data.find((c: Conversation) => c.id === cur.id) || data[0] || null : data[0] || null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not open conversations.'); }
    finally { setLoading(false); }
  }, [isAdmin, user, folder]);

  useEffect(() => { api.profile.get().then(setProfile).catch(() => null); fetchConversations(); }, [fetchConversations]);
  useEffect(() => { if (selected) fetchMessages(selected.id).catch((e) => setError(e.message)); else setMessages([]); }, [selected?.id, fetchMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!selected) return;
    const poll = window.setInterval(() => fetchMessages(selected.id).catch(() => null), 6000);
    return () => window.clearInterval(poll);
  }, [selected?.id, fetchMessages]);

  const chooseConversation = async (c: Conversation) => {
    setSelected(c);
    if (isAdmin && c.unread_count > 0) { await api.conversations.markRead(c.id); fetchConversations(); }
  };

  const removeMessage = async (message: Message) => {
    try {
      await api.messages.remove(message.id);
      if (selected) await fetchMessages(selected.id);
      success('The letter was removed.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not remove this message.');
    }
  };

  const setArchived = async (conversation: Conversation, archived: boolean) => {
    try {
      if (archived) await api.conversations.archive(conversation.id);
      else await api.conversations.restore(conversation.id);
      setSelected(null);
      await fetchConversations();
      success(archived ? 'Conversation archived.' : 'Conversation restored.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not move this conversation.');
    }
  };

  const removeThread = async (conversation: Conversation) => {
    try {
      await api.conversations.remove(conversation.id);
      setSelected(null);
      await fetchConversations();
      success('Conversation deleted.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not delete this conversation.');
    }
  };

  const toggleVisitorBlock = async (conversation: Conversation) => {
    const id = conversation.visitor_user_id;
    if (!id) return toastError('This visitor no longer has an account.');
    try {
      if (conversation.visitor_blocked) await api.admin.users.unblock(id);
      else await api.admin.users.block(id);
      await fetchConversations();
      success(conversation.visitor_blocked ? 'They can write to you again.' : 'Messaging is paused for this visitor.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not change this visitor.');
    }
  };

  const send = async () => {
    if (!selected || (!draft.trim() && !attachment)) return;
    setSending(true); setError('');
    try {
      await api.messages.send(selected.id, draft.trim(), attachment || null);
      setDraft(''); setAttachment(''); await fetchMessages(selected.id); await fetchConversations();
    } catch (err) { setError(err instanceof Error ? err.message : 'The message could not be sent.'); }
    finally { setSending(false); }
  };

  const uploadAttachment = async (file?: File) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return setError('Attachments must be smaller than 4 MB.');
    setUploading(true); setError('');
    try { const u = await api.uploads.file(file, 'chat'); setAttachment(u.url); }
    catch (err) { setError(err instanceof Error ? err.message : 'Attachment upload failed.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  if (loading) return <LoadingState label="Finding your letters…" />;
  const visibleConversations = conversations.filter((c) => `${c.visitor_name} ${c.visitor_email}`.toLowerCase().includes(search.toLowerCase()));
  const otherName = isAdmin ? selected?.visitor_name : profile?.display_name;

  return (
    <div className="page-shell py-6 md:py-10">
      <div className="mb-7 flex items-end justify-between">
        <div>
          <p className="eyebrow"><MessageCircle size={13} /> {text('chat.eyebrow', 'Personal letters')}</p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight" style={{ color: 'var(--ink)' }}>{isAdmin ? text('chat.title_owner', 'Your inbox') : text('chat.title_visitor', 'A quiet conversation')}</h1>
        </div>
        {isAdmin && (
          <span className="hidden rounded-full px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.14em] sm:block" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>
            {conversations.reduce((s, c) => s + c.unread_count, 0)} unread
          </span>
        )}
      </div>

      {error && <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>{error}</div>}

      <div className={`chat-shell ${isAdmin ? 'admin-chat-shell' : 'visitor-chat-shell'}`}>
        {/* ── Sidebar (admin only) ── */}
        {isAdmin && (
          <aside className={`${selected ? 'hidden md:flex' : 'flex'} min-h-[650px] flex-col border-r md:flex`} style={{ borderColor: 'var(--border-soft)', background: 'var(--chat-aside)' }}>
            <div className="space-y-3 p-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field !py-2.5 !pl-10" placeholder="Search people" />
              </div>
              <div className="flex gap-2">
                {(['open', 'archived'] as const).map((name) => (
                  <button
                    key={name}
                    onClick={() => { setFolder(name); setSelected(null); }}
                    className={`filter-pill ${folder === name ? 'filter-pill-active' : ''}`}
                  >
                    {name === 'open' ? 'Inbox' : 'Archived'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-3">
              {visibleConversations.length ? visibleConversations.map((c) => (
                <button key={c.id} onClick={() => chooseConversation(c)} className={`conversation-row ${selected?.id === c.id ? 'conversation-row-active' : ''}`}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full font-serif" style={{ background: 'rgba(110,124,82,.12)', color: 'var(--moss)' }}>
                    {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" /> : c.visitor_name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="flex items-center justify-between gap-2">
                      <strong className="truncate text-sm font-medium" style={{ color: 'var(--ink)' }}>{c.visitor_name}</strong>
                      <time className="font-mono text-[9px]" style={{ color: 'var(--ink-3)' }}>{relativeTime(c.last_message_at)}</time>
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs" style={{ color: 'var(--ink-3)' }}>{c.visitor_email}</span>
                      {c.unread_count > 0 && <span className="grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 font-mono text-[8px]" style={{ background: 'var(--gold)', color: '#F8F4E9' }}>{c.unread_count}</span>}
                    </span>
                  </span>
                </button>
              )) : (
                <div className="px-4 py-16 text-center" style={{ color: 'var(--ink-3)' }}>
                  <Inbox className="mx-auto" size={23} />
                  <p className="mt-3 text-sm">No letters yet.</p>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ── Thread ── */}
        <section className={`${isAdmin && !selected ? 'hidden md:flex' : 'flex'} min-h-[650px] flex-col`} style={{ background: 'var(--bg-surface)' }}>
          {selected ? (
            <>
              <header className="flex h-[76px] items-center gap-3 border-b px-4 sm:px-6" style={{ borderColor: 'var(--border-soft)' }}>
                {isAdmin && <button className="icon-button md:hidden" onClick={() => setSelected(null)}><ArrowLeft size={18} /></button>}
                <span className="grid h-10 w-10 place-items-center rounded-full font-serif" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>{otherName?.charAt(0) || 'F'}</span>
                <div>
                  <h2 className="font-serif text-lg" style={{ color: 'var(--ink)' }}>{otherName || 'Your conversation'}</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[.13em]" style={{ color: 'var(--ink-3)' }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: selected.visitor_blocked ? 'var(--gold)' : 'var(--fjord)' }} />
                    {isAdmin && selected.visitor_blocked ? 'Messaging paused' : text('chat.presence', 'Here in the quiet')}
                  </p>
                </div>

                {isAdmin && (
                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => toggleVisitorBlock(selected)} className="icon-button" title={selected.visitor_blocked ? 'Allow messaging' : 'Pause messaging'} aria-label="Toggle messaging">
                      {selected.visitor_blocked ? <ShieldCheck size={17} /> : <Ban size={17} />}
                    </button>
                    <button onClick={() => setArchived(selected, selected.status !== 'archived')} className="icon-button" title={selected.status === 'archived' ? 'Restore' : 'Archive'} aria-label="Archive conversation">
                      {selected.status === 'archived' ? <ArchiveRestore size={17} /> : <Archive size={17} />}
                    </button>
                    <button onClick={() => setPendingThread(selected)} className="icon-button" title="Delete conversation" aria-label="Delete conversation">
                      <Trash2 size={17} />
                    </button>
                  </div>
                )}
              </header>

              <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-7" style={{ background: `radial-gradient(circle at 50% 0%, var(--gold-pale), transparent 42%)` }}>
                {messages.length === 0 && (
                  <div className="mx-auto max-w-sm py-20 text-center">
                    <MessageCircle className="mx-auto" size={25} style={{ color: 'var(--moss)' }} />
                    <h3 className="mt-4 font-serif text-2xl" style={{ color: 'var(--ink)' }}>{text('chat.empty_title', 'Begin with a simple hello.')}</h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>{text('chat.empty_body', 'This is a small, private space for a thoughtful conversation.')}</p>
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {messages.map((msg) => {
                    const mine = msg.sender_id === String(user?.id);
                    const removed = Boolean(msg.deleted_at);
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`group flex items-center gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                        {isAdmin && !removed && (
                          <button
                            onClick={() => setPendingRemoval(msg)}
                            className="icon-button !h-8 !w-8 opacity-0 transition group-hover:opacity-100"
                            aria-label="Remove this message"
                            title="Remove this message"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <div className={`max-w-[82%] sm:max-w-[68%] ${mine ? 'text-right' : 'text-left'}`}>
                          <div className={`message-bubble ${mine ? 'message-mine' : 'message-theirs'}`} style={{ color: removed ? 'var(--ink-4)' : 'var(--ink)' }}>
                            {removed && <p className="italic">{text('chat.removed_message', 'This message was removed by the owner.')}</p>}
                            {!removed && msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>}
                            {!removed && msg.attachment_url && (
                              <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-lg p-2 text-sm underline" style={{ background: 'var(--bg-muted)' }}>
                                <FileText size={16} /> View attachment
                              </a>
                            )}
                          </div>
                          <time className="mt-1.5 block px-1 font-mono text-[8px] uppercase tracking-[.1em]" style={{ color: 'var(--ink-4)' }}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </time>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={bottomRef} />
              </div>

              <div className="border-t p-3 sm:p-5" style={{ borderColor: 'var(--border-soft)' }}>
                {blocked ? (
                  <p className="rounded-xl px-4 py-3 text-sm leading-relaxed" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>
                    {text('chat.blocked_notice', 'Messaging is paused for this account. You are still welcome to browse the journal.')}
                  </p>
                ) : (
                <>
                {attachment && (
                  <div className="mb-2 flex items-center justify-between rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--border-soft)', color: 'var(--ink-2)' }}>
                    <span className="flex items-center gap-2"><FileText size={14} /> Attachment ready</span>
                    <button onClick={() => setAttachment('')}>Remove</button>
                  </div>
                )}
                <div className="flex items-end gap-2 rounded-2xl border p-2 focus-within:border-[var(--moss)]" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                  <input ref={fileRef} type="file" className="hidden" onChange={(e) => uploadAttachment(e.target.files?.[0])} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} className="icon-button shrink-0" aria-label="Attach a file">
                    {uploading ? <LoaderCircle className="animate-spin" size={17} /> : <Paperclip size={17} />}
                  </button>
                  <textarea
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none"
                    placeholder={text('chat.placeholder', 'Write something kind…')}
                    style={{ color: 'var(--ink)' }}
                  />
                  <button
                    onClick={send}
                    disabled={sending || (!draft.trim() && !attachment)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full shadow-sm transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
                    style={{ background: 'var(--gold)', color: '#F8F4E9' }}
                    aria-label="Send message"
                  >
                    {sending ? <LoaderCircle className="animate-spin" size={17} /> : <Send size={16} />}
                  </button>
                </div>
                </>
                )}
              </div>
            </>
          ) : (
            <div className="hidden flex-1 flex-col items-center justify-center text-center md:flex">
              <Inbox size={28} style={{ color: 'var(--moss)' }} />
              <h2 className="mt-4 font-serif text-2xl" style={{ color: 'var(--ink)' }}>Choose a conversation</h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-3)' }}>Open a letter from the list to begin.</p>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Remove this message?"
        description="The text and any attachment are deleted for good. A short note stays in the thread so the conversation still reads clearly."
        confirmLabel="Remove"
        tone="destructive"
        onConfirm={async () => { if (pendingRemoval) await removeMessage(pendingRemoval); }}
        onClose={() => setPendingRemoval(null)}
      />

      <ConfirmDialog
        open={pendingThread !== null}
        title="Delete this conversation?"
        description={`Every letter with ${pendingThread?.visitor_name || 'this visitor'} will be permanently deleted. Archiving keeps them instead.`}
        confirmLabel="Delete everything"
        tone="destructive"
        onConfirm={async () => { if (pendingThread) await removeThread(pendingThread); }}
        onClose={() => setPendingThread(null)}
      />
    </div>
  );
}
