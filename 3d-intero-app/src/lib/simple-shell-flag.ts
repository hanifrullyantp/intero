import type { UiMode } from '../types';

/** Default mati. `localStorage.simple_shell_v1 = '1'` menyembunyikan alat manual saat Mode Simple. */
export const SIMPLE_SHELL_V1_FLAG = 'simple_shell_v1';

export function isSimpleShellV1Enabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(SIMPLE_SHELL_V1_FLAG) === '1';
  } catch {
    return false;
  }
}

export function isSimpleShellActive(uiMode: UiMode): boolean {
  return uiMode === 'simple' && isSimpleShellV1Enabled();
}
