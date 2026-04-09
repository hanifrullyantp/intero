/** Anchor section promo / harga di landing. */
export const PRICE_SECTION_ID = "harga";

export function scrollToPriceSection() {
  const el = document.getElementById(PRICE_SECTION_ID);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (window.location.pathname !== "/") {
    window.location.href = `/#${PRICE_SECTION_ID}`;
  }
}
