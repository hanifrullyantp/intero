import { useAdmin } from "@/admin/adminContext";

export function SaveBar() {
  const { save, saving, message, setMessage } = useAdmin();

  return (
    <div className="flex items-center gap-4 mb-6 flex-wrap">
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="px-6 py-2 rounded-xl bg-navy-900 text-white font-bold text-sm hover:bg-navy-800 disabled:opacity-50"
      >
        {saving ? "Menyimpan…" : "Simpan perubahan"}
      </button>
      {message && (
        <span
          className={`text-sm ${message.startsWith("Gagal") ? "text-red-600" : "text-green-600"}`}
        >
          {message}
        </span>
      )}
      <button
        type="button"
        className="text-sm text-gray-500 underline"
        onClick={() => setMessage(null)}
      >
        tutup pesan
      </button>
    </div>
  );
}
