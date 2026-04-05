import { useAdmin } from "@/admin/adminContext";
import { SaveBar } from "@/admin/SaveBar";

export default function ContactPage() {
  const { settings, setSettings } = useAdmin();
  const c = settings.contact;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black mb-6">Kontak & sosial</h1>
      <SaveBar />
      <div className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">
          WhatsApp: nomor tanpa + (contoh 62812...). Dipakai untuk wa.me setelah form lead.
        </p>
        {(
          [
            ["whatsapp", "WhatsApp (digit)"],
            ["email", "Email"],
            ["address", "Alamat lengkap"],
            ["phoneDisplay", "Teks tampilan telepon"],
            ["instagramHandle", "Instagram / @handle"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={c[key]}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  contact: { ...s.contact, [key]: e.target.value },
                }))
              }
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            Sosial — satu baris: Label|URL
          </label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm font-mono h-28"
            value={settings.socialLinks.map((x) => `${x.label}|${x.url}`).join("\n")}
            onChange={(e) => {
              const socialLinks = e.target.value
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .map((line) => {
                  const [label, url = "#"] = line.split("|").map((x) => x.trim());
                  return { label: label || "Sosial", url: url || "#" };
                });
              setSettings((s) => ({ ...s, socialLinks }));
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            Jenis kebutuhan (form lead) — satu item per baris
          </label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm h-28"
            value={settings.leadForm.needTypes.join("\n")}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                leadForm: {
                  ...s.leadForm,
                  needTypes: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean),
                },
              }))
            }
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            Pilihan budget — satu per baris
          </label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm h-24"
            value={settings.leadForm.budgetRanges.join("\n")}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                leadForm: {
                  ...s.leadForm,
                  budgetRanges: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean),
                },
              }))
            }
          />
        </div>
      </div>
    </div>
  );
}
