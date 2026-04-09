import type { LeadRow } from "@/lib/api";

export function renderCrmWaTemplate(template: string, lead: LeadRow): string {
  const rep = (s: string, k: string, v: string) => s.split(k).join(v);
  let out = template;
  out = rep(out, "{{name}}", lead.name || "");
  out = rep(out, "{{city}}", lead.city || "");
  out = rep(out, "{{whatsapp}}", lead.whatsapp || "");
  out = rep(out, "{{need_type}}", lead.need_type || "");
  out = rep(out, "{{budget_range}}", lead.budget_range || "");
  out = rep(out, "{{size_estimate}}", lead.size_estimate || "");
  out = rep(out, "{{notes}}", lead.notes || "");
  return out;
}
