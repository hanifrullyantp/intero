import { useEffect, useState } from 'react';
import { Check, Copy, Link2, Radio, UsersRound, X } from 'lucide-react';
import { Field, Modal, toast } from '../ui';
import { teamSession, type TeamState } from '../../lib/team-session';

type Role = 'host' | 'guest';

async function copyText(value: string) {
  try { await navigator.clipboard.writeText(value); }
  catch {
    const el = document.createElement('textarea'); el.value = value; document.body.appendChild(el); el.select();
    document.execCommand('copy'); el.remove();
  }
  toast('Kode kolaborasi disalin', 'success');
}

export function TeamCollaborationDialog({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<TeamState>(teamSession.state);
  const [role, setRole] = useState<Role>('host');
  const [invite, setInvite] = useState('');
  const [answer, setAnswer] = useState('');
  const [returnedAnswer, setReturnedAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => teamSession.subscribe(setState), []);

  const createInvite = async () => {
    setBusy(true);
    try { setInvite(await teamSession.createInvite()); setAnswer(''); }
    catch (e) { toast((e as Error).message, 'error'); }
    finally { setBusy(false); }
  };
  const acceptAnswer = async () => {
    setBusy(true);
    try { await teamSession.acceptAnswer(answer); toast('Kode jawaban diterima. Menghubungkan...', 'info'); }
    catch (e) { toast((e as Error).message, 'error'); }
    finally { setBusy(false); }
  };
  const joinInvite = async () => {
    setBusy(true);
    try { setReturnedAnswer(await teamSession.joinInvite(invite)); }
    catch (e) { toast((e as Error).message, 'error'); }
    finally { setBusy(false); }
  };
  const disconnect = () => { teamSession.close(); setInvite(''); setAnswer(''); setReturnedAnswer(''); };
  const connected = state.status === 'connected';

  return (
    <Modal onClose={onClose} width={620}>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' }}><UsersRound size={20} /></span>
          <div className="flex-1 min-w-0"><h3 className="text-[17px] font-bold">Kolaborasi Tim</h3><p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>Sinkronkan proyek langsung antar perangkat tanpa backend atau server 3D Intero.</p></div>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: connected ? 'var(--brand-primary-soft)' : 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <Radio size={15} style={{ color: connected ? 'var(--brand-primary)' : 'var(--text-tertiary)' }} />
          <span className="flex-1 text-[12px]">{state.message}</span>
          {connected && <button className="btn btn-secondary btn-sm" onClick={disconnect}>Putuskan</button>}
        </div>

        {!connected && (
          <>
            <div className="seg w-full">
              <button className={`flex-1 ${role === 'host' ? 'active' : ''}`} onClick={() => setRole('host')}>Saya mengundang</button>
              <button className={`flex-1 ${role === 'guest' ? 'active' : ''}`} onClick={() => setRole('guest')}>Saya bergabung</button>
            </div>

            {role === 'host' ? (
              <div className="flex flex-col gap-3">
                {!invite ? <button className="btn btn-primary w-full" onClick={createInvite} disabled={busy}><Link2 size={15} />{busy ? 'Membuat kode...' : 'Buat kode undangan'}</button> : (
                  <>
                    <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <Field label="Kode undangan — kirim ke anggota tim"><textarea className="input mono" style={{ height: 82, resize: 'vertical', fontSize: 10 }} readOnly value={invite} onFocus={(e) => e.target.select()} /></Field>
                      <button className="btn btn-secondary btn-sm self-start" onClick={() => copyText(invite)}><Copy size={13} />Salin undangan</button>
                    </div>
                    <Field label="Tempel kode jawaban dari anggota tim"><textarea className="input mono" style={{ height: 68, resize: 'vertical', fontSize: 10 }} placeholder="3DINTERO-P2P:..." value={answer} onChange={(e) => setAnswer(e.target.value)} /></Field>
                    <button className="btn btn-primary" disabled={!answer.trim() || busy} onClick={acceptAnswer}>Hubungkan anggota tim</button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Field label="Tempel kode undangan dari pemilik proyek"><textarea className="input mono" style={{ height: 82, resize: 'vertical', fontSize: 10 }} placeholder="3DINTERO-P2P:..." value={invite} onChange={(e) => setInvite(e.target.value)} /></Field>
                <button className="btn btn-primary" disabled={!invite.trim() || busy} onClick={joinInvite}>{busy ? 'Menyiapkan jawaban...' : 'Buat kode jawaban'}</button>
                {returnedAnswer && <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <Field label="Kirim kode jawaban ini kembali ke pemilik proyek"><textarea className="input mono" style={{ height: 82, resize: 'vertical', fontSize: 10 }} readOnly value={returnedAnswer} onFocus={(e) => e.target.select()} /></Field>
                  <button className="btn btn-secondary btn-sm self-start" onClick={() => copyText(returnedAnswer)}><Copy size={13} />Salin jawaban</button>
                </div>}
              </div>
            )}
          </>
        )}

        {connected && <div className="rounded-xl p-3 text-[12px]" style={{ background: 'var(--brand-primary-soft)', color: 'var(--text-secondary)' }}><Check size={14} className="inline mr-1" />Perubahan kabinet, dimensi, material, ruangan, dan pengaturan proyek dikirim antar peserta secara langsung. Satu peserta membuat undangan; peserta lain bergabung dengan kode.</div>}
        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Koneksi peer-to-peer memakai WebRTC tanpa STUN/TURN, database, atau signaling server. Perlu jaringan yang mengizinkan koneksi langsung antar perangkat (biasanya Wi-Fi/LAN yang sama). Jika jaringan memblokir koneksi langsung, gunakan tautan/file .intero.</p>
        <div className="flex justify-end"><button className="btn btn-secondary" onClick={onClose}>Tutup</button></div>
      </div>
    </Modal>
  );
}