import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, CircleUserRound, Eye, EyeOff, Leaf } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../lib/googleAuth';
import { api } from '../lib/api';

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { if (user) navigate((location.state as { from?: string } | null)?.from || '/chat', { replace: true }); }, [user, navigate, location.state]);
  useEffect(() => { setError(''); setNotice(''); }, [mode]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    if (isSignup && form.name.trim().length < 2) return setError('Please share the name you would like us to use.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Please enter a valid email address.');
    if (form.password.length < 6) return setError('Your password needs at least six characters.');
    setBusy(true);
    try {
      if (isSignup) await api.auth.register(form.name.trim(), form.email, form.password);
      else await api.auth.login(form.email, form.password);
      await refresh();
      navigate('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not open your account.');
    } finally { setBusy(false); }
  };

  const resetPassword = async () => {
    setError(''); setNotice('');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Enter your email first, and we'll send a reset link.");
    try { await api.auth.forgotPassword(form.email); setNotice('A password reset link is on its way.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'We could not send a reset link.'); }
  };

  return (
    <div className="relative grid min-h-[calc(100vh-76px)] place-items-center overflow-hidden px-5 py-16">
      <div className="auth-glow" />
      <div className="relative w-full max-w-[470px] overflow-hidden rounded-[1.6rem] p-6 sm:p-9" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-xl)' }}>
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#6E7C52] via-[#D9A441] to-[#5C7A89]" />

        <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>
          {isSignup ? <Leaf size={21} /> : <CircleUserRound size={21} />}
        </span>

        <p className="eyebrow mt-7">{isSignup ? 'Come in, stay awhile' : 'Good to see you again'}</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl" style={{ color: 'var(--ink)' }}>
          {isSignup ? 'Say hello' : 'Welcome back'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {isSignup ? 'Create an account to chat and follow along.' : 'Sign in to continue your quiet conversation.'}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          {isSignup && (
            <label className="field-label">
              Your name
              <input className="input-field mt-2" autoComplete="name" placeholder="How should we call you?" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
          )}
          <label className="field-label">
            Email address
            <input type="email" className="input-field mt-2" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="field-label">
            Password
            <div className="relative mt-2">
              <input type={showPassword ? 'text' : 'password'} className="input-field pr-12" autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="At least 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} aria-label="Toggle password visibility">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {!isSignup && (
            <div className="text-right">
              <button type="button" onClick={resetPassword} className="text-sm hover:underline" style={{ color: 'var(--fjord)' }}>Forgot password?</button>
            </div>
          )}
          {error && <p className="rounded-lg px-3 py-2.5 text-sm leading-relaxed" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>{error}</p>}
          {notice && <p className="rounded-lg px-3 py-2.5 text-sm leading-relaxed" style={{ background: 'rgba(110,124,82,.1)', color: 'var(--moss)' }}>{notice}</p>}
          <button disabled={busy} className="btn-primary w-full justify-center disabled:opacity-60">
            {busy ? 'Opening the door…' : isSignup ? 'Create account' : 'Sign in'} {!busy && <ArrowRight size={17} />}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
          <span className="font-mono text-[9px] uppercase tracking-[.16em]" style={{ color: 'var(--ink-4)' }}>or</span>
          <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
        </div>

        <button
          onClick={() => { if (!signInWithGoogle()) setError('Google sign-in is not available right now. Please use email instead.'); }}
          className="btn-outline w-full justify-center"
        >
          <CircleUserRound size={17} /> Continue with Google
        </button>

        <p className="mt-7 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
          {isSignup ? 'Already have an account?' : 'New here?'}{' '}
          <Link className="font-medium hover:underline" style={{ color: 'var(--fjord)' }} to={isSignup ? '/login' : '/signup'}>
            {isSignup ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </div>
  );
}
