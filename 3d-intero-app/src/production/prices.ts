// 3D Intero — Daftar harga default (editable user, tersimpan di IndexedDB). Harga dalam Rupiah.
import type { PriceItem } from '../types';

export const SLOT_LABELS: Record<string, string> = {
  plywood18: 'Plywood 18 mm', hpl: 'HPL', acp: 'ACP 4 mm', hinge: 'Engsel', slide: 'Rel laci', handle: 'Handle',
};

export const DEFAULT_PRICES: PriceItem[] = [
  // ── Material papan
  { id: 'ply18_albasia', group: 'material', slot: 'plywood18', name: 'Plywood 18mm Albasia (hemat)', unit: 'lbr', price: 310000 },
  { id: 'ply18_meranti', group: 'material', slot: 'plywood18', name: 'Plywood 18mm Meranti', unit: 'lbr', price: 350000 },
  { id: 'ply18_premium', group: 'material', slot: 'plywood18', name: 'Multiplek 18mm Premium', unit: 'lbr', price: 420000 },
  { id: 'ply15', group: 'material', name: 'Plywood 15mm', unit: 'lbr', price: 280000 },
  { id: 'hdf5', group: 'material', name: 'HDF 5mm (back panel)', unit: 'lbr', price: 95000 },
  { id: 'hpl_eco', group: 'material', slot: 'hpl', name: 'HPL Ekonomis', unit: 'lbr', price: 180000 },
  { id: 'hpl_taco', group: 'material', slot: 'hpl', name: 'HPL TACO / Grasmerino', unit: 'lbr', price: 300000 },
  { id: 'hpl_premium', group: 'material', slot: 'hpl', name: 'HPL Premium motif kayu', unit: 'lbr', price: 450000 },
  { id: 'edge_pvc', group: 'material', name: 'Edge banding PVC', unit: 'm', price: 8000 },
  // ── Material rangka + ACP
  { id: 'acp_local', group: 'acp', slot: 'acp', name: 'ACP lokal 4mm 1220×2440', unit: 'lbr', price: 650000 },
  { id: 'acp_seven', group: 'acp', slot: 'acp', name: 'ACP Seven 4mm 1220×2440', unit: 'lbr', price: 850000 },
  { id: 'acp_alucobond', group: 'acp', slot: 'acp', name: 'ACP Alucobond 4mm 1220×2440', unit: 'lbr', price: 1200000 },
  { id: 'hollow40', group: 'acp', name: 'Hollow besi 40×40×1.8mm (6 m)', unit: 'btg', price: 95000 },
  { id: 'hollow20', group: 'acp', name: 'Hollow besi 20×20 (6 m)', unit: 'btg', price: 48000 },
  // ── Hardware
  { id: 'hinge_local', group: 'hardware', slot: 'hinge', name: 'Engsel soft-close lokal', unit: 'pcs', price: 25000 },
  { id: 'hinge_blum', group: 'hardware', slot: 'hinge', name: 'Engsel soft-close Blum/Hettich', unit: 'pcs', price: 85000 },
  { id: 'hinge168', group: 'hardware', name: 'Engsel 168° corner', unit: 'pcs', price: 95000 },
  { id: 'slide_local', group: 'hardware', slot: 'slide', name: 'Rel laci teleskopik soft-close', unit: 'pair', price: 120000 },
  { id: 'slide_blum', group: 'hardware', slot: 'slide', name: 'Rel laci undermount Blum', unit: 'pair', price: 180000 },
  { id: 'handle_alu', group: 'hardware', slot: 'handle', name: 'Handle bar aluminum 128mm', unit: 'pcs', price: 25000 },
  { id: 'handle_ss', group: 'hardware', slot: 'handle', name: 'Handle bar stainless 128mm', unit: 'pcs', price: 65000 },
  { id: 'pushopen', group: 'hardware', name: 'Push-to-open mechanism', unit: 'pcs', price: 35000 },
  { id: 'pin', group: 'hardware', name: 'Shelf support pin', unit: 'pcs', price: 500 },
  { id: 'confirmat', group: 'hardware', name: 'Confirmat screw', unit: 'pcs', price: 500 },
  { id: 'dowel', group: 'hardware', name: 'Dowel 8×30', unit: 'pcs', price: 100 },
  { id: 'screw_dw', group: 'hardware', name: 'Screw drywall 4×30', unit: 'pcs', price: 150 },
  { id: 'glue_yellow', group: 'hardware', name: 'Lem kuning (Aica Aibon)', unit: 'kaleng', price: 85000 },
  { id: 'glue_white', group: 'hardware', name: 'Lem putih Fox', unit: 'kg', price: 38000 },
  { id: 'elbow', group: 'hardware', name: 'Elbow bracket siku 90°', unit: 'pcs', price: 3500 },
  { id: 'bolt_m8', group: 'hardware', name: 'Mur baut M8', unit: 'pcs', price: 2500 },
  { id: 'screw_acp', group: 'hardware', name: 'Sekrup self-tapping ACP', unit: 'pcs', price: 600 },
  { id: 'weld_rod', group: 'hardware', name: 'Kawat las', unit: 'kg', price: 45000 },
  { id: 'silicone', group: 'hardware', name: 'Silicone sealant (per meter tepi)', unit: 'm', price: 4500 },
  { id: 'anchor', group: 'hardware', name: 'Anchor fisher 10mm', unit: 'pcs', price: 3500 },
  { id: 'acc_dish', group: 'hardware', name: 'Rak piring tarik 2 susun', unit: 'set', price: 650000 },
  { id: 'acc_spice', group: 'hardware', name: 'Rak bumbu tarik', unit: 'set', price: 350000 },
  { id: 'acc_gas', group: 'hardware', name: 'Rak gas tarik', unit: 'set', price: 550000 },
  { id: 'acc_cutlery', group: 'hardware', name: 'Laci tatakan sendok', unit: 'set', price: 400000 },
  { id: 'acc_trash', group: 'hardware', name: 'Pull-out trash bin', unit: 'set', price: 750000 },
  { id: 'acc_lazy', group: 'hardware', name: 'Lazy Susan corner', unit: 'set', price: 1400000 },
  { id: 'acc_magiccom_tray', group: 'hardware', name: 'Tray magic com rel teleskopik', unit: 'set', price: 450000 },
  // ── Appliance
  { id: 'app_cooktop', group: 'appliance', name: 'Kompor tanam 4 tungku', unit: 'pcs', price: 2500000 },
  { id: 'app_oven', group: 'appliance', name: 'Oven built-in', unit: 'pcs', price: 7500000 },
  { id: 'app_microwave', group: 'appliance', name: 'Microwave built-in', unit: 'pcs', price: 4500000 },
  { id: 'app_dispenser', group: 'appliance', name: 'Dispenser built-in', unit: 'pcs', price: 3500000 },
  { id: 'app_magiccom', group: 'appliance', name: 'Magic com', unit: 'pcs', price: 900000 },
  { id: 'app_coffee', group: 'appliance', name: 'Coffee machine built-in', unit: 'pcs', price: 9000000 },
  { id: 'app_sink', group: 'appliance', name: 'Sink stainless 2-bowl', unit: 'pcs', price: 1200000 },
  { id: 'app_faucet', group: 'appliance', name: 'Faucet', unit: 'pcs', price: 450000 },
  { id: 'app_hood', group: 'appliance', name: 'Cooker hood', unit: 'pcs', price: 2800000 },
  { id: 'app_dishwasher', group: 'appliance', name: 'Dishwasher built-in', unit: 'pcs', price: 6500000 },
  { id: 'app_fridge', group: 'appliance', name: 'Kulkas (isi harga aktual)', unit: 'pcs', price: 12000000 },
  // ── LED
  { id: 'led_strip', group: 'led', name: 'LED strip 5m 12V', unit: 'roll', price: 85000 },
  { id: 'led_driver', group: 'led', name: 'LED driver 60W', unit: 'pcs', price: 125000 },
  { id: 'led_sensor', group: 'led', name: 'Sensor pintu magnetic', unit: 'pcs', price: 45000 },
  // ── Jasa
  { id: 'jasa_finishing', group: 'jasa', name: 'Jasa finishing HPL', unit: 'm²', price: 150000 },
  { id: 'jasa_assembly', group: 'jasa', name: 'Jasa assembly per cabinet', unit: 'unit', price: 75000 },
  { id: 'jasa_welding', group: 'jasa', name: 'Jasa welding rangka', unit: 'm', price: 35000 },
  { id: 'jasa_powder', group: 'jasa', name: 'Jasa powder coating', unit: 'm²', price: 85000 },
  { id: 'jasa_install', group: 'jasa', name: 'Jasa pasang di lokasi', unit: 'hari', price: 350000 },
  // ── Overhead
  { id: 'oh_transport', group: 'overhead', name: 'Transport pengiriman', unit: 'trip', price: 500000 },
  { id: 'oh_konsumsi', group: 'overhead', name: 'Konsumsi tukang', unit: 'hari', price: 100000 },
  // ── Countertop (per m²)
  { id: 'ct_granit_hitam', group: 'countertop', name: 'Countertop Granit Hitam', unit: 'm²', price: 1200000 },
  { id: 'ct_granit_putih', group: 'countertop', name: 'Countertop Granit Putih', unit: 'm²', price: 1100000 },
  { id: 'ct_granit_grey', group: 'countertop', name: 'Countertop Granit Grey', unit: 'm²', price: 1000000 },
  { id: 'ct_marble_putih', group: 'countertop', name: 'Countertop Marble Putih', unit: 'm²', price: 2400000 },
  { id: 'ct_marble_hitam', group: 'countertop', name: 'Countertop Marble Hitam', unit: 'm²', price: 2600000 },
  { id: 'ct_carrara', group: 'countertop', name: 'Countertop Carrara', unit: 'm²', price: 2800000 },
  { id: 'ct_calacatta', group: 'countertop', name: 'Countertop Calacatta', unit: 'm²', price: 3500000 },
  { id: 'ct_quartz_white', group: 'countertop', name: 'Countertop Quartz White', unit: 'm²', price: 1800000 },
  { id: 'ct_quartz_grey', group: 'countertop', name: 'Countertop Quartz Grey', unit: 'm²', price: 1700000 },
  { id: 'ct_quartz_black', group: 'countertop', name: 'Countertop Quartz Black', unit: 'm²', price: 1900000 },
  { id: 'ct_solid_surface', group: 'countertop', name: 'Countertop Solid Surface', unit: 'm²', price: 2200000 },
  { id: 'ct_butcher_block', group: 'countertop', name: 'Countertop Butcher Block', unit: 'm²', price: 1500000 },
  { id: 'ct_hpl', group: 'countertop', name: 'Countertop HPL', unit: 'm²', price: 450000 },
  { id: 'tile_backsplash', group: 'countertop', name: 'Backsplash tile subway', unit: 'm²', price: 225000 },
];

export const SLOTS_STANDAR: Record<string, string> = { plywood18: 'ply18_meranti', hpl: 'hpl_taco', acp: 'acp_seven', hinge: 'hinge_local', slide: 'slide_local', handle: 'handle_alu' };
export const SLOTS_HEMAT: Record<string, string> = { plywood18: 'ply18_albasia', hpl: 'hpl_eco', acp: 'acp_local', hinge: 'hinge_local', slide: 'slide_local', handle: 'handle_alu' };
export const SLOTS_PREMIUM: Record<string, string> = { plywood18: 'ply18_premium', hpl: 'hpl_premium', acp: 'acp_alucobond', hinge: 'hinge_blum', slide: 'slide_blum', handle: 'handle_ss' };

export const DEFAULT_TERMS = [
  '1. Harga berlaku 14 hari sejak tanggal penawaran.',
  '2. Pembayaran: DP 50% saat persetujuan desain, pelunasan 50% sebelum pemasangan.',
  '3. Ukuran final mengikuti pengukuran ulang di lokasi; selisih ukuran dapat mempengaruhi harga.',
  '4. Garansi konstruksi 1 tahun; tidak mencakup kerusakan akibat air berlebih atau pemakaian tidak wajar.',
  '5. Estimasi pengerjaan 21–30 hari kerja setelah DP dan desain disetujui.',
].join('\n');
