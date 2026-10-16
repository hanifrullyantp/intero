import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getSupabase } from '../lib/supabase';
import InteroLogo from './InteroLogo';
import { Star } from './icons';
import KitchenPreviewVisual from './saas/KitchenPreviewVisual';
import { useSaasPage } from './saas/useSaasPage';

const ROLES = ['Designer', 'Workshop', 'Architect', 'Personal'];

function passwordStrength(pw: string): { pct: number; label: string; color: string } {
  if (!pw) return { pct: 0, label: '', color: '#e5e7eb' };
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { pct: 33, label: 'Lemah', color: '#dc2626' };
  if (s <= 2) return { pct: 66, label: 'Cukup', color: '#d97706' };
  return { pct: 100, label: 'Kuat', color: '#1b9d6b' };
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.56 2.95-2.24 5.45-4.78 7.12l7.73 6.01c4.51-4.16 7.11-10.28 7.11-17.6z" />
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6.01c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export default function AuthPage() {
  useSaasPage('Masuk · Instant 3D');
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [remember, setRemember] = useState(true);
  const [terms, setTerms] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % 4), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!loading && user) window.location.replace('/enter');
  }, [loading, user]);

  const pw = passwordStrength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    if (mode === 'signup' && !terms) {
      setErr('Setujui syarat & ketentuan untuk melanjutkan.');
      return;
    }
    setBusy(true);
    const sb = getSupabase();
    try {
      if (mode === 'signup') {
        const { error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: name || email.split('@')[0], role } },
        });
        if (error) throw error;
        window.location.href = '/enter';
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/enter';
      }
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: 'google' | 'apple') => {
    setErr(null);
    setInfo(null);
    setBusy(true);
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/enter` },
    });
    setBusy(false);
    if (error) setErr(error.message);
  };

  const forgotPassword = async () => {
    setErr(null);
    setInfo(null);
    if (!email.trim()) {
      setErr('Masukkan email Anda dulu, lalu klik Lupa password.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/enter`,
      });
      if (error) throw error;
      setInfo('Link reset password telah dikirim ke email Anda.');
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="saas-app saas-auth-split">
      <section className="saas-auth-hero">
        <div className="flex items-center gap-2 relative z-10">
          <InteroLogo size={40} className="rounded-xl shadow-sm" />
          <span className="text-lg font-bold text-[#111827]">Instant 3D</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mt-10 mb-3 relative z-10 text-[#111827] max-w-lg">
          Design kitchen set impian dalam hitungan menit
        </h1>
        <p className="text-base text-[#6b7280] relative z-10 max-w-md">
          Platform furniture design untuk designer Indonesia — cepat, parametric, siap produksi.
        </p>
        <div className="saas-auth-preview saas-hero-carousel relative z-10">
          <KitchenPreviewVisual variant={slide} animate />
        </div>
        <div className="flex items-center gap-4 mt-auto pt-6 relative z-10 text-sm text-[#374151]">
          <span><strong>10,000+</strong> designer</span>
          <span className="flex items-center gap-1"><Star size={14} className="text-amber-500" /> 4.9 rating</span>
        </div>
      </section>

      <section className="saas-auth-form-panel">
        <div className="saas-auth-form">
          <h2 className="text-2xl font-bold mb-1 text-[#111827]">
            {mode === 'signin' ? 'Selamat datang kembali! 👋' : 'Buat akun gratis'}
          </h2>
          <p className="text-sm text-[#6b7280] mb-6">
            {mode === 'signin' ? 'Masuk untuk sync proyek di cloud' : 'Mulai design dalam 2 menit'}
          </p>

          <div className="space-y-3 mb-4">
            <button type="button" className="saas-btn-oauth" disabled={busy} onClick={() => { void oauth('google'); }}>
              <GoogleIcon /> Lanjutkan dengan Google
            </button>
            <button type="button" className="saas-btn-oauth" disabled={busy} onClick={() => { void oauth('apple'); }}>
              <AppleIcon /> Lanjutkan dengan Apple
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#9ca3af] my-5">
            <div className="flex-1 h-px bg-[#e5e7eb]" /> atau dengan email <div className="flex-1 h-px bg-[#e5e7eb]" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <input className="saas-input" placeholder="Nama lengkap" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                <select className="saas-input" value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </>
            )}
            <input className={`saas-input ${err && !info ? 'saas-input-error' : ''}`} type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <div>
              <input className={`saas-input ${err && !info ? 'saas-input-error' : ''}`} type="password" placeholder="Password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              {mode === 'signup' && password && (
                <div className="saas-pw-bar"><span style={{ width: `${pw.pct}%`, background: pw.color }} /></div>
              )}
              {mode === 'signup' && pw.label && <div className="text-[10px] mt-1 text-[#6b7280]">Kekuatan: {pw.label}</div>}
            </div>
            {mode === 'signin' && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-[#6b7280]">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Ingat saya
                </label>
                <button type="button" className="text-[#1b9d6b] hover:underline bg-transparent border-none cursor-pointer" onClick={() => { void forgotPassword(); }}>Lupa password?</button>
              </div>
            )}
            {mode === 'signup' && (
              <label className="flex items-start gap-2 text-xs text-[#6b7280]">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5" />
                Saya setuju Syarat Layanan & Kebijakan Privasi
              </label>
            )}
            {info && <p className="text-xs text-[#158558]">{info}</p>}
            {err && <p className="text-xs text-[#dc2626]">{err}</p>}
            <button type="submit" className="saas-btn-primary" disabled={busy}>
              {busy ? 'Mohon tunggu…' : mode === 'signin' ? 'Masuk →' : 'Daftar gratis →'}
            </button>
          </form>

          <p className="text-sm text-center mt-5 text-[#6b7280]">
            {mode === 'signin' ? (
              <>Belum punya akun? <button type="button" className="text-[#1b9d6b] font-semibold bg-transparent border-none cursor-pointer" onClick={() => { setMode('signup'); setErr(null); setInfo(null); }}>Daftar gratis</button></>
            ) : (
              <>Sudah punya akun? <button type="button" className="text-[#1b9d6b] font-semibold bg-transparent border-none cursor-pointer" onClick={() => { setMode('signin'); setErr(null); setInfo(null); }}>Masuk</button></>
            )}
          </p>
          <p className="text-center mt-4">
            <a href="/?local=1" className="text-sm text-[#6b7280] hover:text-[#1b9d6b]">Coba tanpa akun (editor lokal)</a>
          </p>
          <footer className="flex flex-wrap justify-center gap-3 mt-8 pt-6 border-t border-[#e5e7eb] text-[11px] text-[#9ca3af]">
            <span>ID · Bahasa Indonesia</span>
            <a href="https://intero.id" target="_blank" rel="noreferrer" className="hover:underline">intero.id</a>
          </footer>
        </div>
      </section>
    </div>
  );
}
