import { useStore, persist } from '../core/store';
import { saveProjectFile } from '../core/projectManager';
import InteroLogo from './InteroLogo';
import { FilePlus2, Save } from './icons';

export default function MobileHeader() {
  const project = useStore((s) => s.project);
  const setUI = useStore((s) => s.setUI);
  const toast = useStore.getState().toast;

  const doSave = () => {
    saveProjectFile(project);
    persist(project);
    useStore.setState({ dirty: false });
    toast({ severity: 'success', message: 'Project saved', ttl: 2000 });
  };

  return (
    <div className="mobile-only h-12 flex items-center gap-2 px-2 border-b shrink-0" style={{ background: 'var(--bg-main)', borderColor: 'var(--border)' }}>
      <InteroLogo size={28} className="rounded-md shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold truncate">Instant 3D</div>
        <div className="text-[10px] truncate opacity-70">{project.name}.i3d</div>
      </div>
      <button type="button" className="tb-btn" title="Save" onClick={doSave}><Save size={16} /></button>
      <button
        type="button"
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white shrink-0"
        style={{ background: 'var(--brand)' }}
        onClick={() => setUI({ modal: 'magic' })}
      >
        <FilePlus2 size={14} /> New
      </button>
    </div>
  );
}
