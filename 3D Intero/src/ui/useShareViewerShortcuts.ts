import { useEffect } from 'react';
import { useStore } from '../core/store';
import { CAMERA_PRESETS } from '../viewport/Viewport3D';

/** View-only navigation: orbit / pan / zoom / camera presets / fit */
export function useShareViewerShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if (s.ui.accessMode !== 'view') return;
      const t = e.target as HTMLElement;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable) return;

      const k = e.key.toLowerCase();
      if (k === 'f') { e.preventDefault(); s.requestFit(); return; }
      if (k === 'h') { s.setUI({ tool: 'pan' }); return; }
      if (k === 'o') { s.setUI({ tool: 'orbit', viewMode: '3d' }); return; }
      if (k === 'z') { s.setUI({ tool: 'zoom' }); return; }

      const preset = CAMERA_PRESETS.find((p) => p.key === e.key);
      if (preset) {
        s.setUI({
          cameraPreset: preset.id,
          fitRequest: s.ui.fitRequest + 1,
          viewMode: '3d',
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
