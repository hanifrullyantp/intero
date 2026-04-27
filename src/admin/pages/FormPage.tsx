import { SaveBar } from "@/admin/SaveBar";
import { useAdmin } from "@/admin/adminContext";

export default function FormPage() {
  const { settings, setSettings } = useAdmin();
  const lf = settings.leadForm;
  const f = lf.fields;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-black mb-1">FORM — pengaturan popup lead</h1>
      <p className="text-sm text-gray-600 mb-6">
        Atur isi form, perilaku redirect WhatsApp, template pesan, dan nomor WhatsApp tujuan.
      </p>
      <SaveBar />

      <div className="space-y-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Judul form</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={lf.title}
              onChange={(e) =>
                setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, title: e.target.value } }))
              }
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Subjudul form</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={lf.subtitle}
              onChange={(e) =>
                setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, subtitle: e.target.value } }))
              }
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Label tombol submit</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={lf.submitButtonLabel}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  leadForm: { ...s.leadForm, submitButtonLabel: e.target.value },
                }))
              }
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Label tombol langsung WhatsApp (tanpa isi form)
            </label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={lf.skipButtonLabel}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  leadForm: { ...s.leadForm, skipButtonLabel: e.target.value },
                }))
              }
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            Teks disclaimer bawah form
          </label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm min-h-[64px]"
            value={lf.consentText}
            onChange={(e) =>
              setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, consentText: e.target.value } }))
            }
          />
        </div>

        <div className="space-y-3 rounded-xl border border-gray-100 p-4">
          <label className="flex items-start gap-2 text-sm font-medium text-navy-900 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 rounded border-gray-300"
              checked={lf.requireSubmitBeforeWhatsApp}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  leadForm: { ...s.leadForm, requireSubmitBeforeWhatsApp: e.target.checked },
                }))
              }
            />
            <span>
              Wajib isi field required sebelum ke WhatsApp
              <span className="block text-xs text-gray-500 font-normal">
                Jika tidak dicentang, user boleh klik tombol langsung ke WhatsApp tanpa isi form.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm font-medium text-navy-900 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 rounded border-gray-300"
              checked={lf.relinkBackToWhatsapp}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  leadForm: { ...s.leadForm, relinkBackToWhatsapp: e.target.checked },
                }))
              }
            />
            <span>
              Relink back ke WhatsApp saat form ditutup / timeout
              <span className="block text-xs text-gray-500 font-normal">
                Jika aktif, saat user menutup form atau diam terlalu lama, akan diarahkan ke WhatsApp.
              </span>
            </span>
          </label>

          <div className="max-w-[260px]">
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Timeout auto redirect (detik)
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={lf.autoRedirectAfterOpenSec}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  leadForm: {
                    ...s.leadForm,
                    autoRedirectAfterOpenSec: Math.max(0, Number(e.target.value || 0)),
                  },
                }))
              }
            />
            <p className="text-[11px] text-gray-500 mt-1">Isi 600 untuk 10 menit.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <TextInput
            label="Label nama"
            value={f.nameLabel}
            onChange={(v) => setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, nameLabel: v } } }))}
          />
          <TextInput
            label="Placeholder nama"
            value={f.namePlaceholder}
            onChange={(v) => setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, namePlaceholder: v } } }))}
          />
          <TextInput
            label="Label WhatsApp"
            value={f.whatsappLabel}
            onChange={(v) => setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, whatsappLabel: v } } }))}
          />
          <TextInput
            label="Placeholder WhatsApp"
            value={f.whatsappPlaceholder}
            onChange={(v) => setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, whatsappPlaceholder: v } } }))}
          />
          <TextInput
            label="Label kota"
            value={f.cityLabel}
            onChange={(v) => setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, cityLabel: v } } }))}
          />
          <TextInput
            label="Placeholder kota"
            value={f.cityPlaceholder}
            onChange={(v) => setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, cityPlaceholder: v } } }))}
          />
          <TextInput
            label="Label jenis kebutuhan"
            value={f.needTypeLabel}
            onChange={(v) => setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, needTypeLabel: v } } }))}
          />
          <TextInput
            label="Placeholder jenis kebutuhan"
            value={f.needTypePlaceholder}
            onChange={(v) => setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, needTypePlaceholder: v } } }))}
          />
          <TextInput
            label="Label ukuran estimasi"
            value={f.sizeEstimateLabel}
            onChange={(v) => setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, sizeEstimateLabel: v } } }))}
          />
          <TextInput
            label="Placeholder ukuran estimasi"
            value={f.sizeEstimatePlaceholder}
            onChange={(v) => setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, sizeEstimatePlaceholder: v } } }))}
          />
          <TextInput
            label="Label budget"
            value={f.budgetLabel}
            onChange={(v) => setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, budgetLabel: v } } }))}
          />
          <TextInput
            label="Placeholder budget"
            value={f.budgetPlaceholder}
            onChange={(v) => setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, budgetPlaceholder: v } } }))}
          />
          <TextInput
            label="Label upload referensi"
            value={f.referenceLabel}
            onChange={(v) => setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, referenceLabel: v } } }))}
          />
          <TextInput
            label="Label catatan"
            value={f.notesLabel}
            onChange={(v) => setSettings((s) => ({ ...s, leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, notesLabel: v } } }))}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Placeholder catatan</label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={f.notesPlaceholder}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                leadForm: { ...s.leadForm, fields: { ...s.leadForm.fields, notesPlaceholder: e.target.value } },
              }))
            }
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            Jenis kebutuhan (1 item per baris)
          </label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm min-h-[100px]"
            value={lf.needTypes.join("\n")}
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
            Budget range (1 item per baris)
          </label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm min-h-[100px]"
            value={lf.budgetRanges.join("\n")}
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

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Nomor WhatsApp tujuan (digit)
            </label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
              value={settings.contact.whatsapp}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  contact: { ...s.contact, whatsapp: e.target.value.replace(/[^\d]/g, "") },
                }))
              }
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            Template pesan WhatsApp setelah submit form
          </label>
          <p className="text-xs text-gray-500 mb-1">
            Variabel:{" "}
            <code>
              {"{{name}} {{whatsapp}} {{city}} {{need_type}} {{size_estimate}} {{budget_range}} {{notes}}"}
            </code>
            . Baris opsional otomatis:{" "}
            <code>{"{{size_estimate_line}} {{budget_range_line}} {{notes_line}}"}</code>.
          </p>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm font-mono min-h-[132px]"
            value={lf.submitMessageTemplate}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                leadForm: { ...s.leadForm, submitMessageTemplate: e.target.value },
              }))
            }
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            Pesan WhatsApp saat form ditutup / timeout
          </label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm min-h-[84px]"
            value={lf.dismissRedirectMessage}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                leadForm: { ...s.leadForm, dismissRedirectMessage: e.target.value },
              }))
            }
          />
        </div>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
      <input
        className="w-full rounded-lg border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
