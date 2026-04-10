import { useAdmin } from "@/admin/adminContext";
import { SaveBar } from "@/admin/SaveBar";
import { uploadFile } from "@/lib/api";
import { FACEBOOK_STANDARD_EVENTS } from "@/lib/facebookPixelEvents";

export default function SeoPage() {
  const { settings, setSettings } = useAdmin();

  async function onOgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadFile(f);
      setSettings((s) => ({ ...s, seo: { ...s.seo, ogImageUrl: url } }));
    } catch {
      alert("Upload gagal");
    }
    e.target.value = "";
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black mb-6">SEO & tracking</h1>
      <SaveBar />
      <div className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Meta title</label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={settings.seo.metaTitle}
            onChange={(e) =>
              setSettings((s) => ({ ...s, seo: { ...s.seo, metaTitle: e.target.value } }))
            }
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Meta description</label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm h-24"
            value={settings.seo.metaDescription}
            onChange={(e) =>
              setSettings((s) => ({ ...s, seo: { ...s.seo, metaDescription: e.target.value } }))
            }
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Upload OG image</label>
          <p className="text-xs text-gray-500 mb-1">Saat ini: {settings.seo.ogImageUrl || "—"}</p>
          <input type="file" accept="image/*" onChange={(e) => void onOgUpload(e)} />
        </div>
        <div className="flex items-center gap-3">
          <input
            id="fb-on"
            type="checkbox"
            checked={settings.tracking.facebookPixelEnabled}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                tracking: { ...s.tracking, facebookPixelEnabled: e.target.checked },
              }))
            }
          />
          <label htmlFor="fb-on" className="text-sm font-medium">
            Aktifkan Facebook Pixel
          </label>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Facebook Pixel ID</label>
          <p className="text-xs text-gray-500 mb-1">
            Hanya angka (contoh: 288418147246485). Di Events Manager pastikan domain Anda terdaftar. Centang
            &quot;Aktifkan&quot; di atas lalu simpan. Meta Pixel Helper di Chrome membutuhkan halaman publik
            dimuat ulang setelah menyimpan; nonaktifkan pemblokir iklan untuk domain ini jika pixel tidak
            terbaca.
          </p>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
            inputMode="numeric"
            placeholder="288418147246485"
            value={settings.tracking.facebookPixelId}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                tracking: { ...s.tracking, facebookPixelId: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            Google Analytics ID (GA4, opsional)
          </label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={settings.tracking.googleAnalyticsId}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                tracking: { ...s.tracking, googleAnalyticsId: e.target.value },
              }))
            }
            placeholder="G-XXXXXXXX"
          />
        </div>
        <p className="text-sm font-bold text-gray-700">
          Nama event Pixel (pilih standar Meta — harus sama persis agar terbaca di Events Manager)
        </p>
        {(
          [
            ["pageView", "Saat buka halaman (default: PageView)"],
            ["contactClick", "Saat klik tombol pesan / ke blok harga / buka form"],
            ["lead", "Saat form terkirim & lanjut WhatsApp (default: Lead)"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
              value={settings.tracking.events[key]}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  tracking: {
                    ...s.tracking,
                    events: { ...s.tracking.events, [key]: e.target.value },
                  },
                }))
              }
            >
              {FACEBOOK_STANDARD_EVENTS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
