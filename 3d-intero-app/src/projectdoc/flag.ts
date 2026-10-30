/** Default mati. Nilai localStorage `projectdoc_v1` = `1` mengaktifkan undo command log, autosave ProjectDoc, dan scene dari dokumen. */
export const PROJECTDOC_V1_FLAG = 'projectdoc_v1';

export function isProjectDocV1Enabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(PROJECTDOC_V1_FLAG) === '1';
  } catch {
    return false;
  }
}
