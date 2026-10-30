// 3D Intero — AI Design Assistant Engine
// Parser lokal mengubah proyek langsung. Perintah yang tidak dikenali dikirim ke gateway server; kunci model tidak pernah ada di browser.
import { requestAiGateway } from '../ai/client';
import type { AiGatewayResult } from '../ai/gateway';
import { useStore } from '../store';
import type { CountertopType, DoorMaterial, FrameMaterialId, HandleType, ItemScope, ItemType } from '../types';
import { COLOR_PRESETS, TYPE_LABELS } from '../lib/constants';

export interface AiActionResult {
  reply: string;
  changed: boolean;
  actionsTaken: string[];
  gateway?: AiGatewayResult;
}

const COLOR_MAP: { keys: string[]; hex: string; name: string }[] = [
  { keys: ['putih', 'white', 'ivory', 'alabaster', 'susu'], hex: '#F5F2EB', name: 'Putih Hangat (Warm White)' },
  { keys: ['hitam', 'black', 'charcoal', 'arang', 'matte black', 'gelap'], hex: '#23262A', name: 'Charcoal Black' },
  { keys: ['kayu muda', 'oak', 'natural oak', 'jati muda', 'maple', 'ash'], hex: '#C9A97A', name: 'Natural Oak' },
  { keys: ['walnut', 'kayu tua', 'coklat tua', 'cokelat tua', 'jati tua', 'teak'], hex: '#6E4B32', name: 'Dark Walnut' },
  { keys: ['coklat', 'cokelat', 'wood', 'kayu'], hex: '#A97C50', name: 'Warm Teak Wood' },
  { keys: ['hijau', 'sage', 'green', 'mint', 'olive'], hex: '#7A8F7A', name: 'Sage Green' },
  { keys: ['biru', 'navy', 'blue', 'midnight'], hex: '#2B3A4A', name: 'Navy Blue' },
  { keys: ['abu', 'grey', 'gray', 'silver', 'beton', 'concrete'], hex: '#8A8F96', name: 'Cool Grey' },
  { keys: ['krem', 'cream', 'beige', 'sand', 'mocca', 'moka', 'latte'], hex: '#DDD3C2', name: 'Cream Sand' },
  { keys: ['emas', 'gold', 'brass', 'kuningan', 'champagne'], hex: '#C5A059', name: 'Brushed Gold' },
  { keys: ['merah', 'terracotta', 'maroon', 'burgundy'], hex: '#8C3B32', name: 'Terracotta' },
];

for (const p of COLOR_PRESETS) {
  COLOR_MAP.push({ keys: [p.name.toLowerCase()], hex: p.hex, name: p.name });
}

function findColor(text: string): { hex: string; name: string } | null {
  const hexMatch = text.match(/#([0-9a-fA-F]{6})\b/);
  if (hexMatch) return { hex: `#${hexMatch[1].toUpperCase()}`, name: `#${hexMatch[1].toUpperCase()}` };
  const lower = text.toLowerCase();
  for (const c of COLOR_MAP) {
    for (const k of c.keys) {
      if (lower.includes(k)) return { hex: c.hex, name: c.name };
    }
  }
  return null;
}

function parseLengthMm(text: string): number | null {
  const mMeter = text.match(/(\d+(?:[.,]\d+)?)\s*(?:meter|m\b)/i);
  if (mMeter) return Math.round(parseFloat(mMeter[1].replace(',', '.')) * 1000);
  const mCm = text.match(/(\d+(?:[.,]\d+)?)\s*cm\b/i);
  if (mCm) return Math.round(parseFloat(mCm[1].replace(',', '.')) * 10);
  const mMm = text.match(/(\d{3,4})\s*(?:mm)?\b/i);
  if (mMm) {
    const v = parseInt(mMm[1], 10);
    if (v >= 15 && v <= 350) return v * 10; // Jika user ketik "240" maksudnya 240 cm = 2400 mm
    return v;
  }
  const mSmall = text.match(/\b(\d{2,3})\b/);
  if (mSmall) {
    const v = parseInt(mSmall[1], 10);
    if (v >= 30 && v <= 350) return v * 10;
  }
  return null;
}

function detectScope(text: string): ItemScope {
  const l = text.toLowerCase();
  const hasTop = /(kabinet\s+atas|wall\s+cabinet|bagian\s+atas|lemari\s+atas|atas\s+saja)/i.test(l);
  const hasBot = /(kabinet\s+bawah|base\s+cabinet|bagian\s+bawah|lemari\s+bawah|bawah\s+saja)/i.test(l);
  if (hasTop && !hasBot) return 'wall';
  if (hasBot && !hasTop) return 'base';
  return 'all';
}

const SCOPE_NAME: Record<ItemScope, string> = {
  wall: 'kabinet atas (termasuk kulkas/hood/tall)',
  base: 'kabinet bawah',
  all: 'seluruh kabinet',
};

/** Eksekutor perintah natural language bahasa Indonesia secara lokal & deterministik. */
export function executeLocalAiCommand(prompt: string): AiActionResult {
  const st = useStore.getState();
  const text = prompt.trim();
  const lower = text.toLowerCase();
  const actions: string[] = [];

  // 1. Cek jika user meminta tambah komponen baru
  if (/(tambah|buatkan|masukkan|pasang|add|kasih)\b/i.test(lower)) {
    const addTypeMap: { pattern: RegExp; type: ItemType; dims: { w: number; h: number; d: number }; label: string }[] = [
      { pattern: /\b(island|meja\s+island|pulau)\b/i, type: 'island', dims: { w: 1600, h: 850, d: 850 }, label: 'Kitchen Island 160cm' },
      { pattern: /\b(minibar|mini\s+bar|meja\s+bar|bar)\b/i, type: 'bar', dims: { w: 1500, h: 1050, d: 550 }, label: 'Meja Minibar 150cm' },
      { pattern: /\b(kulkas|fridge|refrigerator)\b/i, type: 'fridge', dims: { w: 960, h: st.settings.globalCabinetHeight, d: 680 }, label: 'Kabinet Kulkas Side-by-Side' },
      { pattern: /\b(hood|cooker\s+hood|penghisap\s+asap|exhaust)\b/i, type: 'hood', dims: { w: 900, h: 750, d: 350 }, label: 'Kabinet Cooker Hood 90cm' },
      { pattern: /\b(sink|bak\s+cuci|wastafel|cuci\s+piring)\b/i, type: 'sink_base', dims: { w: 800, h: st.settings.baseHeight, d: 600 }, label: 'Base Kabinet Sink 80cm' },
      { pattern: /\b(kompor|cooktop|stove)\b/i, type: 'cooktop_base', dims: { w: 800, h: st.settings.baseHeight, d: 600 }, label: 'Base Kabinet Kompor 80cm' },
      { pattern: /\b(laci|drawer)\b/i, type: 'drawer_base', dims: { w: 600, h: st.settings.baseHeight, d: 600 }, label: 'Base Kabinet 3 Laci 60cm' },
      { pattern: /\b(dishwasher|mesin\s+cuci\s+piring)\b/i, type: 'dishwasher', dims: { w: 600, h: st.settings.baseHeight, d: 600 }, label: 'Dishwasher 60cm' },
      { pattern: /\b(elektronik|oven|microwave|dispenser|magic\s*com)\b/i, type: 'electronic', dims: { w: 650, h: st.settings.globalCabinetHeight, d: 600 }, label: 'Tall Kabinet Elektronik 65cm' },
      { pattern: /\b(tall|pantry|lemari\s+tinggi)\b/i, type: 'tall', dims: { w: 600, h: st.settings.globalCabinetHeight, d: 600 }, label: 'Tall Pantry Cabinet 60cm' },
      { pattern: /\b(sudut\s+atas|corner\s+wall)\b/i, type: 'corner_wall', dims: { w: 800, h: 750, d: 800 }, label: 'Corner Wall Cabinet L' },
      { pattern: /\b(sudut|corner)\b/i, type: 'corner_base', dims: { w: 900, h: st.settings.baseHeight, d: 900 }, label: 'Corner Base Cabinet L' },
      { pattern: /\b(kabinet\s+atas|wall\s+cabinet|lemari\s+atas)\b/i, type: 'wall', dims: { w: 800, h: 750, d: st.settings.wallDepth }, label: 'Wall Cabinet 80cm' },
      { pattern: /\b(kabinet\s+bawah|base\s+cabinet|lemari\s+bawah)\b/i, type: 'base', dims: { w: 800, h: st.settings.baseHeight, d: 600 }, label: 'Base Cabinet 80cm' },
    ];
    for (const entry of addTypeMap) {
      if (entry.pattern.test(lower)) {
        // Pastikan bukan instruksi menyalakan topi/lampu/cornice
        if (!/(topi|cornice|lampu|led|handle|warna|tinggi)/i.test(lower) || /(tambah\s+(?:kabinet|unit|meja|kulkas|island|bar|sink|kompor|laci|tall|pantry))/i.test(lower)) {
          const customW = parseLengthMm(lower);
          const dims = customW && customW >= 300 && customW <= 2400 ? { ...entry.dims, w: customW } : entry.dims;
          st.addItem({ type: entry.type, dims });
          actions.push(`Menambahkan ${entry.label} (${Math.round(dims.w / 10)} cm) ke desain`);
          break;
        }
      }
    }
  }

  // 2. Cornice / Topi Kabinet
  if (/(cornice|topi|mahkota|crown)/i.test(lower)) {
    const off = /(matikan|hapus|hilangkan|tanpa|off|nonaktif|jangan)/i.test(lower);
    const hMatch = lower.match(/(?:tinggi|tebal)\s*(?:topi|cornice)?\s*(\d+)/i);
    const corniceHeight = hMatch ? (parseInt(hMatch[1], 10) <= 20 ? parseInt(hMatch[1], 10) * 10 : parseInt(hMatch[1], 10)) : undefined;
    const withLight = /(lampu|led)/i.test(lower) ? true : undefined;
    st.applyScope('wall', {
      config: {
        cornice: !off,
        ...(corniceHeight ? { corniceHeight: Math.max(30, Math.min(150, corniceHeight)) } : {}),
        ...(withLight !== undefined ? { corniceLight: withLight } : {}),
      },
    });
    actions.push(off ? 'Menonaktifkan Cornice / Topi pada seluruh kabinet atas, kulkas, hood, dan tall' : `Mengaktifkan Cornice / Topi menerus${corniceHeight ? ` (${corniceHeight} mm)` : ''} pada seluruh kabinet atas, kulkas, cooker hood & corner`);
  }

  // 3. Tinggi Total / Plafon / Tinggi Kabinet
  if (/(tinggi\s+total|tinggi\s+kabinet|tinggi\s+dapur|plafon|ceiling|tinggi\s+semua|ubah\s+tinggi|set\s+tinggi)/i.test(lower) && !/(topi|cornice|backsplash|base|bawah|toe\s*kick)/i.test(lower)) {
    const mm = parseLengthMm(lower);
    if (mm && mm >= 1800 && mm <= 3200) {
      st.setGlobalHeight(mm);
      actions.push(`Mengubah Tinggi Total Kabinet Global menjadi ${mm} mm (${(mm / 10).toFixed(0)} cm)`);
    }
  }

  // 4. Tinggi Kabinet Bawah (Base Height)
  if (/(tinggi\s+(?:kabinet\s+)?bawah|tinggi\s+base|tinggi\s+meja)/i.test(lower)) {
    const mm = parseLengthMm(lower);
    if (mm && mm >= 700 && mm <= 1050) {
      st.setSettings({ baseHeight: mm });
      const baseIds = st.items.filter((i) => ['base', 'sink_base', 'cooktop_base', 'drawer_base', 'dishwasher', 'corner_base'].includes(i.type)).map((i) => i.id);
      if (baseIds.length) st.patchItems(baseIds, { dims: { h: mm } }, false);
      actions.push(`Mengubah tinggi kabinet bawah (base) menjadi ${mm} mm (${(mm / 10).toFixed(0)} cm)`);
    }
  }

  // 5. Tinggi Backsplash / Gap
  if (/(backsplash|vägg|dinding\s+tengah|gap\s+atas)/i.test(lower)) {
    const mm = parseLengthMm(lower);
    if (mm && mm >= 150 && mm <= 900) {
      st.setBacksplashHeight(mm);
      actions.push(`Mengatur tinggi backsplash menjadi ${mm} mm (${(mm / 10).toFixed(0)} cm)`);
    }
    const c = findColor(lower);
    if (c) {
      st.setCountertop({ backsplashColor: c.hex, backsplash: true });
      actions.push(`Mengubah warna backsplash menjadi ${c.name} (${c.hex})`);
    }
  }

  // 6. Countertop / Top Table
  if (/(countertop|top\s*table|meja\s+dapur|granit|marmer|quartz|solid\s+surface)/i.test(lower)) {
    let ctType: CountertopType | null = null;
    if (/hitam|black|galaxy|granit\s+hitam/i.test(lower)) ctType = 'black_granite';
    else if (/putih|white|carrara|marmer\s+putih/i.test(lower)) ctType = 'carrara_marble';
    else if (/abu|grey|gray|beton|concrete/i.test(lower)) ctType = 'concrete_grey';
    else if (/kayu|wood|butcher|oak/i.test(lower)) ctType = 'wood_butcher';
    else if (/krem|cream|quartz|beige/i.test(lower)) ctType = 'cream_quartz';
    if (ctType) {
      st.setCountertop({ type: ctType });
      actions.push(`Mengubah material Top Table / Countertop ke ${ctType.replace('_', ' ')}`);
    }
  }

  // 7. Handle / Tarikan Pintu
  if (/(handle|tarikan|gagang|gola|push\s*to\s*open|knob)/i.test(lower)) {
    const scope = detectScope(lower);
    let hType: HandleType | null = null;
    if (/gola/i.test(lower)) hType = 'gola';
    else if (/(tanpa\s+handle|push|handleless|polos)/i.test(lower)) hType = 'push';
    else if (/\bj[\s-]?profile|\bj\s+pull|\bhandle\s+j\b/i.test(lower)) hType = 'j';
    else if (/knob|bulat/i.test(lower)) hType = 'knob';
    else if (/bar|batang|standar/i.test(lower)) hType = 'bar';

    const hColor = findColor(lower);
    if (hType || hColor) {
      st.applyScope(scope, {
        materials: {
          ...(hType ? { handleType: hType } : {}),
          ...(hColor ? { handleColor: hColor.hex } : {}),
        },
      });
      if (hType) actions.push(`Mengubah jenis handle ${SCOPE_NAME[scope]} menjadi ${hType.toUpperCase()}`);
      if (hColor) actions.push(`Mengubah warna handle menjadi ${hColor.name}`);
    }
  }

  // 8. Material Pintu (HPL, Duco, ACP, PVC, Glass, Solid Wood)
  if (/\b(hpl|duco|pvc|acp|solid\s*wood|kaca|glass\s*door)\b/i.test(lower)) {
    const scope = detectScope(lower);
    let dMat: DoorMaterial | null = null;
    if (/\bduco\b/i.test(lower)) dMat = 'Duco';
    else if (/\bhpl\b/i.test(lower)) dMat = 'HPL';
    else if (/\bacp\b/i.test(lower)) dMat = 'ACP';
    else if (/\bpvc\b/i.test(lower)) dMat = 'PVC';
    else if (/\bsolid\s*wood\b/i.test(lower)) dMat = 'Solid Wood';
    if (dMat) {
      st.applyScope(scope, { materials: { doorMaterial: dMat } });
      actions.push(`Mengubah material pintu ${SCOPE_NAME[scope]} menjadi ${dMat}`);
    }
    if (/(pintu\s+kaca|glass\s+door|kaca\s+frame)/i.test(lower)) {
      const off = /(matikan|tanpa|hapus|off|biasa)/i.test(lower);
      st.applyScope('wall', { config: { glassDoor: !off } });
      actions.push(off ? 'Mengembalikan pintu kabinet atas menjadi panel solid' : 'Mengaktifkan Pintu Kaca (Glass Door) pada kabinet atas');
    }
  }

  // 9. Warna Kabinet (Atas / Bawah / Semua / Terpilih)
  if (/(warna|cat|ganti\s+ke|ubah\s+ke|jadikan|buat\s+kabinet)/i.test(lower) && !/(backsplash|handle|tarikan|dinding\s+ruang|lantai)/i.test(lower)) {
    // Cek apakah user menyebutkan warna berbeda untuk atas dan bawah sekaligus
    const splitClauses = lower.split(/(?:,\s*|\s+dan\s+|\s+sedangkan\s+|\s+lalu\s+)/);
    let handledSplit = false;
    if (splitClauses.length > 1) {
      for (const cl of splitClauses) {
        const sc = detectScope(cl);
        const col = findColor(cl);
        if (col && sc !== 'all') {
          st.applyScope(sc, { materials: { doorColor: col.hex, bodyFollowsDoor: true, sidesFollowDoor: true } });
          actions.push(`Mengubah warna ${SCOPE_NAME[sc]} menjadi ${col.name} (${col.hex})`);
          handledSplit = true;
        }
      }
    }
    if (!handledSplit) {
      const col = findColor(lower);
      if (col) {
        if (/(terpilih|selected|ini\s+saja)/i.test(lower) && st.selectedIds.length > 0) {
          st.patchItems(st.selectedIds, { materials: { doorColor: col.hex } });
          actions.push(`Mengubah warna ${st.selectedIds.length} kabinet terpilih menjadi ${col.name} (${col.hex})`);
        } else {
          const scope = detectScope(lower);
          st.applyScope(scope, { materials: { doorColor: col.hex, bodyFollowsDoor: true, sidesFollowDoor: true } });
          actions.push(`Mengubah warna ${SCOPE_NAME[scope]} menjadi ${col.name} (${col.hex})`);
        }
      }
    }
  } else if (!actions.length) {
    // Jika hanya ketik misal "kabinet atas putih kabinet bawah oak" tanpa kata "warna"
    const col = findColor(lower);
    if (col && /(kabinet|lemari|pintu|dapur)/i.test(lower)) {
      const scope = detectScope(lower);
      st.applyScope(scope, { materials: { doorColor: col.hex, bodyFollowsDoor: true, sidesFollowDoor: true } });
      actions.push(`Mengubah warna ${SCOPE_NAME[scope]} menjadi ${col.name} (${col.hex})`);
    }
  }

  // 10. Lampu LED
  if (/(lampu|led|pencahayaan|lighting)/i.test(lower) && !/(cornice|topi)/i.test(lower)) {
    const off = /(matikan|off|hapus|tanpa)/i.test(lower);
    st.setLightsOn(!off);
    st.applyScope('all', { led: { underCabinet: !off, insideUpper: !off, plinth: !off } });
    actions.push(off ? 'Mematikan seluruh lampu LED kabinet' : 'Menyalakan lampu LED under-cabinet, interior, dan toe-kick (plinth)');
  }

  // 11. Buka / Tutup Pintu (Open Mode) / X-Ray / Explode / Dimensi / Mode Produksi
  if (/(buka\s+semua\s+pintu|open\s+mode|buka\s+pintu|buka\s+kabinet)/i.test(lower)) {
    st.setOpenMode(true);
    actions.push('Membuka seluruh pintu, laci, dan rak tarik (Open Mode ON)');
  } else if (/(tutup\s+semua\s+pintu|tutup\s+pintu|tutup\s+kabinet)/i.test(lower)) {
    st.setOpenMode(false);
    actions.push('Menutup seluruh pintu dan laci kabinet');
  }

  if (/(x-?ray|transparan|tembus\s+pandang)/i.test(lower)) {
    const off = /(matikan|off|normal)/i.test(lower);
    st.ui({ xray: !off });
    actions.push(!off ? 'Mengaktifkan mode X-Ray (pintu transparan)' : 'Menonaktifkan mode X-Ray');
  }

  if (/(tampilkan\s+ukuran|tampilkan\s+dimensi|munculkan\s+ukuran|lihat\s+ukuran|dimensi\s+on)/i.test(lower)) {
    st.setDim({ showDimensions: true });
    actions.push('Menampilkan label ukuran & garis dimensi pada viewport 3D');
  } else if (/(sembunyikan\s+ukuran|sembunyikan\s+dimensi|matikan\s+ukuran|dimensi\s+off)/i.test(lower)) {
    st.setDim({ showDimensions: false });
    actions.push('Menyembunyikan garis dimensi');
  }

  // 12. Material Rangka Produksi (Aluminium / Galvanis)
  if (/(rangka\s+aluminium|hollow\s+aluminium|ganti\s+aluminium)/i.test(lower)) {
    st.setFrame({ frameMaterial: 'aluminium' as FrameMaterialId });
    actions.push('Mengubah material rangka produksi menjadi Aluminium Hollow 1×1.5"');
  } else if (/(rangka\s+galvanis|besi\s+galvanis)/i.test(lower)) {
    const mat: FrameMaterialId = /0[.,]7/.test(lower) ? 'galvanis_07' : 'galvanis_08';
    st.setFrame({ frameMaterial: mat });
    actions.push(`Mengubah material rangka produksi menjadi Besi Galvanis (${mat === 'galvanis_07' ? '0.7 mm' : '0.8 mm'})`);
  }

  // 13. Double Stack / 2 Tier Kabinet Atas
  if (/(double\s*stack|2\s*tier|dua\s*tingkat|kabinet\s+atas\s+tingkat)/i.test(lower)) {
    const off = /(matikan|off|tanpa|1\s*tier|satu\s*tingkat)/i.test(lower);
    st.applyScope('wall', { config: { doubleStack: !off, upperTierHeight: 350 } });
    actions.push(off ? 'Mengubah kabinet atas menjadi 1 tingkat standar' : 'Mengaktifkan Double Stack (2 tingkat) pada seluruh kabinet atas');
  }

  // 14. Hapus item terpilih
  if (/(hapus\s+kabinet\s+ini|hapus\s+yang\s+dipilih|delete\s+selected)/i.test(lower) && st.selectedIds.length > 0) {
    const count = st.selectedIds.length;
    st.removeItems(st.selectedIds);
    actions.push(`Menghapus ${count} kabinet yang dipilih`);
  }

  // 15. Pindah ke Mode Produksi / HPP / Desain
  if (/(buka\s+mode\s+produksi|lihat\s+rangka|hitung\s+hpp|lihat\s+cutting\s+list)/i.test(lower)) {
    st.setAppMode('production');
    if (/hpp|biaya|harga/i.test(lower)) st.setProdTab('hpp');
    else if (/cutting|potong|panel/i.test(lower)) st.setProdTab('cutting');
    else st.setProdTab('rangka');
    actions.push('Membuka workspace Mode Produksi');
  } else if (/(kembali\s+ke\s+desain|mode\s+desain)/i.test(lower)) {
    st.setAppMode('design');
    actions.push('Kembali ke Mode Desain 3D');
  }

  if (actions.length > 0) {
    return {
      changed: true,
      actionsTaken: actions,
      reply: `Siap! Saya telah menerapkan perubahan berikut pada desain Anda:\n• ${actions.join('\n• ')}\n\nAnda bisa menekan **Undo (Ctrl+Z)** kapan saja jika ingin membatalkan.`,
    };
  }

  // Jika pertanyaan tentang ringkasan/estimasi proyek
  if (/(berapa|info|ringkasan|total|jumlah|ukuran\s+dapur|estimasi)/i.test(lower)) {
    const cur = useStore.getState();
    const counts = cur.items.reduce<Record<string, number>>((a, i) => { a[TYPE_LABELS[i.type]] = (a[TYPE_LABELS[i.type]] ?? 0) + 1; return a; }, {});
    const listStr = Object.entries(counts).map(([k, v]) => `${v}× ${k}`).join(', ') || 'Belum ada kabinet';
    return {
      changed: false,
      actionsTaken: [],
      reply: `**Ringkasan Proyek "${cur.projectName}":**\n• Total Komponen: **${cur.items.length} unit** (${listStr})\n• Tinggi Total Global: **${cur.settings.globalCabinetHeight} mm (${cur.settings.globalCabinetHeight / 10} cm)**\n• Tinggi Base: **${cur.settings.baseHeight} mm** | Backsplash/Gap: **${cur.settings.wallGap} mm**\n\nCoba ketik perintah seperti:\n• *"Aktifkan topi / cornice di semua kabinet atas"*\n• *"Ubah warna kabinet bawah jadi Walnut dan atas Putih"*\n• *"Ganti tinggi total kabinet jadi 260 cm"*`,
    };
  }

  return {
    changed: false,
    actionsTaken: [],
    reply: `Maaf, saya belum mengenali perintah spesifik tersebut secara lokal. Coba gunakan instruksi seperti:\n• *"Pasang cornice / topi di semua kabinet atas"*\n• *"Ganti warna kabinet bawah jadi Natural Oak"*\n• *"Ubah tinggi total kabinet menjadi 250 cm"*\n• *"Ganti handle jadi Gola dan nyalakan semua lampu LED"*\n• *"Tambahkan Kitchen Island 160 cm"*`,
  };
}

export async function executeAiWithLlmFallback(prompt: string): Promise<AiActionResult> {
  const local = executeLocalAiCommand(prompt);
  if (local.changed) return local;
  try {
    const gateway = await requestAiGateway(prompt);
    return { changed: false, actionsTaken: [], reply: gateway.message, gateway };
  } catch {
    return local;
  }
}
