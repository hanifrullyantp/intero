import { useState } from 'react';

const ROLES = ['Designer', 'Workshop / Maker', 'Business', 'Personal'];
const TYPES = ['Kitchen set', 'Wardrobe', 'TV cabinet', 'Other'];
const LEVELS = ['Baru mulai', 'Pernah pakai SketchUp', 'Profesional'];

export default function OnboardingWizard({ name, onDone }: { name: string; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState(ROLES[0]);
  const [ptype, setPtype] = useState(TYPES[0]);
  const [level, setLevel] = useState(LEVELS[0]);
  const [wsName, setWsName] = useState(`${name.split(' ')[0] || 'My'} Workspace`);

  const finish = () => {
    try {
      localStorage.setItem('instant3d_onboarding_prefs', JSON.stringify({ role, ptype, level, wsName, at: Date.now() }));
    } catch { /* ignore */ }
    onDone();
  };

  return (
    <div className="saas-onboard-overlay" role="dialog" aria-modal="true">
      <div className="saas-onboard-modal anim-in">
        <div className="text-xs font-semibold text-[#1b9d6b] mb-1">Langkah {step + 1} dari 4</div>
        <h2 className="text-xl font-bold mb-4 text-[#111827]">
          {step === 0 && 'Apa peran Anda?'}
          {step === 1 && 'Proyek apa yang paling sering?'}
          {step === 2 && 'Level pengalaman 3D?'}
          {step === 3 && 'Nama workspace'}
        </h2>
        <div className="space-y-2 mb-6 max-h-[40vh] overflow-y-auto">
          {step === 0 && ROLES.map((r) => (
            <button key={r} type="button" className={`w-full text-left px-4 py-3 rounded-xl border text-sm ${role === r ? 'border-[#1b9d6b] bg-[#e8f5ef]' : 'border-[#e5e7eb]'}`} onClick={() => setRole(r)}>{r}</button>
          ))}
          {step === 1 && TYPES.map((t) => (
            <button key={t} type="button" className={`w-full text-left px-4 py-3 rounded-xl border text-sm ${ptype === t ? 'border-[#1b9d6b] bg-[#e8f5ef]' : 'border-[#e5e7eb]'}`} onClick={() => setPtype(t)}>{t}</button>
          ))}
          {step === 2 && LEVELS.map((l) => (
            <button key={l} type="button" className={`w-full text-left px-4 py-3 rounded-xl border text-sm ${level === l ? 'border-[#1b9d6b] bg-[#e8f5ef]' : 'border-[#e5e7eb]'}`} onClick={() => setLevel(l)}>{l}</button>
          ))}
          {step === 3 && (
            <input className="saas-input" value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="Workspace name" />
          )}
        </div>
        <div className="flex gap-2">
          {step > 0 && (
            <button type="button" className="btn flex-1 py-2.5!" onClick={() => setStep((s) => s - 1)}>Kembali</button>
          )}
          <button
            type="button"
            className="saas-btn-primary flex-1"
            onClick={() => (step < 3 ? setStep((s) => s + 1) : finish())}
          >
            {step < 3 ? 'Lanjut' : 'Buat proyek pertama →'}
          </button>
        </div>
      </div>
    </div>
  );
}
