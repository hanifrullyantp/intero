// 3D Intero — Peluncur sesi AR/VR (dipanggil langsung dari klik pengguna agar izin WebXR valid)
import { sceneRef } from '../editor/Viewport';
import { startAR, type ArMode } from '../../xr/ar';
import { startVR } from '../../xr/vr';
import { useStore } from '../../store';
import { toast } from '../ui';
import { ArStartError } from '../../xr/ar-session';

export async function launchAR(mode: ArMode) {
  const ctl = sceneRef.current; const s = useStore.getState();
  if (!ctl) { toast('Viewport belum siap', 'error'); return; }
  let pins: { a: NonNullable<typeof s.arPins.a>; b: NonNullable<typeof s.arPins.b> } | null = null;
  if (mode === 'twopoint') {
    if (!s.arPins.a || !s.arPins.b) { toast('Tentukan Titik A dan Titik B terlebih dahulu', 'warning'); return; }
    pins = { a: s.arPins.a, b: s.arPins.b };
  }
  s.ui({ showAr: false });
  try { await startAR(ctl, mode, pins); }
  catch (e) {
    toast(`AR gagal dimulai: ${(e as Error).message}`, 'error');
    if (e instanceof ArStartError) useStore.getState().ui({ showArFallback: true });
  }
}

export async function launchVR() {
  const ctl = sceneRef.current;
  if (!ctl) { toast('Viewport belum siap', 'error'); return; }
  useStore.getState().ui({ showAr: false });
  try { await startVR(ctl); } catch (e) { toast(`VR gagal dimulai: ${(e as Error).message}`, 'error'); }
}
