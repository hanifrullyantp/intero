/** ProjectDoc memakai sentimeter. Editor hidup menyimpan milimeter. */

export function mmToCm(mm: number): number {
  return mm / 10;
}

export function cmToMm(cm: number): number {
  const mm = cm * 10;
  const rounded = Math.round(mm);
  return Math.abs(mm - rounded) < 1e-6 ? rounded : mm;
}
