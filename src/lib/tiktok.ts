/** Ekstrak ID post numerik dari URL TikTok (video / foto). */
export function getTiktokVideoId(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const pathOnly = input.trim().split(/[?#]/)[0] ?? "";
  const candidates = [
    pathOnly.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i),
    pathOnly.match(/tiktok\.com\/@[^/]+\/photo\/(\d+)/i),
    pathOnly.match(/\/video\/(\d+)/),
    pathOnly.match(/m\.tiktok\.com\/v\/(\d+)/i),
  ];
  for (const m of candidates) {
    if (m?.[1] && /^\d{8,22}$/.test(m[1])) return m[1];
  }
  return null;
}

/**
 * Pemutar iframe resmi TikTok (bukan /embed/v2 — format itu sudah tidak dipakai untuk player penuh).
 * @see https://developers.tiktok.com/doc/embed-player
 */
export function getTiktokEmbedSrc(input: string | null | undefined): string | null {
  const id = getTiktokVideoId(input);
  if (!id) return null;
  return `https://www.tiktok.com/player/v1/${id}`;
}

/** Query untuk iframe setelah klik (mirip perilaku YouTube autoplay). */
export function tiktokPlayerQueryAfterClick(): string {
  const p = new URLSearchParams();
  p.set("autoplay", "1");
  p.set("muted", "0");
  return p.toString();
}
