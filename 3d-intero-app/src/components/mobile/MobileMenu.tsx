import { useState } from 'react';
import { Camera, Download, FilePlus2, FolderOpen, Glasses, Hammer, HelpCircle, Image as ImageIcon, Keyboard, LogOut, Save, Share2, Smartphone, Tag, UsersRound, Wand2 } from 'lucide-react';
import { clearSession, getSession } from '../../lib/account';
import { timeAgo } from '../../lib/utils';
import { setMobileUxV2Enabled } from '../../lib/mobile-ux-flag';
import { useStore } from '../../store';
import { fileActions } from '../editor/file-actions';
import { launchVR } from '../xr/launch';
import { useXRCaps } from '../../xr/xr-manager';

export function MobileMenuHeader({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const session = getSession();
  const readOnly = s.shareMode === 'view';
  const status = s.dirty ? 'Belum tersimpan' : s.lastSavedAt ? `Tersimpan ${session ? 'di akun' : 'di perangkat'} ${timeAgo(s.lastSavedAt)}` : session ? 'Masuk, belum tersimpan' : 'Belum masuk akun';
  const rename = () => {
    if (readOnly) return;
    const name = window.prompt('Nama proyek:', s.projectName);
    if (name?.trim()) s.setProjectName(name.trim());
  };
  return (
    <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-start gap-2">
        <button type="button" className="flex-1 text-left" onClick={rename} disabled={readOnly}>
          <div className="font-bold text-[16px] truncate" style={{ fontFamily: 'var(--font-heading)' }}>{s.projectName}</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{status}</div>
        </button>
        <button type="button" className="mv2-hit" aria-label="Tutup" onClick={onClose}>Tutup</button>
      </div>
      <div className="text-[12px] mt-2" style={{ color: 'var(--text-secondary)' }}>{session ? session.user.name : 'Tamu'}</div>
      {session && <button type="button" className="m-ditem" style={{ paddingLeft: 0 }} onClick={() => { clearSession(); window.dispatchEvent(new Event('intero:logout')); }}><LogOut size={17} /><span>Keluar</span></button>}
    </div>
  );
}

export function MobileMenuBody({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const caps = useXRCaps();
  const readOnly = s.shareMode === 'view';
  const [room, setRoom] = useState(false);
  const go = (fn: () => void) => () => { onClose(); fn(); };
  return (<>
    <p className="mv2-sec">Proyek</p>
    <Item label="Baru" icon={<FilePlus2 size={17} />} disabled={readOnly} onClick={go(() => fileActions.newProject())} />
    <Item label="Buka" icon={<FolderOpen size={17} />} disabled={readOnly} onClick={go(() => fileActions.browse())} />
    <Item label="Simpan" icon={<Save size={17} />} disabled={readOnly} onClick={go(() => fileActions.save())} />
    <Item label="Simpan sebagai" icon={<Save size={17} />} disabled={readOnly} onClick={go(() => fileActions.save(true))} />
    <p className="mv2-sec">Ekspor dan bagikan</p>
    <Item label="Gambar" icon={<ImageIcon size={17} />} onClick={go(() => fileActions.export('png'))} />
    <Item label="Ekspor OBJ (bisa dibuka di SketchUp)" icon={<Download size={17} />} onClick={go(() => fileActions.export('obj'))} />
    <Item label="HPP PDF/Excel" icon={<Download size={17} />} onClick={go(() => s.setAppMode('production'))} />
    <Item label="Tautan" icon={<Share2 size={17} />} onClick={go(() => window.dispatchEvent(new Event('intero:openShare')))} />
    <Item label="QR AR" icon={<Smartphone size={17} />} onClick={go(() => s.ui({ showAr: true }))} />
    <Item label="File proyek (.intero)" icon={<Download size={17} />} onClick={go(() => fileActions.download())} />
    <Item label="Lihat di ruangan" icon={<Camera size={17} />} onClick={() => setRoom((v) => !v)} />
    {room && (<>
      <Item label="Pratinjau AR" icon={<Smartphone size={17} />} onClick={go(() => s.ui({ showAr: true }))} />
      <Item label="Foto ruangan" icon={<Camera size={17} />} onClick={go(() => s.ui({ showPhoto: true }))} />
      <Item label="Mode VR" icon={<Glasses size={17} />} disabled={!caps.vr} onClick={go(() => void launchVR())} />
    </>)}
    <p className="mv2-sec">Alat lanjutan</p>
    <Item label="Magic Layout Wizard" icon={<Wand2 size={17} />} disabled={readOnly} onClick={go(() => s.ui({ showWizard: true }))} />
    <Item label="Component Builder" icon={<Hammer size={17} />} disabled={readOnly} onClick={go(() => s.ui({ showBuilder: true }))} />
    <Item label="Daftar harga" icon={<Tag size={17} />} onClick={go(() => s.ui({ showPriceList: true }))} />
    <Item label="Kolaborasi" icon={<UsersRound size={17} />} onClick={go(() => window.dispatchEvent(new Event('intero:openTeam')))} />
    <p className="mv2-sec">Bantuan</p>
    <Item label="Pintasan" icon={<Keyboard size={17} />} onClick={go(() => s.ui({ showShortcuts: true }))} />
    <Item label="Tutorial" icon={<HelpCircle size={17} />} onClick={go(() => s.ui({ showAbout: true }))} />
    <Item label="Tentang" icon={<HelpCircle size={17} />} onClick={go(() => s.ui({ showAbout: true }))} />
    <Item label="Kembali ke tampilan lama" icon={<Smartphone size={17} />} onClick={go(() => { setMobileUxV2Enabled(false); window.location.reload(); })} />
  </>);
}

function Item({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="m-ditem" disabled={disabled} onClick={onClick} style={{ opacity: disabled ? 0.4 : 1 }}>{icon}<span className="flex-1 text-left">{label}</span></button>;
}
