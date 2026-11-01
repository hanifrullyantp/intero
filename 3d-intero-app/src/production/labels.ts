import type { Panel } from './types';

const cm = (mm: number) => (Math.round(mm) / 10).toFixed(1);

/** Baris CSV label potong: satu baris per panel, satuan tampilan cm. */
export function panelLabelRows(panels: Panel[], noteOf: (itemId: string) => string = () => ''): (string | number)[][] {
  return [
    ['Kode', 'Kabinet', 'Nama', 'Panel', 'Panjang cm', 'Lebar cm', 'Tebal mm', 'Bahan', 'Catatan lapangan'],
    ...panels.map((p) => [p.id, p.itemTag, p.itemName, p.label, cm(p.h), cm(p.w), p.t, p.material, noteOf(p.itemId)]),
  ];
}
