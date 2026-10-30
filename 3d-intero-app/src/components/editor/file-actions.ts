import { clearActiveProject, getActiveProject, getSession, setActiveProject } from '../../lib/account';
import { saveCloudProject } from '../../lib/cloud-projects';
import { exportImage, exportObj, exportSketchUpFallback, openInteroFile, saveInteroFile, saveLocalProject } from '../../lib/persistence';
import { forgetShareUrl } from '../../lib/share-link';
import { useStore } from '../../store';
import type { ProjectData } from '../../types';
import { toast } from '../ui';
import { sceneRef } from './Viewport';

export function applyOpenedProject(data: ProjectData, active: { cloudId: string | null; localId: string | null }) {
  const st = useStore.getState();
  st.loadProject(data);
  st.ui({ shareMode: null, resetViewRequest: st.resetViewRequest + 1 });
  setActiveProject(active);
  forgetShareUrl();
  st.markSaved();
}

async function persist(as: boolean) {
  const s = useStore.getState();
  if (s.shareMode === 'view') { toast('Mode lihat saja. Unduh file .intero jika ingin salinan.', 'warning'); return; }
  let name = s.projectName;
  const prev = getActiveProject();
  if (as) {
    const n = window.prompt('Nama proyek:', s.projectName);
    if (!n?.trim()) return;
    name = n.trim();
    s.setProjectName(name);
  }
  const data = useStore.getState().toProjectData();
  const localId = await saveLocalProject(as ? null : prev.localId, data);
  setActiveProject({ localId, cloudId: as ? null : prev.cloudId });
  const session = getSession();
  if (!session) {
    s.markSaved();
    toast(`"${name}" tersimpan di perangkat ini. Masuk agar ikut tersimpan di akun.`, 'info');
    return;
  }
  try {
    const row = await saveCloudProject({ id: as ? null : prev.cloudId, name, project: data });
    setActiveProject({ cloudId: row.id, localId });
    useStore.getState().markSaved();
    toast(`"${name}" tersimpan di akun dan di perangkat ini`, 'success');
  } catch (e) {
    useStore.getState().markSaved();
    toast(`Tersimpan di perangkat. Akun gagal: ${(e as Error).message}`, 'warning');
  }
}

export const fileActions = {
  save(as = false) { void persist(as); },
  download() {
    const s = useStore.getState();
    saveInteroFile(s.toProjectData(), s.projectName);
    toast(`File "${s.projectName}.intero" diunduh`, 'success');
  },
  async openFile() {
    try {
      const data = await openInteroFile();
      if (!data) return;
      const localId = await saveLocalProject(null, data);
      applyOpenedProject(data, { cloudId: null, localId });
      toast(`"${data.projectName}" dibuka dari file (${data.cabinets.length} komponen)`, 'success');
    } catch (e) { toast((e as Error).message, 'error'); }
  },
  browse() { window.dispatchEvent(new Event('intero:openProjects')); },
  open() { this.browse(); },
  newProject() {
    const s = useStore.getState();
    const go = () => { clearActiveProject(); s.newProject(); s.ui({ showWizard: true }); };
    if (s.items.length && s.dirty) s.ui({ dialog: { kind: 'confirm', title: 'Buat proyek baru?', message: 'Perubahan yang belum disimpan ke akun atau perangkat akan hilang.', onConfirm: go } });
    else go();
  },
  export(kind: 'png' | 'jpg' | 'obj' | 'skp') {
    const ctl = sceneRef.current;
    const s = useStore.getState();
    if (!ctl) return;
    if (kind === 'png' || kind === 'jpg') { exportImage(ctl.screenshot(kind), s.projectName, kind); toast(`Gambar ${kind.toUpperCase()} diunduh`, 'success'); return; }
    const obj = ctl.exportOBJ();
    if (kind === 'obj') { exportObj(obj, s.projectName); toast('File OBJ diunduh (unit meter)', 'success'); }
    else { exportSketchUpFallback(obj, s.projectName); toast('Format .skp proprietary — diunduh sebagai OBJ untuk diimpor ke SketchUp (File > Import).', 'info'); }
  },
};
