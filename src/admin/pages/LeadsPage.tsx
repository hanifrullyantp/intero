import React, { useEffect, useState } from "react";
import { deleteLead, fetchLeads, type LeadRow } from "@/lib/api";

export default function LeadsPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setRows(await fetchLeads());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function exportCsv() {
    const headers = [
      "id",
      "created_at",
      "name",
      "whatsapp",
      "city",
      "need_type",
      "size_estimate",
      "budget_range",
      "notes",
      "reference_path",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(
        headers
          .map((h) => {
            const v = String((r as unknown as Record<string, unknown>)[h] ?? "");
            return `"${v.replace(/"/g, '""')}"`;
          })
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `intero-leads-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-black">Leads</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium"
          >
            Muat ulang
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="px-4 py-2 rounded-lg bg-navy-900 text-white text-sm font-medium"
          >
            Export CSV
          </button>
        </div>
      </div>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="p-3">ID</th>
              <th className="p-3">Tanggal</th>
              <th className="p-3">Nama</th>
              <th className="p-3">WA</th>
              <th className="p-3">Kota</th>
              <th className="p-3">Kebutuhan</th>
              <th className="p-3">Ref</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-3">{r.id}</td>
                <td className="p-3 whitespace-nowrap">{r.created_at}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.whatsapp}</td>
                <td className="p-3">{r.city}</td>
                <td className="p-3 max-w-[140px] truncate" title={r.need_type}>
                  {r.need_type}
                </td>
                <td className="p-3">
                  {r.reference_path ? (
                    <a
                      href={r.reference_path}
                      className="text-blue-600 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      file
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    className="text-red-600 text-xs"
                    onClick={async () => {
                      if (!confirm("Hapus lead ini?")) return;
                      await deleteLead(r.id);
                      void load();
                    }}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
