/** Default mati. `localStorage.mobile_ux_v2 = '1'` memakai kerangka mobile baru. */
export const MOBILE_UX_V2_FLAG = 'mobile_ux_v2';

export function isMobileUxV2Enabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(MOBILE_UX_V2_FLAG) === '1';
  } catch {
    return false;
  }
}

export function setMobileUxV2Enabled(on: boolean) {
  try {
    localStorage.setItem(MOBILE_UX_V2_FLAG, on ? '1' : '0');
  } catch { /* ignore */ }
}
