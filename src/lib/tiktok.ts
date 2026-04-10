/** Ekstrak ID video numerik dari URL TikTok. */
export function getTiktokVideoId(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const pathOnly = input.trim().split(/[?#]/)[0] ?? "";
  const candidates = [
    pathOnly.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i),
    pathOnly.match(/\/video\/(\d+)/),
    pathOnly.match(/m\.tiktok\.com\/v\/(\d+)/i),
  ];
  for (const m of candidates) {
    if (m?.[1] && /^\d{8,22}$/.test(m[1])) return m[1];
  }
  return null;
}

/** URL embed resmi TikTok (iframe). */
export function getTiktokEmbedSrc(input: string | null | undefined): string | null {
  const id = getTiktokVideoId(input);
  if (!id) return null;
  return `https://www.tiktok.com/embed/v2/${id}`;
}
