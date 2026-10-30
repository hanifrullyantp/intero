import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '../../store';
import { fromProjectData } from '../../projectdoc/adapter';
import { serializeProjectDoc, type ProjectDoc, type ProjectItem } from '../../projectdoc/schema';
import { Modal } from '../ui';

function TreeItem({ item, items, depth, onSelect }: { item: ProjectItem; items: ProjectItem[]; depth: number; onSelect: (id: string) => void }) {
  const children = items.filter((child) => child.parentId === item.id);
  return (
    <div>
      <button type="button" className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px]" style={{ paddingLeft: 8 + depth * 12 }} onClick={() => onSelect(item.id)}>
        <span className="flex-1 truncate">{item.label}</span>
        <span className="mono shrink-0" style={{ color: 'var(--text-tertiary)' }}>{item.id}</span>
      </button>
      {children.map((child) => <TreeItem key={child.id} item={child} items={items} depth={depth + 1} onSelect={onSelect} />)}
    </div>
  );
}

export function ProjectStructure() {
  const s = useStore();
  const [open, setOpen] = useState(true);
  const [json, setJson] = useState(false);
  const derived = useMemo(() => {
    if (s.projectDoc) return { doc: s.projectDoc as ProjectDoc, error: '' };
    try {
      return { doc: fromProjectData(s.toProjectData(), { snapGizmoCm: Math.max(0.1, s.snapSize / 10) }), error: '' };
    } catch (err) {
      return { doc: null, error: err instanceof Error ? err.message : 'Dokumen proyek tidak bisa dibaca.' };
    }
  }, [s.projectDoc, s.items, s.walls, s.settings, s.projectName, s.dimensions, s.customComponents, s.snapSize, s.toProjectData]);
  const doc = derived.doc;
  const roots = (wallId: string | null) => (doc?.items ?? []).filter((item) => item.wallId === wallId && (!item.parentId || !(doc?.items ?? []).some((other) => other.id === item.parentId)));

  return (
    <div className="mt-2" data-tour="project-structure" style={{ borderTop: '1px solid var(--border)' }}>
      <button type="button" className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }} onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <span className="flex-1 text-left">Struktur Proyek</span>
      </button>
      {open && (
        <div className="px-2 pb-2">
          {derived.error && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{derived.error}</p>}
          {doc && (
            <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <p className="px-1.5 py-0.5">{doc.meta.nama}</p>
              <p className="px-1.5 py-0.5">Ruangan {doc.room.bentuk} · {doc.room.lebarCm} × {doc.room.dalamCm} cm · plafon {doc.room.tinggiPlafonCm} cm</p>
              {doc.room.walls.map((wall) => (
                <div key={wall.id} className="mt-1">
                  <p className="px-1.5 py-0.5 font-semibold">{wall.nama} · {Math.round(wall.panjangCm)} cm</p>
                  {roots(wall.id).map((item) => <TreeItem key={item.id} item={item} items={doc.items} depth={1} onSelect={(id) => s.setSelection([id])} />)}
                </div>
              ))}
              {roots(null).length > 0 && (
                <div className="mt-1">
                  <p className="px-1.5 py-0.5 font-semibold">Bebas</p>
                  {roots(null).map((item) => <TreeItem key={item.id} item={item} items={doc.items} depth={1} onSelect={(id) => s.setSelection([id])} />)}
                </div>
              )}
              {doc.materials.length > 0 && <p className="px-1.5 py-0.5">Material: {doc.materials.map((material) => material.nama).join(', ')}</p>}
            </div>
          )}
          <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={() => setJson(true)}>Lihat JSON</button>
        </div>
      )}
      {json && doc && (
        <Modal onClose={() => setJson(false)} width={720}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-[14px] font-bold">ProjectDoc</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setJson(false)}>Tutup</button>
          </div>
          <pre className="mono overflow-auto p-4 text-[11px]" style={{ maxHeight: '70vh' }}>{JSON.stringify(JSON.parse(serializeProjectDoc(doc)), null, 2)}</pre>
        </Modal>
      )}
    </div>
  );
}
