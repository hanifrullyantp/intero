import { useAdmin } from "@/admin/adminContext";
import { SaveBar } from "@/admin/SaveBar";
import type { SiteSettings } from "@/types/site-settings";

const STAGE_COLORS = ["slate", "blue", "amber", "purple", "green", "red", "pink", "cyan"];

export default function CrmSettingsPage() {
  const { settings, setSettings } = useAdmin();
  const crm = settings.crm;

  function patchCrm(fn: (c: SiteSettings["crm"]) => SiteSettings["crm"]) {
    setSettings((s) => ({ ...s, crm: fn(s.crm) }));
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-black mb-1">CRM — kategori & template WA</h1>
      <p className="text-sm text-gray-600 mb-6">
        Atur kategori konsumen, tahap pipeline (kolom Kanban), dan isi pesan untuk tombol follow-up{" "}
        <strong>W / 1–5</strong>. Variabel:{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">
          {"{{name}} {{city}} {{whatsapp}} {{need_type}} {{budget_range}} {{size_estimate}} {{notes}}"}
        </code>
      </p>
      <SaveBar />

      <div className="space-y-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
            Kategori konsumen (satu per baris)
          </label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm font-mono min-h-[120px]"
            value={crm.categories.join("\n")}
            onChange={(e) =>
              patchCrm((c) => ({
                ...c,
                categories: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean),
              }))
            }
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
            Tahap pipeline — format per baris: <code>key|Label tampilan|warna</code>
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Warna: {STAGE_COLORS.join(", ")} (untuk badge di list & kartu Kanban).
          </p>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm font-mono min-h-[140px]"
            value={crm.pipelineStages.map((s) => `${s.key}|${s.label}|${s.color}`).join("\n")}
            onChange={(e) => {
              const pipelineStages = e.target.value
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .map((line) => {
                  const [key, label, color = "slate"] = line.split("|").map((x) => x.trim());
                  return {
                    key: key || "tahap",
                    label: label || key || "Tahap",
                    color: STAGE_COLORS.includes(color) ? color : "slate",
                  };
                });
              patchCrm((c) => ({ ...c, pipelineStages }));
            }}
          />
        </div>

        <div>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
            Template follow-up WhatsApp (tombol bulat)
          </p>
          <div className="space-y-4">
            {crm.followUpSlots.map((slot, i) => (
              <div
                key={slot.key}
                className="rounded-xl border border-gray-100 p-4 bg-gray-50/80 space-y-2"
              >
                <div className="flex flex-wrap gap-3 items-center">
                  <span className="text-xs font-black text-orange-600 w-8">{slot.key}</span>
                  <input
                    className="flex-1 min-w-[120px] rounded-lg border px-2 py-1.5 text-sm"
                    placeholder="Label tombol (mis. W)"
                    value={slot.shortLabel}
                    onChange={(e) =>
                      patchCrm((c) => {
                        const followUpSlots = [...c.followUpSlots];
                        followUpSlots[i] = { ...followUpSlots[i]!, shortLabel: e.target.value };
                        return { ...c, followUpSlots };
                      })
                    }
                  />
                  <input
                    className="flex-[2] min-w-[200px] rounded-lg border px-2 py-1.5 text-sm"
                    placeholder="Judul internal"
                    value={slot.label}
                    onChange={(e) =>
                      patchCrm((c) => {
                        const followUpSlots = [...c.followUpSlots];
                        followUpSlots[i] = { ...followUpSlots[i]!, label: e.target.value };
                        return { ...c, followUpSlots };
                      })
                    }
                  />
                </div>
                <textarea
                  className="w-full rounded-lg border px-3 py-2 text-sm min-h-[72px]"
                  placeholder="Isi pesan WA…"
                  value={slot.messageTemplate}
                  onChange={(e) =>
                    patchCrm((c) => {
                      const followUpSlots = [...c.followUpSlots];
                      followUpSlots[i] = { ...followUpSlots[i]!, messageTemplate: e.target.value };
                      return { ...c, followUpSlots };
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
