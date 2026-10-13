export const APPLIANCES = {
  sink: {
    single_bowl: { width: 50, depth: 40, min_cabinet_width: 60 },
    double_bowl: { width: 80, depth: 45, min_cabinet_width: 80 },
    one_half_bowl: { width: 70, depth: 45, min_cabinet_width: 70 },
  },
  cooktop: {
    two_burner: { width: 30, depth: 52 },
    four_burner: { width: 60, depth: 52 },
    five_burner: { width: 75, depth: 52 },
    freestanding: { widths: [50, 55, 60, 70, 80, 90], depth: 60 },
  },
  cooker_hood: {
    slim: { widths: [60, 70, 80, 90], depth: 45, height: 15 },
    pyramid: { widths: [60, 70, 80, 90], depth: 50, height: 45 },
    t_shape: { widths: [60, 90], depth: 50, height: 40 },
    island: { widths: [90, 100, 120], depth: 60, height: 50 },
    built_in: { widths: [52, 60, 70, 80, 90], depth: 28, height: 18 },
    min_distance_from_gas_cooktop: 65,
    min_distance_from_electric_cooktop: 55,
  },
  refrigerator: {
    one_door: { width: 55, depth: 60, heights: [140, 150, 160] },
    two_door: { widths: [60, 65, 70], depth: 65, heights: [160, 170, 180] },
    side_by_side: { widths: [85, 90, 95], depth: 70, heights: [170, 175, 180] },
  },
  oven: {
    built_in: { widths: [56, 60], depth: 55, height: 60 },
    microwave: { widths: [45, 50, 55, 60], depth: 35, heights: [25, 30, 35] },
  },
  dishwasher: {
    standard: { width: 60, depth: 55, height: 82 },
    slim: { width: 45, depth: 55, height: 82 },
  },
};

export const HOOD_TYPES: { id: 'slim' | 'pyramid' | 't_shape' | 'island' | 'built_in'; name: string; depth: number; height: number; widths: number[] }[] = [
  { id: 'slim', name: 'Slim', depth: 45, height: 15, widths: [60, 70, 80, 90] },
  { id: 'pyramid', name: 'Pyramid', depth: 50, height: 45, widths: [60, 70, 80, 90] },
  { id: 't_shape', name: 'T-Shape', depth: 50, height: 40, widths: [60, 90] },
  { id: 'island', name: 'Island', depth: 60, height: 50, widths: [90, 100, 120] },
  { id: 'built_in', name: 'Built-In', depth: 28, height: 18, widths: [52, 60, 70, 80, 90] },
];

export const APPLIANCE_PRICES: Record<string, number> = {
  sink_single: 850000,
  sink_double: 1600000,
  sink_one_half: 1300000,
  cooktop_2: 900000,
  cooktop_4: 2500000,
  cooktop_5: 3800000,
  hood: 2200000,
  fridge: 0,
  oven: 4500000,
  microwave: 1500000,
  dishwasher: 6500000,
};
