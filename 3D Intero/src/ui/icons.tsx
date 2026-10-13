// Premium icon set (lucide) — single source, no emojis in UI
import {
  MousePointer2, Hand, Orbit, ZoomIn, Move, RotateCw, ArrowLeftRight, LayoutGrid, AlignCenter,
  Ruler, Scissors, PaintBucket, Pipette, Copy, Clipboard, CopyPlus, Trash2, Layers, Eye, EyeOff,
  Lock, LockOpen, Plus, X, Search, Sun, Moon, Monitor, Sparkles, Settings, Box, Palette, Wrench,
  ChevronDown, ChevronRight, Play, Pause, SkipBack, SkipForward, Video, Hammer, Shapes, Circle,
  Square, Cylinder, Magnet, Maximize, Keyboard, PanelLeft, PanelRight, Calculator, Download, Group,
  Ungroup, Save, FolderOpen, Undo2, Redo2, Image, Receipt, FileText, FilePlus2, Star, Globe, Package,
  SlidersHorizontal, GripVertical, Flame, Droplets, Wind, Zap, Lightbulb, Tv, Wine, Crown, Minus,
  Info, Check, TriangleAlert, CircleAlert, DraftingCompass, DoorOpen, DoorClosed, Eraser, Files,
  ClipboardList, MoveHorizontal, PencilRuler, Rocket, Scaling, Building, Columns2, Grid2x2, Utensils,
  AirVent, CookingPot, Refrigerator, Library, Microwave, Axis3d, Focus, Scan, Crosshair, Home, Folder, Users,
  Table, Table2, Armchair, ArrowRight, ArrowLeft, Wand,
  type LucideIcon,
} from 'lucide-react';

export {
  MousePointer2, Hand, Orbit, ZoomIn, Move, RotateCw, ArrowLeftRight, LayoutGrid, AlignCenter,
  Ruler, Scissors, PaintBucket, Pipette, Copy, Clipboard, CopyPlus, Trash2, Layers, Eye, EyeOff,
  Lock, LockOpen, Plus, X, Search, Sun, Moon, Monitor, Sparkles, Settings, Box, Palette, Wrench,
  ChevronDown, ChevronRight, Play, Pause, SkipBack, SkipForward, Video, Hammer, Shapes, Circle,
  Square, Cylinder, Magnet, Maximize, Keyboard, PanelLeft, PanelRight, Calculator, Download, Group,
  Ungroup, Save, FolderOpen, Undo2, Redo2, Image, Receipt, FileText, FilePlus2, Star, Globe, Package,
  SlidersHorizontal, GripVertical, Flame, Droplets, Wind, Zap, Lightbulb, Tv, Wine, Crown, Minus,
  Info, Check, TriangleAlert, CircleAlert, DraftingCompass, DoorOpen, DoorClosed, Eraser, Files,
  ClipboardList, MoveHorizontal, PencilRuler, Rocket, Scaling, Building, Columns2, Grid2x2, Utensils,
  AirVent, CookingPot, Refrigerator, Library, Microwave, Axis3d, Focus, Scan, Crosshair, Home, Folder, Users,
  Table, Table2, Armchair, ArrowRight, ArrowLeft, Wand,
};
export type { LucideIcon };

/** Library entry id → premium icon (appliances & accessories) */
export const LIB_ICONS: Record<string, LucideIcon> = {
  app_cooktop_2: Flame, app_cooktop_4: Flame, app_cooktop_5: Flame,
  app_sink_single: Droplets, app_sink_double: Droplets, app_sink_15: Droplets,
  app_hood_slim: AirVent, app_hood_pyramid: AirVent, app_hood_t: AirVent,
  app_fridge: Refrigerator, app_oven: CookingPot, app_microwave: Microwave, app_dishwasher: Wind,
  acc_backsplash: LayoutGrid, acc_end_panel: Minus, acc_crown: Crown, acc_filler: MoveHorizontal,
  acc_led: Lightbulb, acc_wine: Wine, acc_open_shelving: AlignCenter, acc_tv: Tv,
  tv_console: Tv, tall_wardrobe: DoorClosed, tall_bookshelf: Library,
  int_dish_pullout: Layers, int_dish_wall: AlignCenter, int_spice_pullout: Library, int_trash_pullout: Trash2,
  int_gas_pullout: Flame, int_cutlery: Utensils,
  app_fridge_sbs: Refrigerator, tall_fridge_sbs: Refrigerator,
  tall_electro: Microwave,
  tall_dispenser: Droplets,
  fur_island: Table2, fur_bar: Table, fur_dining: Table, fur_chair: Armchair, fur_stool: Armchair, fur_trolley: Package,
};

export function LibIcon({ id, size = 18, color }: { id: string; size?: number; color?: string }) {
  const C = LIB_ICONS[id] ?? Box;
  return <C size={size} color={color} strokeWidth={1.8} />;
}
