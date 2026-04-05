import { useAdmin } from "@/admin/adminContext";
import { SaveBar } from "@/admin/SaveBar";

export default function FooterPage() {
  const { settings, setSettings } = useAdmin();
  const f = settings.footer;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-6">Footer & privasi</h1>
      <SaveBar />
      <div className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Tagline / deskripsi singkat</label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm h-24"
            value={f.tagline}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                footer: { ...s.footer, tagline: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Jam kerja (teks)</label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={f.workingHours}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                footer: { ...s.footer, workingHours: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Baris copyright</label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={f.copyrightLine}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                footer: { ...s.footer, copyrightLine: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">URL Syarat & Ketentuan</label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={f.termsUrl}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                footer: { ...s.footer, termsUrl: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            Path halaman privasi (SPA route)
          </label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={f.privacyUrl}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                footer: { ...s.footer, privacyUrl: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            Menu footer — label|href per baris
          </label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm font-mono h-28"
            value={f.menuLinks.map((l) => `${l.label}|${l.href}`).join("\n")}
            onChange={(e) => {
              const menuLinks = e.target.value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [label, href = "#"] = line.split("|").map((x) => x.trim());
                  return { label: label || "Menu", href: href || "#" };
                });
              setSettings((s) => ({
                ...s,
                footer: { ...s.footer, menuLinks },
              }));
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            HTML halaman Kebijakan Privasi
          </label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm font-mono h-48"
            value={f.privacyPageHtml}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                footer: { ...s.footer, privacyPageHtml: e.target.value },
              }))
            }
          />
        </div>
      </div>
    </div>
  );
}
