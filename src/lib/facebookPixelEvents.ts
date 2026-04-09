/** Nama event standar Meta Pixel (fbq track) — pakai persis string ini agar cocok di Events Manager. */
export const FACEBOOK_STANDARD_EVENTS: { value: string; label: string }[] = [
  { value: "PageView", label: "PageView — tampilan halaman" },
  { value: "Lead", label: "Lead — kirim form / prospek" },
  { value: "Contact", label: "Contact — kontak / chat / pesan" },
  { value: "CompleteRegistration", label: "CompleteRegistration — registrasi selesai" },
  { value: "ViewContent", label: "ViewContent — lihat konten / produk" },
  { value: "InitiateCheckout", label: "InitiateCheckout — mulai checkout" },
  { value: "Purchase", label: "Purchase — pembelian" },
  { value: "Subscribe", label: "Subscribe — berlangganan" },
  { value: "SubmitApplication", label: "SubmitApplication — kirim aplikasi" },
  { value: "Schedule", label: "Schedule — jadwalkan" },
  { value: "FindLocation", label: "FindLocation — cari lokasi" },
  { value: "StartTrial", label: "StartTrial — mulai trial" },
  { value: "Donate", label: "Donate — donasi" },
  { value: "Search", label: "Search — pencarian" },
  { value: "AddToCart", label: "AddToCart — tambah ke keranjang" },
  { value: "AddPaymentInfo", label: "AddPaymentInfo — info pembayaran" },
];

export function coerceFacebookStandardEvent(
  raw: string | undefined,
  fallback: string,
): string {
  const t = (raw || "").trim();
  if (FACEBOOK_STANDARD_EVENTS.some((e) => e.value === t)) return t;
  return fallback;
}
