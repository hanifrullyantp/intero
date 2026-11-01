import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../src/store';
import { isSimpleShellActive, isSimpleShellV1Enabled, SIMPLE_SHELL_V1_FLAG } from '../src/lib/simple-shell-flag';

afterEach(() => {
  try { localStorage.removeItem(SIMPLE_SHELL_V1_FLAG); } catch { /* node tanpa storage */ }
});

describe('simple shell', () => {
  it('flag mati secara default', () => {
    expect(isSimpleShellV1Enabled()).toBe(false);
    expect(isSimpleShellActive('simple')).toBe(false);
    expect(isSimpleShellActive('advanced')).toBe(false);
  });

  it('hanya hidup di Mode Simple', () => {
    const mem = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mem.get(key) ?? null,
      setItem: (key: string, value: string) => { mem.set(key, value); },
      removeItem: (key: string) => { mem.delete(key); },
    });
    localStorage.setItem(SIMPLE_SHELL_V1_FLAG, '1');
    expect(isSimpleShellActive('simple')).toBe(true);
    expect(isSimpleShellActive('advanced')).toBe(false);
    vi.unstubAllGlobals();
  });

  it('berpindah mode tidak mengubah item atau undo', () => {
    const before = useStore.getState();
    const mode = before.uiMode;
    before.setUiMode(mode === 'simple' ? 'advanced' : 'simple');
    const after = useStore.getState();
    expect(after.items).toBe(before.items);
    expect(after.walls).toBe(before.walls);
    expect(after.settings).toBe(before.settings);
    expect(after.past).toBe(before.past);
    expect(after.docPast).toBe(before.docPast);
    expect(after.uiMode).not.toBe(mode);
    after.setUiMode(mode);
  });
});
