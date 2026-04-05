export function buildLeadWhatsAppMessage(p: {
  name: string;
  whatsapp: string;
  city: string;
  needType: string;
  sizeEstimate?: string;
  budgetRange?: string;
  notes?: string;
}): string {
  const lines = [
    "Halo, saya tertarik konsultasi Intero / WOCENSA.",
    `Nama: ${p.name}`,
    `WhatsApp: ${p.whatsapp}`,
    `Kota: ${p.city}`,
    `Kebutuhan: ${p.needType}`,
  ];
  if (p.sizeEstimate) lines.push(`Ukuran / estimasi: ${p.sizeEstimate}`);
  if (p.budgetRange) lines.push(`Budget: ${p.budgetRange}`);
  if (p.notes) lines.push(`Catatan: ${p.notes}`);
  return lines.join("\n");
}

export function whatsappUrl(phoneDigits: string, text: string): string {
  const num = phoneDigits.replace(/\D/g, "");
  const enc = encodeURIComponent(text);
  return `https://wa.me/${num}?text=${enc}`;
}
