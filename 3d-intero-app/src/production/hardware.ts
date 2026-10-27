// 3D Intero — Kalkulator hardware (engsel, rel, handle, sekrup, aksesoris, rangka)
import type { Item } from '../types';
import type { HwLine, ItemProduction } from './types';

export function hingesFor(doorH: number) { return doorH <= 1000 ? 2 : doorH <= 1600 ? 3 : doorH <= 2100 ? 4 : 5; }

export function calcHardware(prod: ItemProduction[], items: Item[], hplAreaM2: number): HwLine[] {
  const m = new Map<string, number>();
  const add = (ref: string, q: number) => { if (q > 0) m.set(ref, (m.get(ref) ?? 0) + q); };
  const byId = new Map(items.map((i) => [i.id, i]));
  let papanPanels = 0, acpPerimeterMm = 0, frameLenMm = 0;
  for (const ip of prod) {
    const it = byId.get(ip.itemId);
    if (!it) continue;
    const handleRef = it.materials.handleType === 'push' ? 'pushopen' : 'handle';
    for (const p of ip.panels) {
      if (p.kind === 'door') {
        if (p.code === 'DRB') { add('hinge168', 2); add(handleRef, 1); }
        else if (p.code === 'DRA') { add('hinge', 2); add(handleRef, 1); }
        else { add('hinge', hingesFor(p.h)); add(handleRef, 1); }
      } else if (p.kind === 'drawer') { add('slide', 1); add(handleRef, 1); }
      else if (p.kind === 'shelf') add('pin', 4);
    }
    if (ip.method === 'papan_hpl') {
      papanPanels += ip.panels.length;
      add('confirmat', 8); add('dowel', 10); add('screw_dw', 20);
    } else {
      add('elbow', ip.joints.length); add('bolt_m8', ip.joints.length * 2);
      add('screw_acp', ip.panels.length * 20);
      add('anchor', it.type === 'wall' || it.type === 'tall' || it.type === 'hood' || it.type === 'fridge' || it.type === 'electronic' || it.type === 'corner_wall' ? 4 : 2);
      for (const p of ip.panels) acpPerimeterMm += 2 * (p.w + p.h);
      for (const sg of ip.segments) frameLenMm += sg.length;
    }
    const cfg = it.config;
    const acc = (a?: string) => {
      switch (a) { case 'dish_rack': add('acc_dish', 1); break; case 'spice_rack': add('acc_spice', 1); break; case 'gas_rack': add('acc_gas', 1); break; case 'cutlery_drawer': add('acc_cutlery', 1); break; case 'trash_bin': add('acc_trash', 1); break; default: break; }
    };
    if (it.type === 'base' || it.type === 'sink_base' || it.type === 'cooktop_base' || it.type === 'drawer_base') { acc(cfg.leftAccessory); if ((cfg.doorCount ?? 2) === 2) acc(cfg.rightAccessory); }
    if (it.type === 'corner_base' && cfg.lazySusan) add('acc_lazy', 1);
    if (it.type === 'electronic' && (cfg.slot1 ?? 'magiccom') === 'magiccom') add('acc_magiccom_tray', 1);
  }
  add('glue_yellow', hplAreaM2 > 0 ? Math.ceil(hplAreaM2 / 10) : 0);
  add('glue_white', papanPanels > 0 ? Math.ceil(papanPanels / 20) : 0);
  add('weld_rod', frameLenMm > 0 ? Math.ceil((frameLenMm / 1000) * 0.06) : 0);
  add('silicone', acpPerimeterMm > 0 ? Math.ceil(acpPerimeterMm / 1000) : 0);
  return [...m.entries()].map(([ref, qty]) => ({ ref, qty }));
}
