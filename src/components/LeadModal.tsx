import React, { useState } from "react";
import { X } from "lucide-react";
import { useLeadModal } from "@/context/LeadModalContext";
import { usePublicSettings } from "@/context/PublicSettingsContext";
import { submitLead } from "@/lib/api";
import { trackFacebook } from "@/lib/tracking";
import { buildLeadWhatsAppMessage, whatsappUrl } from "@/lib/waMessage";
import { Button } from "@/components/ui";
import { cn } from "@/utils/cn";

export function LeadModal() {
  const { isOpen, close } = useLeadModal();
  const { settings } = usePublicSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const whatsapp = String(fd.get("whatsapp") || "").trim();
    const city = String(fd.get("city") || "").trim();
    const needType = String(fd.get("need_type") || "").trim();
    if (!name || !whatsapp || !city || !needType) {
      setError("Lengkapi nama, WhatsApp, kota, dan jenis kebutuhan.");
      return;
    }
    setBusy(true);
    try {
      await submitLead(fd);
      const leadName = settings.tracking.events.lead || "Lead";
      trackFacebook(leadName);
      const msg = buildLeadWhatsAppMessage({
        name,
        whatsapp,
        city,
        needType,
        sizeEstimate: String(fd.get("size_estimate") || "").trim() || undefined,
        budgetRange: String(fd.get("budget_range") || "").trim() || undefined,
        notes: String(fd.get("notes") || "").trim() || undefined,
      });
      const url = whatsappUrl(settings.contact.whatsapp, msg);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim");
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Tutup"
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm landing-modal-backdrop-in"
        onClick={() => !busy && close()}
      />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-3 pointer-events-none">
        <div
          role="dialog"
          aria-modal
          className="pointer-events-auto w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl landing-modal-panel-in"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-black text-navy-900">Konsultasi gratis</h2>
              <p className="text-sm text-gray-500 mt-1">Isi form — kami arahkan ke WhatsApp.</p>
            </div>
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              onClick={() => !busy && close()}
            >
              <X size={22} />
            </button>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Nama" name="name" required />
            <Field label="WhatsApp" name="whatsapp" required placeholder="08..." />
            <Field label="Kota" name="city" required />
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Jenis kebutuhan</label>
              <select
                name="need_type"
                required
                className="w-full min-h-[48px] rounded-xl border border-gray-200 px-3 py-3 text-base md:text-sm"
              >
                <option value="">Pilih</option>
                {settings.leadForm.needTypes.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Ukuran / estimasi meter (opsional)" name="size_estimate" />
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Budget range (opsional)
              </label>
              <select
                name="budget_range"
                className="w-full min-h-[48px] rounded-xl border border-gray-200 px-3 py-3 text-base md:text-sm"
              >
                <option value="">—</option>
                {settings.leadForm.budgetRanges.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Upload referensi (opsional)
              </label>
              <input
                name="reference"
                type="file"
                accept="image/*,.pdf"
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Catatan</label>
              <textarea
                name="notes"
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" variant="whatsapp" size="lg" className="w-full" disabled={busy}>
              {busy ? "Mengirim…" : "Kirim & buka WhatsApp"}
            </Button>
          </form>
          <p className="text-xs text-center text-gray-400 mt-4">
            Dengan mengirim, Anda menyetujui pemrosesan data sesuai kebijakan privasi kami.
          </p>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className={cn(
          "w-full min-h-[44px] rounded-xl border border-gray-200 px-3 py-2.5 text-base md:text-sm",
        )}
      />
    </div>
  );
}
