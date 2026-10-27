// 3D Intero — Status produksi per kabinet
import type { ProdStatus } from '../types';

export const STATUSES: { id: ProdStatus; label: string; color: string; pct: number }[] = [
  { id: 'belum', label: 'Belum mulai', color: '#9CA3AF', pct: 0 },
  { id: 'potong', label: 'Potong bahan', color: '#3B82F6', pct: 20 },
  { id: 'rakit', label: 'Rakit rangka', color: '#8B5CF6', pct: 45 },
  { id: 'finishing', label: 'Finishing', color: '#F59E0B', pct: 70 },
  { id: 'siap', label: 'Siap kirim', color: '#14B8A6', pct: 90 },
  { id: 'terpasang', label: 'Terpasang', color: '#1B9D6B', pct: 100 },
];
export const statusOf = (s: ProdStatus | undefined) => STATUSES.find((x) => x.id === (s ?? 'belum')) ?? STATUSES[0];
export const nextStatus = (s: ProdStatus | undefined): ProdStatus => { const i = STATUSES.findIndex((x) => x.id === (s ?? 'belum')); return STATUSES[Math.min(STATUSES.length - 1, i + 1)].id; };
export const overallProgress = (list: (ProdStatus | undefined)[]) => (list.length ? Math.round(list.reduce((a, s) => a + statusOf(s).pct, 0) / list.length) : 0);
