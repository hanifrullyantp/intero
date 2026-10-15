import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import InteroLogo from './InteroLogo';
import { Star } from './icons';

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=960&q=80',
  'https://images.unsplash.com/photo-1556912177-c54030639a6d?auto=format&fit=crop&w=960&q=80',
  'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=960&q=80',
];

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

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [remember, setRemember] = useState(true);
  const [terms, setTerms] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const pw = passwordStrength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
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

  const oauth = async (provider: 'google' | 'apple') => {
    setErr(null);
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) setErr(error.message);
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
          <img src={HERO_IMAGES[slide]} alt="Kitchen set 3D preview" key={slide} />
        </div>
        <div className="flex items-center gap-4 mt-auto pt-6 relative z-10 text-sm text-[#374151]">
          <span><strong>10,000+</strong> designer</span>
          <span className="flex items-center gap-1"><Star size={14} className="text-amber-500 fill-amber-500" /> 4.9 rating</span>
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
            <button type="button" className="saas-btn-oauth" onClick={() => { void oauth('google'); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22 12h-4.5v-2H12V7h5.5V4.5A8.5 8.5 0 0 0 12 3.5 8.5 8.5 0 0 0 3.5 12 8.5 8.5 0 0 0 12 20.5c4.1 0 7.6-2.7 8.8-6.5H12v-2H22z"/></svg>
              Lanjutkan dengan Google
            </button>
            <button type="button" className="saas-btn-oauth" onClick={() => { void oauth('apple'); }}>
              <span aria-hidden>🍎</span> Lanjutkan dengan Apple
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#9ca3af] my-5">
            <div className="flex-1 h-px bg-[#e5e7eb]" /> atau dengan email <div className="flex-1 h-px bg-[#e5e7eb]" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <input className={`saas-input ${err && !name ? 'saas-input-error' : ''}`} placeholder="Nama lengkap" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                <select className="saas-input" value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </>
            )}
            <input className={`saas-input ${err ? 'saas-input-error' : ''}`} type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <div>
              <input className={`saas-input ${err ? 'saas-input-error' : ''}`} type="password" placeholder="Password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
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
                <button type="button" className="text-[#1b9d6b] hover:underline bg-transparent border-none cursor-pointer" onClick={() => setErr('Reset password: gunakan link dari email Supabase (Forgot password di dashboard).')}>Lupa password?</button>
              </div>
            )}
            {mode === 'signup' && (
              <label className="flex items-start gap-2 text-xs text-[#6b7280]">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5" />
                Saya setuju Syarat Layanan & Kebijakan Privasi
              </label>
            )}
            {err && <p className="text-xs text-[#dc2626]">{err}</p>}
            <button type="submit" className="saas-btn-primary" disabled={busy}>
              {busy ? 'Mohon tunggu…' : mode === 'signin' ? 'Masuk →' : 'Daftar gratis →'}
            </button>
          </form>

          <p className="text-sm text-center mt-5 text-[#6b7280]">
            {mode === 'signin' ? (
              <>Belum punya akun? <button type="button" className="text-[#1b9d6b] font-semibold bg-transparent border-none cursor-pointer" onClick={() => setMode('signup')}>Daftar gratis</button></>
            ) : (
              <>Sudah punya akun? <button type="button" className="text-[#1b9d6b] font-semibold bg-transparent border-none cursor-pointer" onClick={() => setMode('signin')}>Masuk</button></>
            )}
          </p>
          <p className="text-center mt-4">
            <a href="/" className="text-sm text-[#6b7280] hover:text-[#1b9d6b]">🚀 Coba tanpa akun (local only)</a>
          </p>
          <footer className="flex flex-wrap justify-center gap-3 mt-8 pt-6 border-t border-[#e5e7eb] text-[11px] text-[#9ca3af]">
            <span>🇮🇩 ID</span>
            <a href="#" className="hover:underline">Terms</a>
            <a href="#" className="hover:underline">Privacy</a>
          </footer>
        </div>
      </section>
    </div>
  );
}
