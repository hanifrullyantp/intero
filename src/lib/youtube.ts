/** Ambil URL embed YouTube dari tautan watch / share / shorts / embed. */
export function getYoutubeEmbedSrc(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const u = input.trim();

  let id: string | null = null;
  const watch = u.match(/[?&]v=([\w-]{11})/);
  if (watch) id = watch[1]!;
  const short = u.match(/youtu\.be\/([\w-]{11})/);
  if (short) id = short[1]!;
  const embed = u.match(/youtube\.com\/embed\/([\w-]{11})/);
  if (embed) id = embed[1]!;
  const shorts = u.match(/youtube\.com\/shorts\/([\w-]{11})/);
  if (shorts) id = shorts[1]!;

  if (!id) return null;
  return `https://www.youtube.com/embed/${id}`;
}
