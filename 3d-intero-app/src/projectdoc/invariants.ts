import type { ProjectDoc, ProjectItem } from './schema';

const HEIGHT_EPS = 0.05;
const WALL_EPS = 0.1;
const OVERLAP_EPS = 0.2;

const SKIP_TYPES = new Set(['countertop', 'backsplash', 'hardware', 'panel']);
const TALL_SUBTYPES = new Set(['tall', 'fridge', 'electronic']);
const WALL_SUBTYPES = new Set(['hood', 'wall', 'corner_wall']);

type Row = 'base' | 'wall';

function rowsOf(item: ProjectItem, doc: ProjectDoc): Row[] {
  if (SKIP_TYPES.has(item.type) || !item.wallId) return [];
  if (TALL_SUBTYPES.has(item.subtype)) return ['base', 'wall'];
  if (item.type === 'wall_cabinet' || item.type === 'corner_wall' || WALL_SUBTYPES.has(item.subtype)) return ['wall'];
  if (item.type === 'appliance' && item.elevationCm > doc.globals.tinggiBaseCm) return ['wall'];
  if (item.type === 'appliance' && item.dims.h > doc.globals.tinggiBaseCm + 1 && item.elevationCm <= 0.1) return ['base', 'wall'];
  return ['base'];
}

function cm(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString('id-ID');
}

export interface ViolationRecord { key: string; message: string }

export function violationRecords(doc: ProjectDoc): ViolationRecord[] {
  const out: ViolationRecord[] = [];
  const add = (key: string, message: string) => out.push({ key, message });
  const seen = new Map<string, string>();
  const claim = (id: string, kind: string) => {
    const prev = seen.get(id);
    if (prev) add(`dup:${id}`, `ID "${id}" terpakai lebih dari sekali (${prev} dan ${kind}).`);
    else seen.set(id, kind);
  };

  for (const wall of doc.room.walls) claim(wall.id, 'dinding');
  for (const item of doc.items) claim(item.id, 'item');
  for (const material of doc.materials) claim(material.id, 'material');
  for (const opening of doc.room.bukaan) claim(opening.id, 'bukaan');

  const walls = new Map(doc.room.walls.map((wall) => [wall.id, wall]));
  const items = new Map(doc.items.map((item) => [item.id, item]));

  for (const item of doc.items) {
    const top = item.elevationCm + item.dims.h;
    if (top > doc.globals.tinggiTotalCm + HEIGHT_EPS) {
      add(`height:${item.id}`, `Tinggi ${item.label} (${item.id}) mencapai ${cm(top)} cm dan melampaui tinggi total ${cm(doc.globals.tinggiTotalCm)} cm.`);
    }
    if (item.wallId) {
      const wall = walls.get(item.wallId);
      if (!wall) add(`nowall:${item.id}`, `Dinding "${item.wallId}" untuk item ${item.id} tidak ditemukan.`);
      else {
        const right = item.offsetCm + item.dims.w;
        if (item.offsetCm < -WALL_EPS) add(`start:${item.id}`, `Item ${item.label} (${item.id}) melewati awal dinding ${wall.nama}.`);
        if (right > wall.panjangCm + WALL_EPS) {
          add(`end:${item.id}`, `Item ${item.label} (${item.id}) melewati panjang dinding ${wall.nama} sebesar ${cm(right - wall.panjangCm)} cm.`);
        }
      }
    }
    if (item.parentId && !items.has(item.parentId)) add(`parent:${item.id}`, `Parent "${item.parentId}" untuk item ${item.id} tidak ditemukan.`);
  }

  for (const opening of doc.room.bukaan) {
    if (!walls.has(opening.wallId)) add(`opening:${opening.id}`, `Dinding "${opening.wallId}" untuk bukaan ${opening.id} tidak ditemukan.`);
  }

  for (let i = 0; i < doc.items.length; i++) {
    for (let j = i + 1; j < doc.items.length; j++) {
      const a = doc.items[i];
      const b = doc.items[j];
      if (!a.wallId || a.wallId !== b.wallId) continue;
      const rowsA = rowsOf(a, doc);
      const rowsB = rowsOf(b, doc);
      if (!rowsA.some((row) => rowsB.includes(row))) continue;
      const overlap = Math.min(a.offsetCm + a.dims.w, b.offsetCm + b.dims.w) - Math.max(a.offsetCm, b.offsetCm);
      if (overlap > OVERLAP_EPS) {
        const wall = walls.get(a.wallId);
        const pair = [a.id, b.id].sort().join('|');
        add(`overlap:${pair}:${a.wallId}`, `Item ${a.label} (${a.id}) bertabrakan dengan ${b.label} (${b.id}) pada ${wall?.nama ?? a.wallId} sebesar ${cm(overlap)} cm.`);
      }
    }
  }

  return out;
}

export function checkInvariants(doc: ProjectDoc): string[] {
  return violationRecords(doc).map((row) => row.message);
}

/** Pelanggaran yang belum ada sebelum perintah. Pelanggaran lama tidak memblokir edit berikutnya. */
export function freshViolations(before: ProjectDoc, after: ProjectDoc): string[] {
  const prior = new Set(violationRecords(before).map((row) => row.key));
  return violationRecords(after).filter((row) => !prior.has(row.key)).map((row) => row.message);
}
