import { useEffect, useRef, useState } from 'react';
import { Bot, Check, RotateCcw, Send, Sparkles, Wand2, X } from 'lucide-react';
import { applyGatewayCommands } from '../../ai/client';
import { executeAiWithLlmFallback } from '../../engine/ai-assistant';
import type { Command } from '../../projectdoc/commands';
import { canUndo } from '../../projectdoc/session';
import { useStore } from '../../store';
import { toast } from '../ui';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actions?: string[];
  tier?: string;
  lines?: string[];
  violations?: string[];
  commands?: Command[];
}

const QUICK_PROMPTS = [
  { label: 'Pasang Cornice / Topi Semua', prompt: 'Aktifkan cornice / topi pada semua kabinet atas, kulkas, dan hood' },
  { label: 'Atas Putih · Bawah Oak', prompt: 'Ubah warna kabinet atas jadi putih dan kabinet bawah jadi kayu muda oak' },
  { label: 'Tinggi Plafon 260 cm', prompt: 'Ubah tinggi total kabinet menjadi 260 cm' },
  { label: 'Handle Gola + LED On', prompt: 'Ganti handle semua kabinet jadi Gola dan nyalakan semua lampu LED' },
  { label: 'Double Stack 2 Tingkat', prompt: 'Buat kabinet atas menjadi double stack 2 tingkat' },
  { label: 'Top Table Marmer Putih', prompt: 'Ganti countertop jadi marmer putih carrara' },
];

export function AiAssistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Halo! Saya Asisten AI Desain 3D Intero. Perintah yang sudah dikenal (warna, tinggi, cornice, handle, LED) langsung mengubah model. Perintah lain menampilkan pratinjau; tekan Terapkan untuk memasukkannya ke desain.',
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  if (!open) return null;

  const sendPrompt = async (promptText: string) => {
    const q = promptText.trim();
    if (!q || busy) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBusy(true);
    try {
      const res = await executeAiWithLlmFallback(q);
      const botMsg: ChatMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: res.reply,
        actions: res.actionsTaken,
        tier: res.gateway?.tier,
        lines: res.gateway?.preview.lines,
        violations: res.gateway?.preview.violations,
        commands: res.gateway?.commands,
      };
      setMessages((prev) => [...prev, botMsg]);
      if (res.changed) {
        toast(`AI: ${res.actionsTaken[0]}`, 'success');
      }
    } finally {
      setBusy(false);
    }
  };

  const applyPreview = (msg: ChatMsg) => {
    if (!msg.commands?.length || s.shareMode === 'view' || applied.includes(msg.id)) return;
    if (!applyGatewayCommands(msg.commands)) return;
    setApplied((prev) => [...prev, msg.id]);
    toast('Pratinjau AI diterapkan', 'success');
  };

  return (
    <div
      className="fixed z-50 flex flex-col rounded-2xl overflow-hidden theme-transition"
      style={{
        right: 16,
        bottom: 44,
        width: 'min(390px, calc(100vw - 24px))',
        height: 'min(540px, calc(100vh - 110px))',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 shrink-0"
        style={{ background: 'var(--brand-primary-soft)', borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--brand-primary)', color: '#fff' }}
        >
          <Sparkles size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
            AI Design Assistant
            <span className="badge badge-ok" style={{ fontSize: 9.5, padding: '1px 6px' }}>LIVE</span>
          </div>
          <div className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
            Edit desain 3D & material lewat perintah chat
          </div>
        </div>
        {canUndo(s) && (
          <button
            type="button"
            className="icon-btn"
            style={{ width: 28, height: 28 }}
            data-tip="Undo perubahan terakhir"
            onClick={() => { s.undo(); toast('Undo perubahan terakhir', 'info'); }}
          >
            <RotateCcw size={14} />
          </button>
        )}
        <button type="button" className="icon-btn" style={{ width: 28, height: 28 }} onClick={onClose} aria-label="Tutup AI">
          <X size={16} />
        </button>
      </div>

      {/* Quick Chips */}
      <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0" style={{ borderBottom: '1px solid var(--border)', scrollbarWidth: 'none' }}>
        <Wand2 size={13} className="shrink-0" style={{ color: 'var(--brand-primary)' }} />
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.label}
            type="button"
            className="badge shrink-0 hover:opacity-85 transition-opacity"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 11, padding: '3px 8px' }}
            onClick={() => void sendPrompt(qp.prompt)}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 text-[12.5px]">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className="rounded-2xl px-3.5 py-2.5 max-w-[90%] whitespace-pre-line leading-relaxed"
              style={
                m.role === 'user'
                  ? { background: 'var(--brand-primary)', color: '#fff', borderBottomRightRadius: 4 }
                  : { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderBottomLeftRadius: 4 }
              }
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10.5px] font-bold opacity-75">
                {m.role === 'assistant' ? <><Bot size={12} /> 3D Intero AI</> : 'Anda'}
              </div>
              <div>{m.text.replace(/\*\*(.*?)\*\*/g, '$1')}</div>
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 pt-2 flex flex-col gap-1" style={{ borderTop: '1px solid var(--border)' }}>
                  {m.actions.map((act, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--brand-primary)' }}>
                      <Check size={12} className="shrink-0" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              )}
              {!!m.commands?.length && (
                <div className="mt-2 pt-2 flex flex-col gap-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="text-[10.5px] font-bold" style={{ color: 'var(--text-secondary)' }}>Pratinjau {m.tier}</div>
                  {m.lines?.map((line) => (
                    <div key={line} className="text-[11px]">{line}</div>
                  ))}
                  {m.violations?.map((line) => (
                    <div key={line} className="text-[11px]" style={{ color: 'var(--danger, #b42318)' }}>{line}</div>
                  ))}
                  {s.shareMode === 'view' ? (
                    <div className="text-[11px]">Mode lihat tidak menerapkan perubahan.</div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm self-start"
                      disabled={applied.includes(m.id)}
                      onClick={() => applyPreview(m)}
                    >
                      {applied.includes(m.id) ? 'Diterapkan' : 'Terapkan'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form
        className="p-2.5 flex items-center gap-2 shrink-0"
        style={{ background: 'var(--bg-panel)', borderTop: '1px solid var(--border)' }}
        onSubmit={(e) => {
          e.preventDefault();
          void sendPrompt(input);
        }}
      >
        <input
          className="input flex-1 text-[12.5px]"
          style={{ height: 36 }}
          placeholder="Ketik perintah desain (mis: pasang cornice semua)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn-primary btn-sm shrink-0"
          style={{ height: 36, padding: '0 12px' }}
          disabled={!input.trim() || busy}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
