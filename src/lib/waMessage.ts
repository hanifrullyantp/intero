export function buildLeadWhatsAppMessage(p: {
  name: string;
  whatsapp: string;
  city: string;
  needType: string;
  sizeEstimate?: string;
  budgetRange?: string;
  notes?: string;
  template?: string;
}): string {
  const template = p.template?.trim();
  if (template) {
    return renderLeadWhatsAppTemplate(template, p);
  }
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

function renderLeadWhatsAppTemplate(
  template: string,
  p: {
    name: string;
    whatsapp: string;
    city: string;
    needType: string;
    sizeEstimate?: string;
    budgetRange?: string;
    notes?: string;
  },
): string {
  const replace = (s: string, key: string, value: string) => s.split(key).join(value);
  let out = template;
  const sizeLine = p.sizeEstimate ? `Ukuran / estimasi: ${p.sizeEstimate}\n` : "";
  const budgetLine = p.budgetRange ? `Budget: ${p.budgetRange}\n` : "";
  const notesLine = p.notes ? `Catatan: ${p.notes}\n` : "";
  out = replace(out, "{{name}}", p.name);
  out = replace(out, "{{whatsapp}}", p.whatsapp);
  out = replace(out, "{{city}}", p.city);
  out = replace(out, "{{need_type}}", p.needType);
  out = replace(out, "{{size_estimate}}", p.sizeEstimate || "");
  out = replace(out, "{{budget_range}}", p.budgetRange || "");
  out = replace(out, "{{notes}}", p.notes || "");
  out = replace(out, "{{size_estimate_line}}", sizeLine);
  out = replace(out, "{{budget_range_line}}", budgetLine);
  out = replace(out, "{{notes_line}}", notesLine);
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export function whatsappUrl(phoneDigits: string, text: string): string {
  const num = phoneDigits.replace(/\D/g, "");
  const enc = encodeURIComponent(text);
  return `https://wa.me/${num}?text=${enc}`;
}
