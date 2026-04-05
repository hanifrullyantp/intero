import { useAdmin } from "@/admin/adminContext";
import { SaveBar } from "@/admin/SaveBar";

function uid() {
  return `faq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function FaqPage() {
  const { settings, setSettings } = useAdmin();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-6">FAQ</h1>
      <SaveBar />
      <div className="space-y-6">
        {settings.faq.map((item, index) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400">Item {index + 1}</span>
              <button
                type="button"
                className="text-sm text-red-600"
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    faq: s.faq.filter((x) => x.id !== item.id),
                  }))
                }
              >
                Hapus
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Pertanyaan</label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={item.question}
                onChange={(e) => {
                  const q = e.target.value;
                  setSettings((s) => ({
                    ...s,
                    faq: s.faq.map((x) => (x.id === item.id ? { ...x, question: q } : x)),
                  }));
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Jawaban</label>
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm h-24"
                value={item.answer}
                onChange={(e) => {
                  const a = e.target.value;
                  setSettings((s) => ({
                    ...s,
                    faq: s.faq.map((x) => (x.id === item.id ? { ...x, answer: a } : x)),
                  }));
                }}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          className="px-4 py-2 rounded-xl border-2 border-dashed border-gray-300 text-sm font-bold text-gray-600 w-full hover:border-navy-900 hover:text-navy-900"
          onClick={() =>
            setSettings((s) => ({
              ...s,
              faq: [...s.faq, { id: uid(), question: "Pertanyaan baru", answer: "Jawaban..." }],
            }))
          }
        >
          + Tambah FAQ
        </button>
      </div>
    </div>
  );
}
