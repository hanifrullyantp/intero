/** Ekstrak ID video numerik dari URL TikTok (format .../video/1234567890). */
export function getTiktokVideoId(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const u = input.trim();
  const m = u.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  return m ? m[1]! : null;
}

/** URL embed resmi TikTok (iframe). */
export function getTiktokEmbedSrc(input: string | null | undefined): string | null {
  const id = getTiktokVideoId(input);
  if (!id) return null;
  return `https://www.tiktok.com/embed/v2/${id}`;
}
