import { useEffect, useState } from 'react';
import { Download, FileUp, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { useStore } from '../../store';
import type { PriceGroup, PriceItem } from '../../types';
import { DEFAULT_PRICES } from '../../production/prices';
import { clearPrices, savePrices } from '../../lib/persistence';
import { Modal, Select, toast } from '../ui';
import { downloadBlob, pickFile, uid } from '../../lib/utils';

const GROUPS: { id: PriceGroup; label: string }[] = [
  { id: 'material', label: 'Material papan' }, { id: 'acp', label: 'Rangka + ACP' }, { id: 'hardware', label: 'Hardware' }, { id: 'appliance', label: 'Appliance' },
  { id: 'countertop', label: 'Countertop' }, { id: 'led', label: 'LED' }, { id: 'jasa', label: 'Jasa' }, { id: 'overhead', label: 'Overhead' },
];
const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',' || ch === ';') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
function rowsToItems(rows: string[][]): PriceItem[] {
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (k: string) => head.indexOf(k);
  const out: PriceItem[] = [];
  for (const r of rows.slice(1)) {
    const name = r[idx('name')]?.trim(); const price = Number(String(r[idx('price')] ?? '').replace(/[^\d.-]/g, ''));
    if (!name || Number.isNaN(price)) continue;
    const g = (r[idx('group')]?.trim() as PriceGroup) || 'material';
    out.push({ id: r[idx('id')]?.trim() || uid('PR'), group: GROUPS.some((x) => x.id === g) ? g : 'material', name, unit: r[idx('unit')]?.trim() || 'pcs', price, slot: r[idx('slot')]?.trim() || undefined });
  }
  return out;
}

export function PriceListDialog() {
  const s = useStore();
  const [rows, setRows] = useState<PriceItem[]>(() => s.prices.map((p) => ({ ...p })));
  const [group, setGroup] = useState<PriceGroup>('material');
  // Muat ulang baris tiap dialog dibuka (harga bisa berubah / baru dimuat dari IndexedDB)
  useEffect(() => { if (s.showPriceList) setRows(useStore.getState().prices.map((p) => ({ ...p }))); }, [s.showPriceList]);
  if (!s.showPriceList) return null;
  const close = () => s.ui({ showPriceList: false });
  const patch = (id: string, p: Partial<PriceItem>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const save = async () => { s.ui({ prices: rows }); await savePrices(rows); toast('Daftar harga tersimpan (dipakai lintas proyek)', 'success'); close(); };
  const reset = async () => { setRows(DEFAULT_PRICES.map((p) => ({ ...p }))); s.ui({ prices: DEFAULT_PRICES }); await clearPrices(); toast('Daftar harga dikembalikan ke default', 'info'); };
  const exportCsv = () => {
    const csv = [['id', 'group', 'name', 'unit', 'price', 'slot'], ...rows.map((r) => [r.id, r.group, r.name, r.unit, r.price, r.slot ?? ''])].map((r) => r.map(csvCell).join(',')).join('\n');
    downloadBlob('daftar-harga-3d-intero.csv', new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  };
  const exportXlsx = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([['id', 'group', 'name', 'unit', 'price', 'slot'], ...rows.map((r) => [r.id, r.group, r.name, r.unit, r.price, r.slot ?? ''])]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Daftar Harga'); XLSX.writeFile(wb, 'daftar-harga-3d-intero.xlsx');
  };
  const importFile = async () => {
    const f = await pickFile('.csv,.xlsx,.xls', true); if (!f) return;
    try {
      let items: PriceItem[] = [];
      if (/\.csv$/i.test(f.name)) items = rowsToItems(parseCsv(new TextDecoder().decode(f.data as ArrayBuffer)));
      else { const XLSX = await import('xlsx'); const wb = XLSX.read(f.data as ArrayBuffer, { type: 'array' }); const aoa = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false }); items = rowsToItems(aoa as string[][]); }
      if (!items.length) { toast('Tidak ada baris harga valid. Kolom: id, group, name, unit, price, slot', 'error'); return; }
      setRows((cur) => { const map = new Map(cur.map((r) => [r.id, r])); for (const it of items) map.set(it.id, it); return [...map.values()]; });
      toast(`${items.length} harga diimpor — klik Simpan untuk menerapkan`, 'success');
    } catch { toast('File tidak dapat dibaca', 'error'); }
  };
  const list = rows.filter((r) => r.group === group);
  return (
    <Modal onClose={close} width={860} style={{ maxHeight: 'calc(100vh - 32px)' }}>
      <div className="p-5 flex flex-col gap-3" style={{ maxHeight: 'calc(100vh - 40px)' }}>
        <div className="flex items-center gap-2"><h3 className="text-[17px] font-bold flex-1">Daftar Harga Material</h3><button className="icon-btn" onClick={close}><X size={16} /></button></div>
        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Harga dalam Rupiah. Item bertanda "slot" adalah pilihan yang bisa dipilih per skenario (mis. HPL ekonomis / TACO / premium). Tersimpan di browser dan dipakai semua proyek.</p>
        <div className="flex flex-wrap gap-1.5">{GROUPS.map((g) => <button key={g.id} className={`btn btn-sm ${group === g.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setGroup(g.id)}>{g.label}</button>)}</div>
        <div className="overflow-auto rounded-lg" style={{ border: '1px solid var(--border)', maxHeight: '48vh' }}>
          <table className="w-full text-[12px]"><thead><tr style={{ background: 'var(--bg-secondary)' }}><th className="text-left p-2">Nama</th><th className="text-left p-2" style={{ width: 80 }}>Satuan</th><th className="text-right p-2" style={{ width: 130 }}>Harga (Rp)</th><th className="text-left p-2" style={{ width: 90 }}>Slot</th><th style={{ width: 36 }} /></tr></thead>
            <tbody>{list.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="p-1"><input className="input" value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })} /></td>
                <td className="p-1"><input className="input" value={r.unit} onChange={(e) => patch(r.id, { unit: e.target.value })} /></td>
                <td className="p-1"><input className="input mono" style={{ textAlign: 'right' }} type="number" min={0} value={r.price} onChange={(e) => patch(r.id, { price: Math.max(0, +e.target.value) })} /></td>
                <td className="p-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{r.slot ?? '—'}</td>
                <td className="p-1"><button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))}><Trash2 size={13} /></button></td>
              </tr>))}
            </tbody></table>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button className="btn btn-secondary btn-sm" onClick={() => setRows((x) => [...x, { id: uid('PR'), group, name: 'Item baru', unit: 'pcs', price: 0 }])}><Plus size={13} />Tambah item</button>
          <button className="btn btn-secondary btn-sm" onClick={importFile}><FileUp size={13} />Import CSV/Excel</button>
          <button className="btn btn-secondary btn-sm" onClick={exportCsv}><Download size={13} />CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={exportXlsx}><Download size={13} />Excel</button>
          <button className="btn btn-ghost btn-sm" onClick={reset}><RotateCcw size={13} />Reset default</button>
          <div className="flex-1" />
          <Select value={group} onChange={(v) => setGroup(v)} options={GROUPS.map((g) => ({ value: g.id, label: g.label }))} className="w-40 sm:hidden" />
          <button className="btn btn-primary" onClick={save}><Save size={14} />Simpan</button>
        </div>
      </div>
    </Modal>
  );
}
