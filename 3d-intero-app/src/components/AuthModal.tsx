import { useState, type FormEvent } from 'react';
import { Box, Eye, EyeOff, X, Check } from 'lucide-react';
import { Modal, toast } from './ui';
import { APP_NAME } from '../lib/constants';
import { setSession } from '../lib/account';
import { loginAccount, registerAccount } from '../lib/cloud-projects';

type Tab = 'login' | 'register' | 'forgot';

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
  const [busy, setBusy] = useState(false);

  const finish = (token: string, user: { id: string; email: string; name: string }) => {
    setSession(token, user, remember);
    onClose();
    toast(`Berhasil masuk! Selamat datang di ${APP_NAME}`, 'success');
    setTimeout(() => window.dispatchEvent(new Event('intero:startEditor')), 400);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || !email.includes('.')) { toast('Format email salah', 'error'); return; }
    if (tab === 'forgot') { setSent(true); return; }
    if (pw.length < 6) { toast('Password minimal 6 karakter', 'error'); return; }
    if (tab === 'register') {
      if (!name.trim()) { toast('Nama lengkap wajib diisi', 'error'); return; }
      if (pw !== pw2) { toast('Konfirmasi password tidak sama', 'error'); return; }
      if (!agree) { toast('Setujui Syarat & Ketentuan terlebih dahulu', 'error'); return; }
    }
    setBusy(true);
    try {
      const result = tab === 'register'
        ? await registerAccount({ name: name.trim(), email, password: pw })
        : await loginAccount({ email, password: pw });
      finish(result.token, result.user);
    } catch (err) { toast((err as Error).message, 'error'); }
    finally { setBusy(false); }
  };
  const input = 'input input-lg';
  return (
    <Modal onClose={onClose} width={440}>
      <div className="p-7 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--brand-primary)', color: '#fff' }}><Box size={22} /></span>
          <div className="flex-1"><h3 className="text-[20px] font-extrabold tracking-tight">{APP_NAME}</h3><p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Masuk untuk menyimpan proyek ke akun Anda, lalu buka lagi dari perangkat mana pun.</p></div>
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
            <div className="rounded-xl p-3 flex gap-2 text-[12.5px]" style={{ background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' }}><Check size={16} className="shrink-0" />Reset password lewat email belum tersedia. Masuk dengan password akun Anda, atau daftar email baru.</div>
          ) : (
            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy}>{busy ? 'Memproses…' : tab === 'login' ? 'Masuk' : tab === 'register' ? 'Daftar' : 'Kirim Link Reset'}</button>
          )}
        </form>
        {tab === 'login' && <p className="text-[11.5px] text-center" style={{ color: 'var(--text-tertiary)' }}>Proyek di akun ini terpisah dari pengguna lain. File .intero tetap bisa dibuka tanpa masuk.</p>}
        <p className="text-center text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
          {tab === 'login' ? <>Belum punya akun? <button type="button" className="font-semibold" style={{ color: 'var(--brand-primary)' }} onClick={() => setTab('register')}>Daftar sekarang</button></> : <>Sudah punya akun? <button type="button" className="font-semibold" style={{ color: 'var(--brand-primary)' }} onClick={() => setTab('login')}>Masuk</button></>}
        </p>
      </div>
    </Modal>
  );
}
