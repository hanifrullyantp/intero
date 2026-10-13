export type Unit = 'cm' | 'mm' | 'inch';

const FACTORS: Record<Unit, number> = { cm: 1, mm: 10, inch: 1 / 2.54 };

export function fromCm(cm: number, unit: Unit): number {
  return cm * FACTORS[unit];
}
export function toCm(value: number, unit: Unit): number {
  return value / FACTORS[unit];
}
export function formatLength(cm: number, unit: Unit = 'cm', digits?: number): string {
  const v = fromCm(cm, unit);
  const d = digits ?? (unit === 'mm' ? 0 : unit === 'inch' ? 2 : 1);
  const s = Number.isInteger(v) ? v.toString() : v.toFixed(d).replace(/\.?0+$/, '');
  return `${s} ${unit === 'inch' ? '"' : unit}`;
}
export function cm2ToM2(cm2: number) {
  return cm2 / 10000;
}
