import { useStore } from '../core/store';
import { Hand, Orbit, ZoomIn } from './icons';

const VIEW_TOOLS = [
  { id: 'orbit' as const, icon: Orbit, label: 'Orbit', kbd: 'O' },
  { id: 'pan' as const, icon: Hand, label: 'Pan (hand)', kbd: 'H' },
  { id: 'zoom' as const, icon: ZoomIn, label: 'Zoom', kbd: 'Z' },
];

export default function ViewToolsToolbar({ compact }: { compact?: boolean }) {
  const tool = useStore((s) => s.ui.tool);
  const setUI = useStore((s) => s.setUI);

  return (
    <div className={`flex ${compact ? 'flex-row gap-1 p-1' : 'flex-col gap-0.5 p-1'}`}>
      {VIEW_TOOLS.map((t) => {
        const Icon = t.icon;
        const active = tool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            title={`${t.label} (${t.kbd})`}
            className={`tb-btn ${active ? 'active' : ''} ${compact ? 'h-9! min-w-9!' : 'w-9 h-9!'}`}
            onClick={() => setUI({ tool: t.id, viewMode: useStore.getState().ui.viewMode === '2d' ? '3d' : useStore.getState().ui.viewMode })}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
