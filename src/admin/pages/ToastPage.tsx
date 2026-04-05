import { useAdmin } from "@/admin/adminContext";
import { SaveBar } from "@/admin/SaveBar";
import { uploadFile } from "@/lib/api";

export default function ToastPage() {
  const { settings, setSettings } = useAdmin();
  const t = settings.toast;

  async function onAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadFile(f);
      setSettings((s) => ({ ...s, toast: { ...s.toast, audioUrl: url } }));
    } catch {
      alert("Upload gagal");
    }
    e.target.value = "";
  }

  const listField = (
    label: string,
    value: string[],
    key: keyof typeof t,
  ) => (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
      <textarea
        className="w-full rounded-lg border px-3 py-2 text-sm h-24"
        value={value.join("\n")}
        onChange={(e) =>
          setSettings((s) => ({
            ...s,
            toast: {
              ...s.toast,
              [key]: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean),
            },
          }))
        }
      />
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black mb-6">Notifikasi toast</h1>
      <SaveBar />
      <div className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <input
            id="toast-en"
            type="checkbox"
            checked={t.enabled}
            onChange={(e) =>
              setSettings((s) => ({ ...s, toast: { ...s.toast, enabled: e.target.checked } }))
            }
          />
          <label htmlFor="toast-en">Aktifkan toast</label>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="toast-mute"
            type="checkbox"
            checked={t.muteDefault}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                toast: { ...s.toast, muteDefault: e.target.checked },
              }))
            }
          />
          <label htmlFor="toast-mute">Default pengunjung: bisu</label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Interval min (detik)</label>
            <input
              type="number"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={t.intervalMinSec}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  toast: { ...s.toast, intervalMinSec: Number(e.target.value) || 25 },
                }))
              }
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Interval max (detik)</label>
            <input
              type="number"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={t.intervalMaxSec}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  toast: { ...s.toast, intervalMaxSec: Number(e.target.value) || 45 },
                }))
              }
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Timezone (IANA)</label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={t.timezone}
            onChange={(e) =>
              setSettings((s) => ({ ...s, toast: { ...s.toast, timezone: e.target.value } }))
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Jam mulai (HH:MM)</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={t.activeHours.start}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  toast: {
                    ...s.toast,
                    activeHours: { ...s.toast.activeHours, start: e.target.value },
                  },
                }))
              }
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Jam akhir (HH:MM)</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={t.activeHours.end}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  toast: {
                    ...s.toast,
                    activeHours: { ...s.toast.activeHours, end: e.target.value },
                  },
                }))
              }
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Maks. toast per sesi</label>
          <input
            type="number"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={t.maxToastsPerSession}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                toast: {
                  ...s.toast,
                  maxToastsPerSession: Number(e.target.value) || 12,
                },
              }))
            }
          />
        </div>
        {listField("Template (placeholder: {{name}} {{action}} {{product}} {{city}})", t.actionTemplates, "actionTemplates")}
        {listField("Daftar nama", t.names, "names")}
        {listField("Daftar aksi / kalimat", t.actions, "actions")}
        {listField("Daftar produk", t.products, "products")}
        {listField("Daftar kota (opsional)", t.cities, "cities")}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            Audio kustom — kosongkan = suara sintetis. URL: {t.audioUrl || "default"}
          </label>
          <input type="file" accept="audio/*" onChange={(e) => void onAudio(e)} />
          <button
            type="button"
            className="mt-2 text-sm text-red-600 underline"
            onClick={() => setSettings((s) => ({ ...s, toast: { ...s.toast, audioUrl: null } }))}
          >
            Hapus audio kustom
          </button>
        </div>
      </div>
    </div>
  );
}
