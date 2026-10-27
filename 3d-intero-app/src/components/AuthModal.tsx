import { useState, type FormEvent } from 'react';
import { Box, Eye, EyeOff, Mail, X, Check } from 'lucide-react';
import { Modal, toast } from './ui';
import { APP_NAME } from '../lib/constants';

type Tab = 'login' | 'register' | 'forgot';

/** MOCK AUTH — UI saja. Tidak ada server, JWT, atau hashing. Submit → localStorage flag → editor. */
function mockLogin(name: string, email: string) {
  localStorage.setItem('intero_isLoggedIn', 'true');
  localStorage.setItem('intero_user', JSON.stringify({ name: name || 'Pengguna 3D Intero', email, loginAt: new Date().toISOString() }));
}

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('login');
  const [showPw, setShowPw] = useState(false);
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [agree, setAgree] = useState(false);
  const [remember, setRemember] = useState(true);

  const finish = (n: string, e: string) => {
    mockLogin(n, e);
    onClose();
    toast(`Berhasil masuk! Selamat datang di ${APP_NAME}`, 'success');
    setTimeout(() => window.dispatchEvent(new Event('intero:startEditor')), 400);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || !email.includes('.')) { toast('Format email salah', 'error'); return; }
    if (tab === 'forgot') { setSent(true); return; }
    if (pw.length < 6) { toast('Password minimal 6 karakter', 'error'); return; }
    if (tab === 'register') {
      if (!name.trim()) { toast('Nama lengkap wajib diisi', 'error'); return; }
      if (pw !== pw2) { toast('Konfirmasi password tidak sama', 'error'); return; }
      if (!agree) { toast('Setujui Syarat & Ketentuan terlebih dahulu', 'error'); return; }
    }
    finish(tab === 'register' ? name : email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), email);
  };
  const input = 'input input-lg';
  return (
    <Modal onClose={onClose} width={440}>
      <div className="p-7 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--brand-primary)', color: '#fff' }}><Box size={22} /></span>
          <div className="flex-1"><h3 className="text-[20px] font-extrabold tracking-tight">{APP_NAME}</h3><p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Masuk untuk mulai mendesain — semua data tersimpan di perangkat Anda.</p></div>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={18} /></button>
        </div>
        <div className="seg w-full">
          {(['login', 'register', 'forgot'] as Tab[]).map((t) => <button key={t} type="button" className={`flex-1 ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setSent(false); }}>{t === 'login' ? 'Masuk' : t === 'register' ? 'Daftar' : 'Lupa Password'}</button>)}
        </div>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          {tab === 'register' && <input className={input} name="name" placeholder="Nama Lengkap" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
          <input className={input} name="email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          {tab !== 'forgot' && (
            <div className="relative">
              <input className={input} name="password" type={showPw ? 'text' : 'password'} placeholder="Password (min 6 karakter)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} required style={{ paddingRight: 44 }} />
              <button type="button" className="icon-btn absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 32, height: 32 }} onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          )}
          {tab === 'register' && <input className={input} type={showPw ? 'text' : 'password'} placeholder="Konfirmasi Password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required />}
          {tab === 'login' && (
            <div className="flex items-center justify-between text-[12.5px]">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-[var(--brand-primary)]" />Ingat saya</label>
              <button type="button" className="font-semibold" style={{ color: 'var(--brand-primary)' }} onClick={() => setTab('forgot')}>Lupa password?</button>
            </div>
          )}
          {tab === 'register' && <label className="flex items-center gap-2 text-[12.5px] cursor-pointer"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="accent-[var(--brand-primary)]" />Saya setuju dengan Syarat & Ketentuan</label>}
          {tab === 'forgot' && sent ? (
            <div className="rounded-xl p-3 flex gap-2 text-[12.5px]" style={{ background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' }}><Check size={16} className="shrink-0" />Email reset password telah dikirim (mockup — tidak ada email beneran dikirim karena belum ada backend).</div>
          ) : (
            <button type="submit" className="btn btn-primary btn-lg w-full">{tab === 'login' ? 'Masuk' : tab === 'register' ? 'Daftar' : 'Kirim Link Reset'}</button>
          )}
        </form>
        {tab === 'login' && (<>
          <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-tertiary)' }}><span className="flex-1 h-px" style={{ background: 'var(--border)' }} />atau<span className="flex-1 h-px" style={{ background: 'var(--border)' }} /></div>
          <div className="flex flex-col gap-2">
            <button type="button" className="btn btn-secondary w-full" onClick={() => finish('Pengguna Google', 'pengguna@gmail.com')}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.2 14.7 2.2 12 2.2 6.6 2.2 2.3 6.6 2.3 12S6.6 21.8 12 21.8c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" /></svg>
              Masuk dengan Google
            </button>
            <button type="button" className="btn btn-secondary w-full" onClick={() => { if (!email.includes('@')) { toast('Isi email terlebih dahulu untuk magic link', 'warning'); return; } finish('', email); }}><Mail size={16} />Masuk dengan Email Magic Link</button>
          </div>
        </>)}
        <p className="text-center text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
          {tab === 'login' ? <>Belum punya akun? <button type="button" className="font-semibold" style={{ color: 'var(--brand-primary)' }} onClick={() => setTab('register')}>Daftar sekarang</button></> : <>Sudah punya akun? <button type="button" className="font-semibold" style={{ color: 'var(--brand-primary)' }} onClick={() => setTab('login')}>Masuk</button></>}
        </p>
      </div>
    </Modal>
  );
}
