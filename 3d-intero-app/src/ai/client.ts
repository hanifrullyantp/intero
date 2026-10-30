import type { AiGatewayResult } from './gateway';
import { applyCommand } from '../projectdoc/apply';
import type { Command } from '../projectdoc/commands';
import { fromProjectData, toProjectData } from '../projectdoc/adapter';
import { isProjectDocV1Enabled } from '../projectdoc/flag';
import { flushDocHistory } from '../projectdoc/session';
import { useStore } from '../store';

export async function requestAiGateway(utterance: string): Promise<AiGatewayResult> {
  const s = useStore.getState();
  const doc = s.projectDoc ?? fromProjectData(s.toProjectData(), { snapGizmoCm: Math.max(0.1, s.snapSize / 10) });
  const res = await fetch('/api/3d/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ utterance, doc, selectedIds: s.selectedIds }),
  });
  const data = await res.json().catch(() => null) as (AiGatewayResult & { error?: string }) | null;
  if (!res.ok || !data || !Array.isArray(data.commands) || !data.preview) {
    throw new Error(data?.error || 'Gateway AI tidak menjawab.');
  }
  return data;
}

export function applyGatewayCommands(commands: Command[]): boolean {
  const s = useStore.getState();
  if (s.shareMode === 'view' || !commands.length) return false;
  s.pushHistory();
  const snapGizmoCm = Math.max(0.1, s.snapSize / 10);
  let doc = useStore.getState().projectDoc ?? fromProjectData(useStore.getState().toProjectData(), { snapGizmoCm });
  for (const command of commands) {
    const result = applyCommand(doc, command);
    if (result.violations.length) break;
    doc = result.doc;
  }
  const data = toProjectData(doc);
  const kept = s.selectedIds.filter((id) => data.cabinets.some((item) => item.id === id));
  useStore.setState({
    items: data.cabinets,
    walls: data.walls,
    settings: data.settings,
    projectName: data.projectName,
    dimensions: Array.isArray(data.dimensions) ? data.dimensions : [],
    dirty: true,
    selectedIds: kept,
    ...(isProjectDocV1Enabled() ? { projectDoc: doc } : {}),
  });
  if (isProjectDocV1Enabled()) flushDocHistory();
  return true;
}
