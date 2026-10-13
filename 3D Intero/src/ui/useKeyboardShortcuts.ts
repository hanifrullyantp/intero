import { useEffect } from 'react';
import { useStore, persist, type ToolId } from '../core/store';
import { saveProjectFile } from '../core/projectManager';
import { uid } from '../config/library';
import { footprint } from '../utils/geometry';
import { CAMERA_PRESETS } from '../viewport/Viewport3D';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || t.isContentEditable;
      const s = useStore.getState();
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      if (ctrl && e.shiftKey && k === 't') { e.preventDefault(); const n = s.ui.theme === 'light' ? 'dark' : s.ui.theme === 'dark' ? 'system' : 'light'; s.setTheme(n); s.toast({ severity: 'info', message: `Theme: ${n}`, ttl: 1200 }); return; }
      if (ctrl && e.shiftKey && k === 'u') { e.preventDefault(); s.setUIMode(s.ui.uiMode === 'simple' ? 'advanced' : 'simple'); return; }
      if (ctrl && e.shiftKey && k === 'k') { e.preventDefault(); if (s.requireAdvanced('Component Builder')) s.setUI({ modal: 'builder' }); return; }
      if (ctrl && k === 'z') { e.preventDefault(); if (e.shiftKey) s.redo(); else s.undo(); return; }
      if (ctrl && k === 'y') { e.preventDefault(); s.redo(); return; }
      if (ctrl && k === 's') { e.preventDefault(); saveProjectFile(s.project); persist(s.project); s.toast({ severity: 'success', message: 'Project saved' }); return; }
      if (ctrl && k === 'n') { e.preventDefault(); s.setUI({ modal: 'magic' }); return; }
      if (ctrl && k === 'c') { if (!typing) { e.preventDefault(); s.copySelected(); } return; }
      if (ctrl && k === 'x') { if (!typing) { e.preventDefault(); s.cutSelected(); } return; }
      if (ctrl && k === 'v') { if (!typing) { e.preventDefault(); s.pasteClipboard(e.shiftKey); } return; }
      if (ctrl && k === 'd') { if (!typing) { e.preventDefault(); if (s.selectedIds.length) s.duplicateItems(s.selectedIds); } return; }
      if (ctrl && k === 'a' && !typing) { e.preventDefault(); s.select(s.project.items.map((i) => i.id)); return; }
      if (ctrl && k === 'g' && !typing) {
        e.preventDefault();
        if (e.shiftKey) {
          s.updateItems(s.selectedIds.map((id) => ({ id, patch: { groupId: null } })));
        } else if (s.selectedIds.length) {
          const g = { id: uid('grp'), name: `Group ${(s.project.groups ?? []).length + 1}` };
          s.setGroups([...(s.project.groups ?? []), g]);
          s.updateItems(s.selectedIds.map((id) => ({ id, patch: { groupId: g.id } })));
          s.toast({ severity: 'success', message: `${s.selectedIds.length} items grouped`, ttl: 1500 });
        }
        return;
      }
      if (typing) return;
      if (e.key === 'Escape') {
        if (s.ui.modal) s.setUI({ modal: null });
        else if (s.ui.tool !== 'select') s.setUI({ tool: 'select' });
        else if (s.ui.isolateIds) s.setUI({ isolateIds: null });
        else s.select([]);
        return;
      }
      if (s.ui.modal) return;

      // Shift+letter combos
      if (e.shiftKey && e.key === 'M') {
        if (s.requireAdvanced('mirror') && s.selectedIds.length) {
          s.updateItems(s.selectedIds.map((id) => {
            const it = s.project.items.find((i) => i.id === id)!;
            const f = footprint(it);
            return { id, patch: { x: Math.round((s.project.room.width - f.x - f.w) * 10) / 10, rotation: ((360 - it.rotation) % 360) as 0 | 90 | 180 | 270 } };
          }));
        }
        return;
      }
      if (e.shiftKey && e.key === 'A') { if (s.requireAdvanced('array')) s.setUI({ modal: 'array' }); return; }
      if (e.shiftKey && e.key === 'O') { s.setUI({ rightOpen: true, rightTab: 'open' }); return; }
      if (e.shiftKey && e.key === 'C') { s.toggleUI('leftOpen'); return; }
      if (e.shiftKey && e.key === 'Q' && s.selectedIds.length) {
        s.updateItems(s.selectedIds.map((id) => { const it = s.project.items.find((i) => i.id === id)!; return { id, patch: { rotation: ((it.rotation + 270) % 360) as 0 | 90 | 180 | 270 } }; }));
        return;
      }

      const toolKey = (id: ToolId) => { s.setUI({ tool: id }); };
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (s.selectedIds.length) { e.preventDefault(); s.removeItems(s.selectedIds); }
          break;
        case 'v': case 'V': toolKey('select'); break;
        case 'h': case 'H': toolKey('pan'); break;
        case 'o': case 'O': s.setUI({ viewMode: '3d' }); s.toast({ severity: 'info', message: 'Orbit: drag to rotate · right-drag to pan', ttl: 1500 }); break;
        case 'z': case 'Z': toolKey('zoom'); break;
        case 'm': case 'M': toolKey('move'); break;
        case 'r': case 'R': toolKey('rotate'); break;
        case 't': case 'T': s.setUI({ tool: s.ui.tool === 'measure' ? 'select' : 'measure', viewMode: s.ui.viewMode === '3d' ? 'split' : s.ui.viewMode }); break;
        case 'b': case 'B': toolKey('paint'); break;
        case 'i': case 'I': toolKey('eyedropper'); break;
        case 'l': case 'L': if (s.requireAdvanced('Layers')) s.setUI({ rightOpen: true, rightTab: 'layers' }); break;
        case 'a': case 'A': if (s.requireAdvanced('align')) s.setUI({ modal: 'align' }); break;
        case 'd': case 'D': if (s.selectedIds.length) s.duplicateItems(s.selectedIds); break;
        case 'f': case 'F': s.requestFit(); break;
        case 'g': case 'G': s.setUI({ tool: 'select' }); s.toast({ severity: 'info', message: 'Move: drag items on the plan (M for move tool)', ttl: 1500 }); break;
        case 'q': case 'Q':
          if (s.selectedIds.length) s.updateItems(s.selectedIds.map((id) => { const it = s.project.items.find((i) => i.id === id)!; return { id, patch: { rotation: ((it.rotation + 90) % 360) as 0 | 90 | 180 | 270 } }; }));
          break;
        case 'Tab':
          e.preventDefault();
          s.setUI({ viewMode: s.ui.viewMode === '2d' ? '3d' : s.ui.viewMode === '3d' ? '2d' : '2d' });
          break;
        case ' ':
          e.preventDefault();
          if (!e.repeat) s.toggleUI('rightOpen');
          break;
        case 'PageUp': case 'PageDown': {
          if (!s.selectedIds.length) return;
          e.preventDefault();
          const dz = (e.key === 'PageUp' ? 1 : -1) * (e.shiftKey ? 10 : 1);
          s.updateItems(s.selectedIds.map((id) => {
            const it = s.project.items.find((i) => i.id === id)!;
            return { id, patch: { elevation: Math.max(0, Math.min(s.project.room.ceilingHeight - it.height, Math.round((it.elevation + dz) * 10) / 10)) } };
          }));
          break;
        }
        case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown': {
          if (!s.selectedIds.length) return;
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          s.updateItems(s.selectedIds.map((id) => {
            const it = s.project.items.find((i) => i.id === id)!;
            return { id, patch: { x: Math.round((it.x + dx) * 10) / 10, y: Math.round((it.y + dy) * 10) / 10 } };
          }));
          break;
        }
        default: {
          const preset = CAMERA_PRESETS.find((p) => p.key === e.key);
          if (preset) s.setUI({ cameraPreset: preset.id, fitRequest: s.ui.fitRequest + 1, viewMode: s.ui.viewMode === '2d' || s.ui.viewMode === 'elevation' ? 'split' : s.ui.viewMode });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
