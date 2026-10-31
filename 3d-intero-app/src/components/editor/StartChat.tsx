import { useState } from 'react';
import { Mic, Send, Wand2, X } from 'lucide-react';
import { briefToWizardInput, DEFAULT_ROOM_BRIEF, describeRoomBrief, parseRoomBrief, type RoomBrief } from '../../ai/room-brief';
import { startIndonesianSpeech, type SpeechHost } from '../../ai/speech';
import { commitGeneratedLayout } from '../../engine/commit-layout';
import { toast } from '../ui';

export function StartChat({ onClose, onWizard }: { onClose: () => void; onWizard: () => void }) {
  const [brief, setBrief] = useState<RoomBrief>(DEFAULT_ROOM_BRIEF);
  const [text, setText] = useState('');
  const [lines, setLines] = useState<string[]>(['Ceritakan dapur yang diinginkan. Contoh: dapur L 360 cm dan 240 cm, ada kulkas dan island.']);

  const hear = (utterance: string) => {
    const next = parseRoomBrief(utterance, brief);
    setBrief(next);
    setLines((prev) => [...prev, utterance, describeRoomBrief(next)]);
    setText('');
  };

  const listen = () => {
    startIndonesianSpeech(window as unknown as SpeechHost, {
      onText: hear,
      onUnsupported: () => toast('Browser ini tidak mendukung mikrofon. Ketik ukuran dapurnya.', 'info'),
      onError: () => toast('Mikrofon tidak dapat dipakai.', 'info'),
    });
  };

  const build = () => {
    const count = commitGeneratedLayout(briefToWizardInput(brief), brief.ceilingCm);
    toast(`Layout dapur ${brief.shape} dibuat: ${count} komponen`, 'success');
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal glass flex flex-col" style={{ width: 'min(440px, calc(100vw - 24px))', maxHeight: 'min(560px, calc(100vh - 48px))' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <Wand2 size={16} />
          <div className="flex-1 font-bold text-[14px]">Mulai dari cerita</div>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 text-[13px]">
          {lines.map((line, index) => (
            <div key={`${index}-${line.slice(0, 12)}`} className="rounded-xl px-3 py-2" style={{ background: index % 2 === 0 ? 'var(--bg-secondary)' : 'var(--brand-primary-soft)' }}>{line}</div>
          ))}
        </div>
        <form className="px-3 py-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--border)' }} onSubmit={(e) => { e.preventDefault(); if (text.trim()) hear(text.trim()); }}>
          <button type="button" className="icon-btn" aria-label="Bicara" onClick={listen}><Mic size={16} /></button>
          <input className="input flex-1" style={{ height: 36 }} placeholder="dapur L 3 m dan 2,4 m" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm" aria-label="Kirim" disabled={!text.trim()}><Send size={14} /></button>
        </form>
        <div className="px-3 pb-3 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onWizard}>Wizard lengkap</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={build}>Buat layout</button>
        </div>
      </div>
    </div>
  );
}
