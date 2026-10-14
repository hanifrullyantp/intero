import type { ReactNode } from 'react';
import { useStore, type RightTab } from '../core/store';
import { Package, SlidersHorizontal, Wrench, DoorOpen, DoorClosed, Layers, TriangleAlert } from './icons';

function TogglePill({
  active,
  title,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: ReactNode;
  badge?: number;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors shrink-0 ${
        active ? 'text-white border-transparent' : 'border-[var(--border)]'
      }`}
      style={
        active
          ? { background: 'var(--brand)', color: '#fff' }
          : { background: 'var(--bg-panel)', color: 'var(--text-secondary)' }
      }
    >
      {children}
      {badge != null && badge > 0 ? (
        <span
          className="min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold grid place-items-center"
          style={{ background: 'var(--error)', color: '#fff' }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function PanelToggleBar() {
  const ui = useStore((s) => s.ui);
  const issues = useStore((s) => s.issues);
  const uiMode = useStore((s) => s.ui.uiMode);
  const { setUI, setDoorsOpen } = useStore.getState();

  const rightActive = (tab: RightTab) => ui.rightOpen && ui.rightTab === tab;
  const openRight = (tab: RightTab) => {
    if (rightActive(tab)) setUI({ rightOpen: false });
    else setUI({ rightOpen: true, rightTab: tab, materialStudioOpen: tab === 'mat' });
  };

  const issueCount = issues.length;

  return (
    <div
      className="desktop-only h-10 flex items-center gap-2 px-3 border-b shrink-0 overflow-x-auto select-none"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      <TogglePill
        active={ui.leftOpen}
        title="Components library (Shift+C)"
        onClick={() => setUI({ leftOpen: !ui.leftOpen })}
      >
        <Package size={14} /> Components
      </TogglePill>
      <TogglePill active={rightActive('props')} title="Properties panel" onClick={() => openRight('props')}>
        <SlidersHorizontal size={14} /> Props
      </TogglePill>
      <TogglePill
        active={ui.toolsOpen}
        title="Editing tools rail"
        onClick={() => setUI({ toolsOpen: !ui.toolsOpen })}
      >
        <Wrench size={14} /> Tools
      </TogglePill>
      <TogglePill
        active={ui.doorsOpen}
        title={ui.doorsOpen ? 'Close all doors & drawers' : 'Open all doors & drawers'}
        onClick={() => setDoorsOpen(!ui.doorsOpen)}
      >
        {ui.doorsOpen ? <DoorClosed size={14} /> : <DoorOpen size={14} />}
        {ui.doorsOpen ? 'Close all' : 'Open all'}
      </TogglePill>
      {uiMode === 'advanced' && (
        <TogglePill active={rightActive('layers')} title="Layers" onClick={() => openRight('layers')}>
          <Layers size={14} /> Layers
        </TogglePill>
      )}
      <TogglePill
        active={rightActive('issues')}
        title="Design validation"
        badge={issueCount}
        onClick={() => openRight('issues')}
      >
        <TriangleAlert size={14} /> Issues
      </TogglePill>
    </div>
  );
}
