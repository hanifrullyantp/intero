import { getYoutubeEmbedSrc } from "@/lib/youtube";
import { getTiktokEmbedSrc } from "@/lib/tiktok";

export type GalleryVideoKind = "youtube" | "tiktok";

export function getGalleryVideoEmbedSrc(url: string | null | undefined): {
  src: string;
  kind: GalleryVideoKind;
} | null {
  const yt = getYoutubeEmbedSrc(url);
  if (yt) return { src: yt, kind: "youtube" };
  const tk = getTiktokEmbedSrc(url);
  if (tk) return { src: tk, kind: "tiktok" };
  return null;
}
