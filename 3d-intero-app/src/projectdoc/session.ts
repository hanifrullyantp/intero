import type { Item, ProjectSettings, Wall } from '../types';
import { useStore } from '../store';
import { fromProjectData, toProjectData } from './adapter';
import { diffDoc } from './diff';
import { isProjectDocV1Enabled } from './flag';
import { pushLog, redoLog, undoLog, type CommandLog, type HistoryEntry } from './history';
import { isDocPreview } from './preview';
import type { ProjectDoc } from './schema';

let armed: { before: ProjectDoc } | null = null;

function liveDoc(): ProjectDoc {
  const s = useStore.getState();
  return fromProjectData(s.toProjectData(), {
    id: s.projectDoc?.meta.id,
    snapGizmoCm: Math.max(0.1, s.snapSize / 10),
  });
}

export function sameScene(a: ProjectDoc, b: ProjectDoc): boolean {
  const left = toProjectData(a);
  const right = toProjectData(b);
  const pack = (doc: ProjectDoc, data: ReturnType<typeof toProjectData>) => JSON.stringify({
    nama: data.projectName,
    cabinets: data.cabinets,
    walls: data.walls,
    settings: data.settings,
    dimensions: data.dimensions,
    customComponents: data.customComponents,
    bentuk: doc.room.bentuk,
    bukaan: doc.room.bukaan,
    snap: doc.globals.snapGizmoCm,
  });
  return pack(a, left) === pack(b, right);
}

function writeDoc(doc: ProjectDoc, log: CommandLog, pending: boolean) {
  const projected = toProjectData(doc);
  const s = useStore.getState();
  useStore.setState({
    projectDoc: doc,
    docPast: log.past,
    docFuture: log.future,
    docPending: pending,
    dirty: true,
    projectName: projected.projectName,
    createdAt: projected.createdAt,
    settings: projected.settings,
    walls: projected.walls,
    items: projected.cabinets,
    dimensions: Array.isArray(projected.dimensions) ? projected.dimensions : [],
    customComponents: projected.customComponents?.length ? projected.customComponents : s.customComponents,
    selectedIds: s.selectedIds.filter((id) => projected.cabinets.some((item) => item.id === id)),
  });
}

export function cancelDocArm() {
  armed = null;
}

export function flushDocHistory(): ProjectDoc | null {
  if (!isProjectDocV1Enabled()) return null;
  if (!armed) return useStore.getState().projectDoc;
  const before = armed.before;
  armed = null;
  const after = liveDoc();
  if (sameScene(before, after)) {
    useStore.setState({ docPending: false });
    return useStore.getState().projectDoc;
  }
  const diff = diffDoc(before, after);
  const s = useStore.getState();
  const past = pushLog({ past: s.docPast, future: s.docFuture }, { commands: diff.commands, before, after }).past;
  writeDoc(after, { past, future: [] }, false);
  return after;
}

export function armDocHistory() {
  if (!isProjectDocV1Enabled()) return;
  flushDocHistory();
  const s = useStore.getState();
  const before = s.projectDoc ?? liveDoc();
  armed = { before };
  useStore.setState({
    docPending: true,
    dirty: true,
    projectDoc: s.projectDoc ?? before,
    docFuture: [],
  });
}

export function undoDocHistory() {
  if (!isProjectDocV1Enabled()) return;
  flushDocHistory();
  const s = useStore.getState();
  const result = undoLog({ past: s.docPast, future: s.docFuture });
  if (!result) return;
  writeDoc(result.doc, result.log, false);
}

export function redoDocHistory() {
  if (!isProjectDocV1Enabled()) return;
  flushDocHistory();
  const s = useStore.getState();
  const result = redoLog({ past: s.docPast, future: s.docFuture });
  if (!result) return;
  writeDoc(result.doc, result.log, false);
}

export function docForAutosave(): { doc: ProjectDoc; past: HistoryEntry[]; future: HistoryEntry[] } | null {
  if (!isProjectDocV1Enabled()) return null;
  flushDocHistory();
  const s = useStore.getState();
  return { doc: s.projectDoc ?? liveDoc(), past: s.docPast, future: s.docFuture };
}

export function sceneSource(s: { items: Item[]; walls: Wall[]; settings: ProjectSettings; projectDoc: ProjectDoc | null; docPending: boolean }) {
  if (isProjectDocV1Enabled() && s.projectDoc && !s.docPending && !isDocPreview()) {
    const data = toProjectData(s.projectDoc);
    return { items: data.cabinets, walls: data.walls, settings: data.settings };
  }
  return { items: s.items, walls: s.walls, settings: s.settings };
}

export function canUndo(s: { past: { length: number }; docPast: { length: number }; docPending: boolean }): boolean {
  return isProjectDocV1Enabled() ? s.docPast.length > 0 || s.docPending : s.past.length > 0;
}

export function canRedo(s: { future: { length: number }; docFuture: { length: number } }): boolean {
  return isProjectDocV1Enabled() ? s.docFuture.length > 0 : s.future.length > 0;
}
