import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '../../lib/supabase';
import InteroLogo from '../InteroLogo';
import { X } from '../icons';
import './auth.css';

export type AuthTab = 'login' | 'register' | 'forgot';

const ROLES = ['Designer', 'Workshop', 'Architect', 'Personal'];

function oauthRedirect() {
  const u = new URL(window.location.href);
  u.pathname = '/';
  u.search = 'oauth=1';
  return u.toString();
}

function passwordStrength(pw: string): { pct: number; label: string; color: string } {
  if (!pw) return { pct: 0, label: '', color: '#e5e7eb' };
  let s = 0;
  if (pw.length >= 8) s += 25;
  if (/[A-Z]/.test(pw)) s += 25;
  if (/[0-9]/.test(pw)) s += 25;
  if (/[^A-Za-z0-9]/.test(pw)) s += 25;
  if (s <= 25) return { pct: 25, label: 'Lemah', color: '#ef4444' };
  if (s <= 50) return { pct: 50, label: 'Cukup', color: '#f59e0b' };
  if (s <= 75) return { pct: 75, label: 'Bagus', color: '#1b9d6b' };
  return { pct: 100, label: 'Kuat', color: '#10b981' };
}

const TITLES: Record<AuthTab, { title: string; subtitle: string }> = {
  login: { title: 'Selamat Datang Kembali', subtitle: 'Masuk ke akun 3D Intero kamu' },
  register: { title: 'Buat Akun Baru', subtitle: 'Gratis! Mulai desain kitchen set 3D' },
  forgot: { title: 'Reset Password', subtitle: 'Kami akan kirim link reset ke email kamu' },
};

export default function AuthPopup({
  open,
  initialTab = 'login',
  onClose,
  onSuccess,
}: {
  open: boolean;
  initialTab?: AuthTab;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [terms, setTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const pw = passwordStrength(password);
  const meta = TITLES[tab];

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) throw error;
      onClose();
      onSuccess();
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!terms) {
      setErr('Setujui syarat & ketentuan.');
      return;
    }
    if (password !== confirm) {
      setErr('Konfirmasi password tidak cocok.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.signUp({
        email,
        password,
        options: { data: { full_name: name || email.split('@')[0], role } },
      });
      if (error) throw error;
      onClose();
      onSuccess();
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: oauthRedirect(),
      });
      if (error) throw error;
      setInfo('Link reset telah dikirim ke email Anda.');
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: 'google' | 'apple') => {
    setErr(null);
    setBusy(true);
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: oauthRedirect() },
    });
    setBusy(false);
    if (error) setErr(error.message);
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button type="button" className="auth-backdrop" aria-label="Tutup" onClick={onClose} />
      <div className="glass-panel auth-popup" ref={popupRef}>
        <button type="button" className="auth-close" onClick={onClose} aria-label="Tutup">
          <X size={20} />
        </button>
        <div className="auth-header">
          <div className="auth-logo-wrap">
            <InteroLogo size={56} className="rounded-2xl w-full h-full" />
          </div>
          <h2 className="auth-title" id="auth-title">{meta.title}</h2>
          <p className="auth-subtitle">{meta.subtitle}</p>
        </div>

        {tab === 'login' && (
          <form className="auth-form-panel active" onSubmit={submitLogin}>
            <div className="auth-input-group">
              <label htmlFor="login-email">Email</label>
              <input id="login-email" className="auth-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="nama@email.com" />
            </div>
            <div className="auth-input-group">
              <label htmlFor="login-password">Password</label>
              <input id="login-password" className="auth-input" type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" className="auth-link text-xs mt-1" onClick={() => setShowPw((s) => !s)}>{showPw ? 'Sembunyikan' : 'Tampilkan'}</button>
            </div>
            <div className="flex justify-between text-xs mb-2">
              <button type="button" className="auth-link" onClick={() => { setTab('forgot'); setErr(null); }}>Lupa password?</button>
            </div>
            {err && <p className="auth-error">{err}</p>}
            <button type="submit" className="auth-submit-btn" disabled={busy}>{busy ? 'Memproses…' : 'Mulai Desain'}</button>
            <div className="auth-divider"><span>atau masuk dengan</span></div>
            <div className="social-login-row">
              <button type="button" className="social-btn" disabled={busy} onClick={() => { void oauth('google'); }}>Google</button>
              <button type="button" className="social-btn" disabled={busy} onClick={() => { void oauth('apple'); }}>Apple</button>
            </div>
            <p className="auth-switch">Belum punya akun? <button type="button" className="auth-link" onClick={() => { setTab('register'); setErr(null); }}>Daftar gratis</button></p>
          </form>
        )}

        {tab === 'register' && (
          <form className="auth-form-panel active" onSubmit={submitRegister}>
            <div className="auth-input-group">
              <label htmlFor="reg-name">Nama lengkap</label>
              <input id="reg-name" className="auth-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="auth-input-group">
              <label htmlFor="reg-email">Email</label>
              <input id="reg-email" className="auth-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="auth-input-group">
              <label htmlFor="reg-password">Password</label>
              <input id="reg-password" className="auth-input" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
              {password && (
                <div className="strength-bar"><span style={{ width: `${pw.pct}%`, background: pw.color }} /></div>
              )}
              {pw.label && <span className="text-[11px] text-[#6b7280]">{pw.label}</span>}
            </div>
            <div className="auth-input-group">
              <label htmlFor="reg-confirm">Konfirmasi password</label>
              <input id="reg-confirm" className="auth-input" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <select className="auth-input mb-3" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <label className="flex gap-2 text-xs text-[#6b7280] mb-3">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              Saya setuju Syarat & Ketentuan
            </label>
            {err && <p className="auth-error">{err}</p>}
            <button type="submit" className="auth-submit-btn" disabled={busy}>{busy ? 'Memproses…' : 'Buat Akun'}</button>
            <p className="auth-switch">Sudah punya akun? <button type="button" className="auth-link" onClick={() => { setTab('login'); setErr(null); }}>Masuk</button></p>
          </form>
        )}

        {tab === 'forgot' && (
          <form className="auth-form-panel active" onSubmit={submitForgot}>
            <div className="auth-input-group">
              <label htmlFor="forgot-email">Email terdaftar</label>
              <input id="forgot-email" className="auth-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {info && <p className="auth-info">{info}</p>}
            {err && <p className="auth-error">{err}</p>}
            <button type="submit" className="auth-submit-btn" disabled={busy}>Kirim Link Reset</button>
            <p className="auth-switch"><button type="button" className="auth-link" onClick={() => { setTab('login'); setErr(null); setInfo(null); }}>Kembali ke Login</button></p>
          </form>
        )}
      </div>
    </div>
  );
}
