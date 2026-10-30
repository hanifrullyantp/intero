import { useEffect, useState } from 'react';
import { Cloud, FolderOpen, HardDrive, Trash2 } from 'lucide-react';
import { getActiveProject, getSession, setActiveProject } from '../../lib/account';
import { deleteCloudProject, fetchCloudProject, listCloudProjects, type CloudProjectMeta } from '../../lib/cloud-projects';
import { deleteLocalProject, listLocalProjects, saveLocalProject, type LocalProjectRecord } from '../../lib/persistence';
import { timeAgo } from '../../lib/utils';
import { Modal, toast } from '../ui';
import { applyOpenedProject, fileActions } from './file-actions';

export function ProjectsDialog({ onClose }: { onClose: () => void }) {
  const session = getSession();
  const [tab, setTab] = useState<'cloud' | 'local'>(session ? 'cloud' : 'local');
  const [cloud, setCloud] = useState<CloudProjectMeta[] | null>(null);
  const [local, setLocal] = useState<LocalProjectRecord[] | null>(null);
  const [err, setErr] = useState('');
  const active = getActiveProject();

  const refresh = () => {
    setErr('');
    if (getSession()) listCloudProjects().then(setCloud).catch((e: Error) => { setCloud([]); setErr(e.message); });
    else setCloud([]);
    listLocalProjects().then(setLocal).catch(() => setLocal([]));
  };
  useEffect(() => { refresh(); }, []);

  const loadCloud = async (row: CloudProjectMeta) => {
    try {
      const data = await fetchCloudProject(row.id);
      const localId = await saveLocalProject(active.cloudId === row.id ? active.localId : null, data);
      applyOpenedProject(data, { cloudId: row.id, localId });
      toast(`"${data.projectName}" dibuka dari akun`, 'success');
      onClose();
    } catch (e) { toast((e as Error).message, 'error'); }
  };
  const loadLocal = (row: LocalProjectRecord) => {
    applyOpenedProject(row.data, { cloudId: null, localId: row.id });
    toast(`"${row.data.projectName}" dibuka dari perangkat ini`, 'success');
    onClose();
  };

  return (
    <Modal onClose={onClose} width={560}>
      <div className="p-6 flex flex-col gap-4">
        <h3 className="text-[17px] font-bold">Buka proyek</h3>
        <div className="seg w-full">
          <button type="button" className={`flex-1 ${tab === 'cloud' ? 'active' : ''}`} onClick={() => setTab('cloud')}><Cloud size={14} />Akun</button>
          <button type="button" className={`flex-1 ${tab === 'local' ? 'active' : ''}`} onClick={() => setTab('local')}><HardDrive size={14} />Perangkat ini</button>
        </div>
        {tab === 'cloud' && !session && (
          <div className="flex flex-col gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            <p>Masuk untuk memuat proyek yang tersimpan di akun Anda.</p>
            <button type="button" className="btn btn-primary self-start" onClick={() => { onClose(); window.dispatchEvent(new Event('intero:openAuth')); }}>Masuk</button>
          </div>
        )}
        {tab === 'cloud' && session && (
          <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto">
            {err && <p className="text-[12px]" style={{ color: 'var(--danger)' }}>{err}</p>}
            {cloud === null && <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Memuat…</p>}
            {cloud?.length === 0 && !err && <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>Belum ada proyek di akun {session.user.email}. Simpan dulu dengan Ctrl+S.</p>}
            {cloud?.map((row) => (
              <div key={row.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ border: '1px solid var(--border)', background: active.cloudId === row.id ? 'var(--bg-selected)' : 'var(--bg-secondary)' }}>
                <button type="button" className="flex-1 text-left min-w-0" onClick={() => void loadCloud(row)}>
                  <div className="text-[13px] font-semibold truncate">{row.name}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(row.updatedAt)}</div>
                </button>
                <button type="button" className="icon-btn" aria-label="Hapus dari akun" onClick={async () => { if (!window.confirm(`Hapus "${row.name}" dari akun?`)) return; try { await deleteCloudProject(row.id); if (getActiveProject().cloudId === row.id) setActiveProject({ cloudId: null }); refresh(); } catch (e) { toast((e as Error).message, 'error'); } }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
        {tab === 'local' && (
          <div className="flex flex-col gap-2">
            <button type="button" className="btn btn-secondary self-start" onClick={() => { onClose(); void fileActions.openFile(); }}><FolderOpen size={14} />Pilih file .intero</button>
            <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto">
              {local === null && <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Memuat…</p>}
              {local?.length === 0 && <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>Belum ada simpanan di browser ini.</p>}
              {local?.map((row) => (
                <div key={row.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ border: '1px solid var(--border)', background: active.localId === row.id ? 'var(--bg-selected)' : 'var(--bg-secondary)' }}>
                  <button type="button" className="flex-1 text-left min-w-0" onClick={() => loadLocal(row)}>
                    <div className="text-[13px] font-semibold truncate">{row.name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(row.savedAt)} · {row.data.cabinets?.length ?? 0} komponen</div>
                  </button>
                  <button type="button" className="icon-btn" aria-label="Hapus dari perangkat" onClick={async () => { if (!window.confirm(`Hapus "${row.name}" dari perangkat ini?`)) return; await deleteLocalProject(row.id); if (getActiveProject().localId === row.id) setActiveProject({ localId: null }); refresh(); }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end"><button type="button" className="btn btn-secondary" onClick={onClose}>Tutup</button></div>
      </div>
    </Modal>
  );
}
