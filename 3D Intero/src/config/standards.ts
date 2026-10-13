export const KITCHEN_STANDARDS = {
  base_cabinet: {
    default_height: 80,
    default_depth: 55,
    toe_kick_height: 10,
    toe_kick_depth: 5,
    standard_widths: [30, 40, 45, 50, 60, 70, 80, 90, 100, 120],
    min_width: 20,
    max_width: 120,
    countertop_thickness: [2, 3, 4],
    countertop_overhang_front: 2,
    countertop_overhang_side: 2,
  },
  wall_cabinet: {
    default_heights: [40, 60, 70, 80, 90],
    default_height: 70,
    default_depth: 33,
    gap_from_countertop: 50,
    distance_from_floor: 135,
    standard_widths: [30, 40, 45, 50, 60, 70, 80, 90, 100, 120],
  },
  tall_cabinet: {
    default_heights: [200, 210, 220, 240],
    default_depth: 55,
    standard_widths: [50, 60, 70, 80],
  },
  work_triangle: {
    sink_to_stove: { min: 120, max: 180 },
    stove_to_fridge: { min: 120, max: 270 },
    sink_to_fridge: { min: 120, max: 210 },
    total_perimeter: { min: 360, max: 660 },
  },
};

export const WARDROBE_STANDARDS = {
  default_depths: [55, 60],
  hanging_rod_height_long: 170,
  hanging_rod_height_short: 120,
  double_hang_top: 120,
  double_hang_bottom: 80,
  shelf_spacing: [30, 35, 40],
  drawer_heights: [15, 20, 25],
  min_width_per_door: 45,
  max_width_per_door: 65,
  sliding_door_overlap: 5,
};

export const TV_CABINET_STANDARDS = {
  default_heights: [40, 45, 50, 55, 60],
  default_depths: [35, 40, 45, 50],
  tv_sizes: {
    '32': { width: 73, height: 43 },
    '43': { width: 97, height: 57 },
    '50': { width: 112, height: 65 },
    '55': { width: 123, height: 72 },
    '65': { width: 145, height: 84 },
    '75': { width: 168, height: 97 },
    '85': { width: 190, height: 109 },
  } as Record<string, { width: number; height: number }>,
};

export const CONSTRUCTION_RULES = {
  max_shelf_span_18mm: 80,
  max_shelf_span_with_load: 60,
  back_panel_min_thickness: 4,
  door_gap: 0.2,
  drawer_side_gap: 1.3,
  cabinet_to_ceiling_min: 5,
  material_thicknesses: {
    plywood_18: 1.8,
    plywood_15: 1.5,
    plywood_12: 1.2,
    plywood_9: 0.9,
    plywood_4: 0.4,
    mdf_18: 1.8,
    particle_board_18: 1.8,
  } as Record<string, number>,
};

export const FURNITURE_TYPE_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  kitchen: { label: 'Kitchen Set', icon: '🍳', desc: 'Base, wall & tall cabinets with appliances' },
  tv: { label: 'TV Cabinet', icon: '📺', desc: 'Media console with floating wall units' },
  wardrobe: { label: 'Wardrobe', icon: '👔', desc: 'Full height closet with hanging & shelves' },
  bookshelf: { label: 'Bookshelf', icon: '📚', desc: 'Open shelving tower units' },
  storage: { label: 'Storage Cabinet', icon: '🗄️', desc: 'General purpose storage run' },
  custom: { label: 'Custom', icon: '✏️', desc: 'Start with an empty room' },
};

export const LAYOUT_LABELS: Record<string, { label: string; desc: string; sides: string[] }> = {
  I: { label: 'I-Shape', desc: 'Single straight wall', sides: ['Wall length'] },
  L: { label: 'L-Shape', desc: 'Two walls meeting at a corner', sides: ['Back wall (A)', 'Left wall (B)'] },
  U: { label: 'U-Shape', desc: 'Three walls', sides: ['Back wall (A)', 'Left wall (B)', 'Right wall (C)'] },
  parallel: { label: 'Parallel', desc: 'Two facing walls (galley)', sides: ['Back wall (A)', 'Front wall (B)', 'Aisle width'] },
  island: { label: 'Island', desc: 'Straight wall + island', sides: ['Back wall (A)', 'Island length', 'Aisle width'] },
};
