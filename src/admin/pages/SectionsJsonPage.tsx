import React, { useEffect, useState } from "react";
import type { LandingSections } from "@/types/site-settings";
import { useAdmin } from "@/admin/adminContext";
import { SaveBar } from "@/admin/SaveBar";

export default function SectionsJsonPage() {
  const { settings, setSettings } = useAdmin();
  const [text, setText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(settings.sections, null, 2));
  }, [settings.sections]);

  function applyJson() {
    setParseError(null);
    try {
      const parsed = JSON.parse(text) as LandingSections;
      if (typeof parsed !== "object" || !parsed.hero) {
        throw new Error("Struktur tidak valid: perlu objek sections dengan hero, dll.");
      }
      setSettings((s) => ({ ...s, sections: parsed }));
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "JSON tidak valid");
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-black mb-2">Konten landing (semua section)</h1>
      <p className="text-sm text-gray-600 mb-4">
        Edit JSON di bawah lalu klik &quot;Terapkan ke draft&quot;. Setelah itu gunakan &quot;Simpan
        perubahan&quot; seperti biasa. Salin cadangan sebelum mengubah banyak hal.
      </p>
      <SaveBar />
      {parseError && <p className="text-sm text-red-600 mb-2">{parseError}</p>}
      <textarea
        className="w-full rounded-xl border border-gray-200 p-4 font-mono text-xs h-[min(70vh,600px)] bg-gray-50"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={applyJson}
          className="px-5 py-2 rounded-xl bg-gold-500 text-navy-900 font-bold text-sm"
        >
          Terapkan ke draft
        </button>
        <button
          type="button"
          onClick={() => setText(JSON.stringify(settings.sections, null, 2))}
          className="px-5 py-2 rounded-xl border border-gray-300 text-sm font-medium"
        >
          Reset dari tersimpan (undo edit teks)
        </button>
      </div>
    </div>
  );
}
