import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../../store';
import { toast } from '../ui';

type Extra = 'tampilan' | 'global' | 'ukur' | 'lainnya';

export function ExtraPanel({ panel, onClose }: { panel: Extra; onClose: () => void }) {
  return (
    <section className="mv2-tool" data-mv2={panel} aria-label={label(panel)}>
      <div className="mv2-tool-head"><b>{label(panel)}</b><button type="button" className="mv2-hit" aria-label="Tutup" onClick={onClose}><X size={20} /></button></div>
      {panel === 'tampilan' && <Look onClose={onClose} />}
      {panel === 'global' && <Global onClose={onClose} />}
      {panel === 'ukur' && <Measure onClose={onClose} />}
      {panel === 'lainnya' && <More onClose={onClose} />}
    </section>
  );
}

function label(panel: Extra) {
  if (panel === 'tampilan') return 'Tampilan';
  if (panel === 'global') return 'Global';
  if (panel === 'ukur') return 'Ukur';
  return 'Lainnya';
}

function Row({ title, on, onClick, disabled, hint }: { title: string; on?: boolean; onClick: () => void; disabled?: boolean; hint?: string }) {
  return (
    <button type="button" className="mv2-row" disabled={disabled} onClick={onClick}>
      <span>{title}</span>
      {hint && <small>{hint}</small>}
      {on !== undefined && <b>{on ? 'Nyala' : 'Mati'}</b>}
    </button>
  );
}

function Look({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const people = (v: boolean) => {
    try { localStorage.setItem('intero_mobile_people_set', '1'); } catch { /* ignore */ }
    s.setShowPeople(v);
  };
  return (<>
    <Row title="Lampu LED" on={s.lightsOn} onClick={() => s.toggleLights()} />
    <Row title="Orang beranimasi" on={s.showPeople} onClick={() => people(!s.showPeople)} />
    <Row title="Tema gelap" on={s.theme === 'dark'} onClick={() => s.setTheme(s.theme === 'dark' ? 'light' : 'dark')} />
    <Row title="Grid" on={s.showGrid} onClick={() => s.ui({ showGrid: !s.showGrid })} />
    <Row title="Bayangan" on={s.showShadows} onClick={() => s.ui({ showShadows: !s.showShadows })} />
    <div className="mv2-apply"><button type="button" onClick={onClose}>Tutup</button></div>
  </>);
}

function Global({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const [cm, setCm] = useState(Math.round(s.settings.globalCabinetHeight / 10));
  const readOnly = s.shareMode === 'view';
  const apply = () => {
    if (readOnly) return;
    s.setGlobalHeight(Math.max(180, Math.min(320, cm)) * 10);
    onClose();
  };
  return (<>
    <div className="mv2-step">
      <span>Tinggi</span>
      <button type="button" aria-label="Kurangi tinggi" onClick={() => setCm((n) => Math.max(180, n - 1))}>−</button>
      <input inputMode="numeric" aria-label="Tinggi total" value={cm} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) setCm(n); }} />
      <span className="unit">cm</span>
      <button type="button" aria-label="Tambah tinggi" onClick={() => setCm((n) => Math.min(320, n + 1))}>+</button>
    </div>
    <p className="mv2-note">Satuan tampilan</p>
    <div className="mv2-apply">
      <button type="button" className={s.dimUnit === 'cm' ? 'primary' : ''} onClick={() => s.setDim({ dimUnit: 'cm' })}>cm</button>
      <button type="button" className={s.dimUnit === 'mm' ? 'primary' : ''} onClick={() => s.setDim({ dimUnit: 'mm' })}>mm</button>
    </div>
    <div className="mv2-apply">
      <button type="button" onClick={onClose}>Batal</button>
      <button type="button" className="primary" disabled={readOnly} onClick={apply}>Terapkan</button>
    </div>
  </>);
}

function Measure({ onClose }: { onClose: () => void }) {
  const s = useStore();
  return (<>
    <Row title="Tampilkan dimensi" on={s.showDimensions} onClick={() => s.setDim({ showDimensions: !s.showDimensions })} />
    <Row title="Ukur jarak" hint="Ketuk dua titik" onClick={() => { s.setTool('tape'); onClose(); toast('Ketuk dua titik di kanvas.', 'info'); }} />
  </>);
}

function More({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const readOnly = s.shareMode === 'view';
  const has = s.selectedIds.length > 0;
  const need = (ok: boolean, text: string, fn: () => void) => () => {
    if (!ok) { toast(text, 'info'); return; }
    fn();
    onClose();
  };
  return (<>
    <Row title={s.openIds.length ? 'Tutup pintu' : 'Buka pintu'} disabled={!has} hint={has ? undefined : 'Pilih objek dulu'} onClick={need(has && !readOnly, 'Pilih objek dulu.', () => s.toggleOpenMode())} />
    <Row title="Salin" disabled={!has || readOnly} hint={has ? undefined : 'Pilih objek dulu'} onClick={need(has && !readOnly, 'Pilih objek dulu.', () => s.copy())} />
    <Row title="Tempel" disabled={readOnly || !s.clipboard.length} hint={s.clipboard.length ? undefined : 'Belum ada salinan'} onClick={need(!readOnly && s.clipboard.length > 0, 'Belum ada salinan.', () => s.paste())} />
    <Row title="Cermin" disabled={!has || readOnly} hint={has ? undefined : 'Pilih objek dulu'} onClick={need(has && !readOnly, 'Pilih objek dulu.', () => s.ui({ dialog: { kind: 'mirror' } }))} />
    <Row title="Deret" disabled={!has || readOnly} hint={has ? undefined : 'Pilih objek dulu'} onClick={need(has && !readOnly, 'Pilih objek dulu.', () => s.ui({ dialog: { kind: 'array' } }))} />
    <Row title="Sejajarkan kiri" disabled={s.selectedIds.length < 2 || readOnly} hint={s.selectedIds.length < 2 ? 'Pilih dua objek' : undefined} onClick={need(s.selectedIds.length > 1 && !readOnly, 'Pilih dua objek.', () => s.alignItems(s.selectedIds, 'left'))} />
  </>);
}
