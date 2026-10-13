import type { Issue, Item, Project } from '../models/types';
import { footprint, rectsOverlap, verticalOverlap, center, dist, r1, overlapArea, itemsOverlapArea } from '../utils/geometry';
import { KITCHEN_STANDARDS, CONSTRUCTION_RULES } from '../config/standards';
import { APPLIANCES } from '../config/appliances';
import { baseRunDepth, isTopTier } from './kitchenRules';
import { housingLayout } from './applianceHousing';
import { applyProjectDimensions } from './projectDimensions';
import { ELECTRO_DEFS, electronicsLayout } from './electronicsTower';

export const isCooktop = (i: Item) => i.subtype.startsWith('app_cooktop');
export const isSink = (i: Item) => i.subtype.startsWith('app_sink');
export const isHood = (i: Item) => i.subtype.startsWith('app_hood');
export const isFridge = (i: Item) => i.subtype.includes('fridge');

export function hoodMinDistance(hood: Item) {
  return hood.config.fuel === 'electric'
    ? APPLIANCES.cooker_hood.min_distance_from_electric_cooktop
    : APPLIANCES.cooker_hood.min_distance_from_gas_cooktop;
}

export function validate(project: Project): Issue[] {
  const issues: Issue[] = [];
  const items = project.items;
  const room = project.room;
  let n = 0;
  const push = (i: Omit<Issue, 'id'>) => issues.push({ id: `iss_${n++}`, ...i });

  // --- overlaps & boundaries ---
  for (let a = 0; a < items.length; a++) {
    const A = items[a];
    const fa = footprint(A);
    if (fa.x < -0.05 || fa.y < -0.05 || fa.x + fa.w > room.width + 0.05 || fa.y + fa.h > room.depth + 0.05) {
      push({ severity: 'error', message: `${A.name} extends outside the room boundary`, itemIds: [A.id], fix: 'move_inside' });
    }
    if (A.elevation + A.height > room.ceilingHeight + 0.05) {
      push({ severity: 'error', message: `${A.name} is taller than the ceiling (${room.ceilingHeight} cm)`, itemIds: [A.id] });
    } else if (A.category === 'tall' && room.ceilingHeight - (A.elevation + A.height) < CONSTRUCTION_RULES.cabinet_to_ceiling_min && room.ceilingHeight - (A.elevation + A.height) > 0.05) {
      push({ severity: 'warning', message: `${A.name}: less than ${CONSTRUCTION_RULES.cabinet_to_ceiling_min} cm clearance to ceiling`, itemIds: [A.id] });
    }
    for (let b = a + 1; b < items.length; b++) {
      const B = items[b];
      if (A.kind === 'accessory' || B.kind === 'accessory') continue;
      const fb = footprint(B);
      if (!rectsOverlap(fa, fb, 0.3)) continue;
      if (!verticalOverlap(A, B)) continue;
      // fridge appliance inside fridge housing is allowed
      if ((A.subtype === 'tall_fridge' && B.subtype === 'app_fridge') || (B.subtype === 'tall_fridge' && A.subtype === 'app_fridge')) continue;
      // L-shaped corner cabinets only occupy two arms — use real occupied rectangles
      const area = itemsOverlapArea(A, B);
      if (area < 2) continue;
      push({ severity: 'error', message: `${A.name} overlaps ${B.name} (${r1(area)} cm²)`, itemIds: [A.id, B.id], fix: 'resolve_overlap' });
    }
  }

  // --- door swing / drawer clearance at corners ---
  for (const A of items) {
    if (A.kind !== 'cabinet' || A.category === 'wall') continue;
    for (const B of items) {
      if (A === B || B.kind !== 'cabinet' || B.category === 'wall' || A.rotation === B.rotation) continue;
      if (A.subtype.includes('corner') || B.subtype.includes('corner')) continue;
      const fa = footprint(A);
      const fb = footprint(B);
      const touching = rectsOverlap({ x: fa.x - 1, y: fa.y - 1, w: fa.w + 2, h: fa.h + 2 }, fb, 0);
      if (touching && A.id < B.id) {
        const kind = A.config.drawers > 0 || B.config.drawers > 0 ? 'Drawer clearance' : 'Door swing';
        push({ severity: 'warning', message: `${kind} conflict between ${A.name} and ${B.name} at inner corner — add a filler strip`, itemIds: [A.id, B.id] });
      }
    }
  }

  // --- corners must be flush with the base run (arm depth = run depth) ---
  const runDepth = baseRunDepth(items);
  for (const c of items) {
    if (c.kind !== 'cabinet' || c.category !== 'base' || !c.subtype.includes('corner')) continue;
    const arm = c.config.cornerDepth ?? runDepth;
    if (Math.abs(arm - runDepth) > 0.5) {
      const dir = arm > runDepth ? 'menonjol ke depan' : 'masuk ke belakang';
      push({ severity: 'warning', message: `${c.name}: sisi sudut ${r1(arm)} cm tidak rata dengan kabinet lain (${runDepth} cm) — ${dir} ${r1(Math.abs(arm - runDepth))} cm`, itemIds: [c.id], fix: 'sync_corner' });
    }
  }

  // --- structural ---
  for (const it of items) {
    if (it.subtype.startsWith('tall_fridge') || it.subtype === 'tall_dispenser') {
      const h = housingLayout(it, project.materials.board);
      if (h.device.width + 2 * h.thickness > it.width + 0.1) push({ severity: 'warning', message: `${it.name}: perangkat ${h.device.width} cm lebih lebar dari ruang dalam housing.`, itemIds: [it.id] });
      if (h.shelfY + h.thickness + 5 > it.height) push({ severity: 'warning', message: `${it.name}: tinggi housing tidak cukup untuk perangkat dan ventilasi. Perangkat tidak diperkecil otomatis.`, itemIds: [it.id] });
    }
    if (it.subtype === 'tall_electro') {
      const e = electronicsLayout(it);
      if (e.magiccom.width + 3.6 > it.width || e.magiccom.depth + 3 > it.depth) push({ severity: 'warning', message: `${it.name}: magiccom tidak muat di niche.`, itemIds: [it.id] });
      for (const slot of e.slots) {
        const def = ELECTRO_DEFS[slot.key];
        if (def.w + 4 > it.width || def.d + 2 > it.depth) push({ severity: 'warning', message: `${it.name}: ${def.label} ${def.w}×${def.d} cm tidak muat di niche ${it.width}×${it.depth} cm.`, itemIds: [it.id] });
      }
      if (e.storageHeight < 8) push({ severity: 'warning', message: `${it.name}: tinggi total tidak cukup untuk kombinasi perangkat (oven 29 cm) dan kabinet atas.`, itemIds: [it.id] });
    }
    const targetTop = project.settings.defaults?.totalHeight;
    if (project.type === 'kitchen' && targetTop && it.kind === 'cabinet' && (it.category === 'wall' || it.category === 'tall') && isTopTier(it, items) && Math.abs(it.elevation + it.height - targetTop) > 0.11) {
      push({ severity: 'warning', message: `${it.name}: puncak ${r1(it.elevation + it.height)} cm, target global ${targetTop} cm.`, itemIds: [it.id], fix: 'align_top_line' });
    }
    if (it.subtype.includes('corner')) {
      const dep = it.config.cornerDepth ?? (it.category === 'wall' ? 33 : 60);
      const arm = Math.max(15, Math.min(dep, it.width, it.depth));
      if (it.width < 30 || it.depth < 30) push({ severity: 'error', message: `${it.name}: corner run under 30cm`, itemIds: [it.id] });
      else if (it.width < dep || it.depth < dep) push({ severity: 'warning', message: `${it.name}: a run (${r1(Math.min(it.width, it.depth))}cm) is shorter than the ${dep}cm depth — that side becomes a blind corner`, itemIds: [it.id] });
      if ((it.config.cornerDoorModel ?? 'both') === 'bifold') {
        const lw = it.config.cornerLeftDoor ?? 45;
        const rw = it.config.cornerRightDoor ?? 45;
        if (lw > 60 || rw > 60) push({ severity: 'warning', message: `${it.name}: bi-fold panel over 60cm is too heavy for 168° hinges`, itemIds: [it.id] });
        else if (lw < 30 || rw < 30) push({ severity: 'warning', message: `${it.name}: bi-fold panel under 30cm is impractical`, itemIds: [it.id] });
      }
      void arm;
      continue;
    }
    if (it.kind !== 'cabinet' || it.config.shelves === 0) continue;
    const span = it.width - 3.6;
    if (span > CONSTRUCTION_RULES.max_shelf_span_18mm) {
      push({ severity: 'warning', message: `${it.name}: shelf span ${r1(span)} cm exceeds ${CONSTRUCTION_RULES.max_shelf_span_18mm} cm — add a center divider`, itemIds: [it.id] });
    }
    if (it.kind === 'cabinet' && it.config.doors === 1 && it.width > 65 && !it.config.openFront && it.config.opening !== 'flip_up') {
      push({ severity: 'warning', message: `${it.name}: single door wider than 65 cm — use 2 doors`, itemIds: [it.id], fix: 'two_doors' });
    }
  }

  if (project.type !== 'kitchen') return issues;

  // --- sinks & cooktops must sit on a base cabinet ---
  const bases = items.filter((i) => i.kind === 'cabinet' && i.category === 'base');
  for (const ap of items.filter((i) => isSink(i) || isCooktop(i))) {
    const fa = footprint(ap);
    const host = bases.find((b) => overlapArea(footprint(b), fa) > fa.w * fa.h * 0.9);
    if (!host) push({ severity: 'warning', message: `${ap.name} is not placed over a base cabinet`, itemIds: [ap.id] });
    else if (host.width < ap.width + 2) push({ severity: 'warning', message: `${host.name} (${host.width} cm) is too narrow for ${ap.name} (${ap.width} cm)`, itemIds: [host.id, ap.id] });
  }

  // --- cooker hood ---
  const hoods = items.filter(isHood);
  for (const ck of items.filter(isCooktop)) {
    const cc = center(footprint(ck));
    const hood = hoods
      .map((h) => ({ h, d: dist(cc.x, cc.y, center(footprint(h)).x, center(footprint(h)).y) }))
      .sort((a, b) => a.d - b.d)[0];
    if (!hood || hood.d > 60) {
      push({ severity: 'warning', message: `No cooker hood above ${ck.name}`, itemIds: [ck.id] });
      continue;
    }
    const h = hood.h;
    const hc = center(footprint(h));
    const along = ck.rotation % 180 === 0 ? Math.abs(hc.x - cc.x) : Math.abs(hc.y - cc.y);
    if (along > 2) push({ severity: 'warning', message: `${h.name} is off-center from ${ck.name} by ${r1(along)} cm`, itemIds: [h.id, ck.id], fix: 'align_hood' });
    if (h.width < ck.width) push({ severity: 'warning', message: `${h.name} (${h.width} cm) is narrower than ${ck.name} (${ck.width} cm)`, itemIds: [h.id], fix: 'widen_hood' });
    const gap = h.elevation - (ck.elevation + ck.height);
    const min = hoodMinDistance(h);
    if (gap < min - 0.05) {
      const auto = h.config.hoodAuto !== false ? ' (sejajar bawah kabinet atas — naikkan backsplash/kabinet atas, atau naikkan hood saja)' : '';
      push({ severity: 'warning', message: `${h.name} is ${r1(gap)} cm above cooktop — minimum ${min} cm for ${h.config.fuel ?? 'gas'}${auto}`, itemIds: [h.id], fix: 'raise_hood' });
    }
  }

  // --- work triangle ---
  const sink = items.find(isSink);
  const cook = items.find(isCooktop);
  const fridge = items.find(isFridge);
  const wt = KITCHEN_STANDARDS.work_triangle;
  const check = (a: Item | undefined, b: Item | undefined, rule: { min: number; max: number }, label: string) => {
    if (!a || !b) return 0;
    const ca = center(footprint(a));
    const cb = center(footprint(b));
    const d = dist(ca.x, ca.y, cb.x, cb.y);
    if (d < rule.min) push({ severity: 'warning', message: `Work triangle: ${label} distance ${r1(d)} cm is below ${rule.min} cm`, itemIds: [a.id, b.id] });
    else if (d > rule.max) push({ severity: 'info', message: `Work triangle: ${label} distance ${r1(d)} cm exceeds ${rule.max} cm`, itemIds: [a.id, b.id] });
    return d;
  };
  const d1 = check(sink, cook, wt.sink_to_stove, 'sink → stove');
  const d2 = check(cook, fridge, wt.stove_to_fridge, 'stove → fridge');
  const d3 = check(sink, fridge, wt.sink_to_fridge, 'sink → fridge');
  if (sink && cook && fridge) {
    const per = d1 + d2 + d3;
    if (per < wt.total_perimeter.min || per > wt.total_perimeter.max)
      push({ severity: 'info', message: `Work triangle perimeter ${r1(per)} cm (recommended ${wt.total_perimeter.min}–${wt.total_perimeter.max} cm)`, itemIds: [sink.id, cook.id, fridge.id] });
  }
  return issues;
}

/** Apply an automatic fix. Returns a new items array. */
export function applyFix(project: Project, issue: Issue): Item[] {
  if (issue.fix === 'align_top_line') return applyProjectDimensions(project).items;
  const items = project.items.map((i) => ({ ...i, config: { ...i.config } }));
  const byId = (id: string) => items.find((i) => i.id === id)!;
  switch (issue.fix) {
    case 'move_inside': {
      const it = byId(issue.itemIds[0]);
      const f = footprint(it);
      it.x = r1(Math.max(0, Math.min(project.room.width - f.w, it.x)));
      it.y = r1(Math.max(0, Math.min(project.room.depth - f.h, it.y)));
      break;
    }
    case 'resolve_overlap': {
      const A = byId(issue.itemIds[0]);
      const B = byId(issue.itemIds[1]);
      const fa = footprint(A);
      const fb = footprint(B);
      // shift B along the wall direction (perpendicular to its front)
      if (B.rotation % 180 === 0) B.x = r1(fb.x < fa.x ? fa.x - fb.w : fa.x + fa.w);
      else B.y = r1(fb.y < fa.y ? fa.y - fb.h : fa.y + fa.h);
      break;
    }
    case 'align_hood': {
      const hood = byId(issue.itemIds[0]);
      const ck = byId(issue.itemIds[1]);
      const cc = center(footprint(ck));
      const fh = footprint(hood);
      if (hood.rotation % 180 === 0) hood.x = r1(cc.x - fh.w / 2);
      else hood.y = r1(cc.y - fh.h / 2);
      break;
    }
    case 'widen_hood': {
      const hood = byId(issue.itemIds[0]);
      const ck = project.items.find(isCooktop);
      if (ck) {
        const cc = center(footprint(ck));
        hood.width = Math.max(hood.width, Math.ceil(ck.width / 10) * 10);
        const fh = footprint(hood);
        if (hood.rotation % 180 === 0) hood.x = r1(cc.x - fh.w / 2);
        else hood.y = r1(cc.y - fh.h / 2);
      }
      break;
    }
    case 'raise_hood': {
      const hood = byId(issue.itemIds[0]);
      const ck = project.items.find(isCooktop);
      if (ck) hood.elevation = r1(ck.elevation + ck.height + hoodMinDistance(hood));
      hood.config.hoodAuto = false; // keep the raised position instead of re-aligning to the cabinets
      break;
    }
    case 'sync_corner': {
      // every corner adopts the run depth so its front is flush
      const depth = baseRunDepth(project.items);
      for (const it of items) if (it.kind === 'cabinet' && it.category === 'base' && it.subtype.includes('corner')) it.config.cornerDepth = depth;
      break;
    }
    case 'two_doors': {
      const it = byId(issue.itemIds[0]);
      it.config.doors = 2;
      it.config.opening = 'double';
      break;
    }
  }
  return items;
}
