import { useAdmin } from "@/admin/adminContext";
import { SaveBar } from "@/admin/SaveBar";
import { uploadFile } from "@/lib/api";

export default function GlobalPage() {
  const { settings, setSettings } = useAdmin();

  async function onUpload(kind: "logo" | "favicon", e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadFile(f);
      setSettings((s) => ({
        ...s,
        [kind === "logo" ? "logoUrl" : "faviconUrl"]: url,
      }));
    } catch {
      alert("Upload gagal");
    }
    e.target.value = "";
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black mb-6">Global & merek</h1>
      <SaveBar />
      <div className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <Field label="Nama situs">
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={settings.siteName}
            onChange={(e) => setSettings((s) => ({ ...s, siteName: e.target.value }))}
          />
        </Field>
        <Field label="Domain (untuk referensi / canonical)">
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={settings.domain}
            onChange={(e) => setSettings((s) => ({ ...s, domain: e.target.value }))}
            placeholder="https://..."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["Primary (brand)", "primary"],
              ["Navy", "navy"],
              ["Navy deep", "navyDeep"],
              ["Gold", "gold"],
              ["Gold light", "goldLight"],
            ] as const
          ).map(([label, key]) => (
            <Field key={key} label={label}>
              <input
                type="color"
                className="w-full h-10 rounded border"
                value={settings.brandColors[key]}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    brandColors: { ...s.brandColors, [key]: e.target.value },
                  }))
                }
              />
            </Field>
          ))}
        </div>
        <Field label="Font Google (opsional, nama saja, mis. Inter)">
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={settings.fontFamily || ""}
            onChange={(e) =>
              setSettings((s) => ({ ...s, fontFamily: e.target.value || null }))
            }
          />
        </Field>
        <Field label={`Logo — URL saat ini: ${settings.logoUrl || "—"}`}>
          <input type="file" accept="image/*" onChange={(e) => void onUpload("logo", e)} />
        </Field>
        <Field label={`Favicon — URL: ${settings.faviconUrl || "—"}`}>
          <input type="file" accept="image/*" onChange={(e) => void onUpload("favicon", e)} />
        </Field>
        <Field label="Navbar — label CTA">
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={settings.navbar.ctaLabel}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                navbar: { ...s.navbar, ctaLabel: e.target.value },
              }))
            }
          />
        </Field>
        <Field label="Navbar — tautan (satu baris: label|href, pisahkan baris)">
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm font-mono h-24"
            value={settings.navbar.links.map((l) => `${l.label}|${l.href}`).join("\n")}
            onChange={(e) => {
              const links = e.target.value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [label, href = "#"] = line.split("|").map((x) => x.trim());
                  return { label: label || "Link", href: href || "#" };
                });
              setSettings((s) => ({ ...s, navbar: { ...s.navbar, links } }));
            }}
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
