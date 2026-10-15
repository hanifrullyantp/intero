import { useState } from 'react';
import { getSupabase } from '../lib/supabase';
import InteroLogo from './InteroLogo';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const sb = getSupabase();
    try {
      if (mode === 'signup') {
        const { error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: name || email.split('@')[0] } },
        });
        if (error) throw error;
        window.location.href = '/app';
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/app';
      }
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr(null);
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) setErr(error.message);
  };

  return (
    <div className="min-h-full grid place-items-center p-6" style={{ background: 'var(--bg-main)' }}>
      <div className="card w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <InteroLogo size={40} className="rounded-lg" />
          <div>
            <div className="font-bold text-lg">Instant 3D</div>
            <div className="text-xs opacity-70">Sign in to sync projects across devices</div>
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <button type="button" className={`flex-1 py-2 text-sm rounded-lg border ${mode === 'signin' ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-[var(--border)]'}`} onClick={() => setMode('signin')}>Sign in</button>
          <button type="button" className={`flex-1 py-2 text-sm rounded-lg border ${mode === 'signup' ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-[var(--border)]'}`} onClick={() => setMode('signup')}>Create account</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <input className="input w-full" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          )}
          <input className="input w-full" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input className="input w-full" type="password" placeholder="Password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          {err && <p className="text-xs text-[var(--error)]">{err}</p>}
          <button type="submit" className="btn-primary w-full py-2.5!" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form>
        <button type="button" className="btn w-full mt-3 py-2!" onClick={() => { void google(); }}>Continue with Google</button>
        <p className="text-[10px] text-center mt-4 opacity-60">Free plan: 3 cloud projects · works offline</p>
      </div>
    </div>
  );
}
