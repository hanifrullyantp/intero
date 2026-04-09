import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createLeadManual,
  deleteLead,
  fetchLeads,
  updateLead,
  type LeadRow,
} from "@/lib/api";
import { useAdmin } from "@/admin/adminContext";
import { renderCrmWaTemplate } from "@/lib/crmWaTemplate";
import { whatsappUrl } from "@/lib/waMessage";
import { cn } from "@/utils/cn";
import {
  LayoutGrid,
  List,
  Search,
  Download,
  Trash2,
  Settings2,
  Bell,
  Filter,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";

const STAGE_BADGE: Record<string, string> = {
  slate: "bg-slate-100 text-slate-800 border-slate-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  amber: "bg-amber-100 text-amber-900 border-amber-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
  green: "bg-green-100 text-green-800 border-green-200",
  red: "bg-red-100 text-red-800 border-red-200",
  pink: "bg-pink-100 text-pink-800 border-pink-200",
  cyan: "bg-cyan-100 text-cyan-800 border-cyan-200",
};

function leadStage(lead: LeadRow): string {
  return (lead.crm_status || "baru").trim() || "baru";
}

function parseLeadDate(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function inDateRange(createdAt: string, range: string): boolean {
  if (range === "all") return true;
  const days = range === "7" ? 7 : range === "30" ? 30 : 90;
  const ms = days * 24 * 60 * 60 * 1000;
  return Date.now() - parseLeadDate(createdAt) <= ms;
}

const emptyManual = () => ({
  name: "",
  whatsapp: "",
  city: "",
  need_type: "",
  size_estimate: "",
  budget_range: "",
  notes: "",
  crm_status: "baru",
  crm_category: "",
});

export default function LeadsPage() {
  const { settings } = useAdmin();
  const crm = settings.crm;
  const lf = settings.leadForm;
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [dateRange, setDateRange] = useState("30");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [dragId, setDragId] = useState<string | number | null>(null);
  const [notesDraft, setNotesDraft] = useState<{ id: string | number; text: string } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState(emptyManual);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualErr, setManualErr] = useState<string | null>(null);
  const [waInfoOpen, setWaInfoOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setRows(await fetchLeads());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!inDateRange(r.created_at, dateRange)) return false;
      if (categoryFilter !== "all" && (r.crm_category || "") !== categoryFilter) return false;
      if (!q) return true;
      const blob = [
        r.name,
        r.whatsapp,
        r.city,
        r.need_type,
        String(r.id),
        r.notes || "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rows, dateRange, search, categoryFilter]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const baru = filtered.filter((r) => leadStage(r) === "baru").length;
    const followed = filtered.filter((r) => (r.follow_up_count ?? 0) > 0).length;
    const deals = filtered.filter((r) => leadStage(r) === "deal").length;
    const rate = total ? Math.round((deals / total) * 100) : 0;
    return { total, baru, followed, deals, rate };
  }, [filtered]);

  const stageColor = useCallback(
    (key: string) => crm.pipelineStages.find((s) => s.key === key)?.color ?? "slate",
    [crm.pipelineStages],
  );

  async function patchLead(id: string | number, patch: Parameters<typeof updateLead>[1]) {
    await updateLead(id, patch);
    void load();
  }

  function exportCsv() {
    const headers = [
      "id",
      "created_at",
      "crm_status",
      "crm_category",
      "name",
      "whatsapp",
      "city",
      "need_type",
      "follow_up_count",
      "last_follow_up_key",
      "admin_notes",
    ];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      lines.push(
        headers
          .map((h) => {
            const v = String((r as unknown as Record<string, unknown>)[h] ?? "");
            return `"${v.replace(/"/g, '""')}"`;
          })
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `intero-crm-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function followUpClick(lead: LeadRow, slotKey: string) {
    const slot = crm.followUpSlots.find((s) => s.key === slotKey);
    if (!slot) return;
    const text = renderCrmWaTemplate(slot.messageTemplate, lead);
    const url = whatsappUrl(lead.whatsapp.replace(/\D/g, ""), text);
    window.open(url, "_blank", "noopener,noreferrer");
    await patchLead(lead.id, {
      last_follow_up_key: slotKey,
      follow_up_count: (lead.follow_up_count ?? 0) + 1,
    });
  }

  function toggleSelect(id: string | number) {
    const k = String(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filtered.map((r) => String(r.id))));
  }

  async function bulkDelete() {
    if (!selected.size || !confirm(`Hapus ${selected.size} lead terpilih?`)) return;
    for (const id of selected) {
      await deleteLead(id);
    }
    setSelected(new Set());
    void load();
  }

  async function submitManual() {
    setManualErr(null);
    const name = manual.name.trim();
    const whatsapp = manual.whatsapp.trim();
    const city = manual.city.trim();
    const need_type = manual.need_type.trim();
    if (!name || !whatsapp || !city || !need_type) {
      setManualErr("Isi nama, WhatsApp, kota, dan jenis kebutuhan.");
      return;
    }
    setManualBusy(true);
    try {
      await createLeadManual({
        name,
        whatsapp,
        city,
        need_type,
        size_estimate: manual.size_estimate.trim() || null,
        budget_range: manual.budget_range.trim() || null,
        notes: manual.notes.trim() || null,
        crm_status: manual.crm_status.trim() || "baru",
        crm_category: manual.crm_category.trim(),
      });
      setManualOpen(false);
      setManual(emptyManual());
      void load();
    } catch (e) {
      setManualErr(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setManualBusy(false);
    }
  }

  const idStr = (id: string | number) => String(id);

  return (
    <div className="min-h-full bg-[#f4f6f9] -m-8 p-8 text-navy-900">
      {/* Top bar — gaya dashboard referensi */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">CRM — Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Kelola prospek kitchen set Intero / WOCENSA — follow-up WA & pipeline
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setManual(emptyManual());
              setManualErr(null);
              setManualOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Tambah lead manual
          </button>
          <Link
            to="/admin/crm-settings"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-sm transition-colors"
          >
            <Settings2 className="h-4 w-4" />
            Pengaturan CRM
          </Link>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500">
            <Bell className="h-5 w-5" />
          </span>
        </div>
      </header>

      <button
        type="button"
        onClick={() => setWaInfoOpen((o) => !o)}
        className="w-full flex items-center gap-2 text-left px-4 py-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-950 text-sm mb-6 hover:bg-amber-100/80 transition-colors"
      >
        <Info className="h-5 w-5 shrink-0 text-amber-700" />
        <span className="font-bold flex-1">Tentang otomatisasi data dari WhatsApp</span>
        {waInfoOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {waInfoOpen && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 leading-relaxed space-y-3 shadow-sm">
          <p>
            <strong>Mengapa tidak ada &quot;scraping&quot; chat WA di aplikasi ini?</strong> WhatsApp tidak
            menyediakan API resmi untuk membaca riwayat obrolan pribadi/bisnis seperti data web biasa.
            Mengotomasi WhatsApp Web atau aplikasi klien melanggar ketentuan Meta, rawan diblokir, dan
            sangat tidak stabil untuk CRM produksi.
          </p>
          <p>
            <strong>Yang memungkinkan secara resmi:</strong>{" "}
            <em>WhatsApp Business Platform (Cloud API)</em> — pesan masuk bisa diteruskan ke server Anda
            lewat webhook, lalu disimpan ke CRM <strong>mulai dari saat integrasi diaktifkan</strong> (bukan
            impor massal chat lama). Itu proyek terpisah: verifikasi bisnis Meta, nomor WA Business, dan
            pengembangan webhook.
          </p>
          <p>
            <strong>Praktis hari ini:</strong> input manual di halaman ini, form website, atau arahkan tim
            untuk menempel ringkasan dari chat ke kolom catatan. Ekspor chat (.txt) dari ponsel bisa
            dipakai sebagai referensi di luar aplikasi.
          </p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(
          [
            { label: "Total leads", value: kpis.total, sub: "di rentang filter" },
            { label: "Lead baru", value: kpis.baru, sub: "status pipeline" },
            { label: "Sudah follow-up", value: kpis.followed, sub: "min. 1× WA" },
            { label: "% Deal", value: `${kpis.rate}%`, sub: `${kpis.deals} deal` },
          ] as const
        ).map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-5 flex flex-col justify-between min-h-[100px]"
          >
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {k.label}
            </span>
            <span className="text-3xl font-black text-orange-500 tabular-nums">{k.value}</span>
            <span className="text-[11px] text-gray-400">{k.sub}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        <label className="text-xs font-semibold text-gray-600 flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
          Periode
          <select
            className="text-sm font-medium border-0 bg-transparent pr-6 cursor-pointer"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7">7 hari</option>
            <option value="30">30 hari</option>
            <option value="90">90 hari</option>
            <option value="all">Semua</option>
          </select>
        </label>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
            >
              Muat ulang
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => void bulkDelete()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold"
              >
                <Trash2 className="h-4 w-4" />
                Hapus ({selected.size})
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "px-3 py-2 text-sm font-bold flex items-center gap-1.5",
                  view === "list" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
                )}
              >
                <List className="h-4 w-4" />
                List
              </button>
              <button
                type="button"
                onClick={() => setView("kanban")}
                className={cn(
                  "px-3 py-2 text-sm font-bold flex items-center gap-1.5 border-l border-gray-200",
                  view === "kanban" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </button>
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 bg-gray-50">
              <Filter className="h-4 w-4 text-gray-500 shrink-0" />
              <select
                className="text-sm bg-transparent border-0 font-medium text-gray-700 cursor-pointer max-w-[160px]"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Semua kategori</option>
                {crm.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <div className="relative flex items-center rounded-lg border border-gray-200 bg-white min-w-[200px] max-w-xs">
              <Search className="h-4 w-4 text-gray-400 absolute left-3" />
              <input
                className="w-full pl-9 pr-3 py-2 text-sm border-0 rounded-lg focus:ring-0"
                placeholder="Cari nama, WA, kota…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm mb-4 px-1">{error}</p>
      )}
      {loading ? (
        <div className="py-20 text-center text-gray-500 font-medium">Memuat data…</div>
      ) : view === "list" ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-3">ID</th>
                <th className="p-3 min-w-[180px]">Nama & kontak</th>
                <th className="p-3">Kota</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Status</th>
                <th className="p-3">Kebutuhan</th>
                <th className="p-3 whitespace-nowrap">Tanggal</th>
                <th className="p-3 text-right min-w-[200px]">Follow-up WA</th>
                <th className="p-3 w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sc = stageColor(leadStage(r));
                return (
                  <tr key={idStr(r.id)} className="border-b border-gray-100 hover:bg-blue-50/40">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selected.has(idStr(r.id))}
                        onChange={() => toggleSelect(r.id)}
                      />
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-blue-600 font-semibold">#{idStr(r.id)}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-blue-700">{r.name}</div>
                      <a
                        href={whatsappUrl(r.whatsapp.replace(/\D/g, ""), `Halo ${r.name}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-green-700 font-medium hover:underline"
                      >
                        {r.whatsapp}
                      </a>
                    </td>
                    <td className="p-3 text-gray-700">{r.city}</td>
                    <td className="p-3">
                      <select
                        className="w-full max-w-[140px] rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium bg-white"
                        value={r.crm_category || ""}
                        onChange={(e) => void patchLead(r.id, { crm_category: e.target.value })}
                      >
                        <option value="">—</option>
                        {crm.categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <select
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-bold cursor-pointer",
                          STAGE_BADGE[sc] || STAGE_BADGE.slate,
                        )}
                        value={leadStage(r)}
                        onChange={(e) => void patchLead(r.id, { crm_status: e.target.value })}
                      >
                        {crm.pipelineStages.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 max-w-[140px] truncate text-gray-600" title={r.need_type}>
                      {r.need_type}
                    </td>
                    <td className="p-3 whitespace-nowrap text-gray-500 text-xs">
                      {r.created_at?.slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {crm.followUpSlots.map((slot) => {
                          const active = r.last_follow_up_key === slot.key;
                          return (
                            <button
                              key={slot.key}
                              type="button"
                              title={slot.label}
                              onClick={() => void followUpClick(r, slot.key)}
                              className={cn(
                                "h-8 w-8 rounded-full text-xs font-black flex items-center justify-center border-2 transition-all shadow-sm",
                                active
                                  ? "bg-green-500 border-green-600 text-white"
                                  : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-orange-100 hover:border-orange-300 hover:text-orange-800",
                              )}
                            >
                              {slot.shortLabel || slot.key}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="text-xs font-bold text-blue-600 hover:underline text-left"
                          onClick={() =>
                            setNotesDraft({
                              id: r.id,
                              text: r.admin_notes || "",
                            })
                          }
                        >
                          Catatan
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-600 font-semibold hover:underline text-left"
                          onClick={async () => {
                            if (!confirm("Hapus lead ini?")) return;
                            await deleteLead(r.id);
                            void load();
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-16 text-center text-gray-500">Tidak ada lead pada filter ini.</p>
          )}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {crm.pipelineStages.map((stage) => (
            <div
              key={stage.key}
              className={cn(
                "min-w-[300px] max-w-[300px] rounded-xl border-2 border-dashed p-3 shrink-0 transition-colors",
                dragId ? "border-blue-300 bg-blue-50/30" : "border-gray-200 bg-gray-100/80",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("leadId");
                if (!id) return;
                const lead = rows.find((x) => idStr(x.id) === id);
                if (lead) void patchLead(lead.id, { crm_status: stage.key });
                setDragId(null);
              }}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-black text-sm text-gray-800">{stage.label}</h3>
                <span className="text-xs font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full border">
                  {filtered.filter((r) => leadStage(r) === stage.key).length}
                </span>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {filtered
                  .filter((r) => leadStage(r) === stage.key)
                  .map((r) => (
                    <div
                      key={idStr(r.id)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("leadId", idStr(r.id));
                        setDragId(r.id);
                      }}
                      onDragEnd={() => setDragId(null)}
                      className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 cursor-grab active:cursor-grabbing"
                    >
                      <div className="font-bold text-sm text-blue-700">{r.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{r.city}</div>
                      <div className="text-[11px] text-gray-400 truncate mt-1">{r.need_type}</div>
                      <div className="flex flex-wrap gap-1 mt-2 justify-end">
                        {crm.followUpSlots.slice(0, 6).map((slot) => (
                          <button
                            key={slot.key}
                            type="button"
                            title={slot.label}
                            onClick={() => void followUpClick(r, slot.key)}
                            className="h-7 w-7 rounded-full text-[10px] font-black bg-gray-100 border border-gray-200 hover:bg-orange-100"
                          >
                            {slot.shortLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {manualOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 my-8">
            <h3 className="font-black text-lg mb-1">Tambah lead manual</h3>
            <p className="text-xs text-gray-500 mb-4">
              Data masuk ke tabel CRM yang sama dengan form website.
            </p>
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="text-xs font-bold text-gray-600">Nama *</span>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={manual.name}
                  onChange={(e) => setManual({ ...manual, name: e.target.value })}
                  autoComplete="name"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-600">WhatsApp *</span>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="08…"
                  value={manual.whatsapp}
                  onChange={(e) => setManual({ ...manual, whatsapp: e.target.value })}
                  inputMode="tel"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-600">Kota *</span>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={manual.city}
                  onChange={(e) => setManual({ ...manual, city: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-600">Jenis kebutuhan *</span>
                {lf.needTypes.length > 0 ? (
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
                    value={manual.need_type}
                    onChange={(e) => setManual({ ...manual, need_type: e.target.value })}
                  >
                    <option value="">— pilih —</option>
                    {lf.needTypes.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    value={manual.need_type}
                    onChange={(e) => setManual({ ...manual, need_type: e.target.value })}
                    placeholder="Contoh: kitchen set baru"
                  />
                )}
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-600">Perkiraan ukuran</span>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={manual.size_estimate}
                  onChange={(e) => setManual({ ...manual, size_estimate: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-600">Rentang budget</span>
                {lf.budgetRanges.length > 0 ? (
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
                    value={manual.budget_range}
                    onChange={(e) => setManual({ ...manual, budget_range: e.target.value })}
                  >
                    <option value="">—</option>
                    {lf.budgetRanges.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    value={manual.budget_range}
                    onChange={(e) => setManual({ ...manual, budget_range: e.target.value })}
                  />
                )}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold text-gray-600">Status pipeline</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 bg-white text-sm"
                    value={manual.crm_status}
                    onChange={(e) => setManual({ ...manual, crm_status: e.target.value })}
                  >
                    {crm.pipelineStages.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-gray-600">Kategori</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 bg-white text-sm"
                    value={manual.crm_category}
                    onChange={(e) => setManual({ ...manual, crm_category: e.target.value })}
                  >
                    <option value="">—</option>
                    {crm.categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-gray-600">Catatan</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 min-h-[80px]"
                  value={manual.notes}
                  onChange={(e) => setManual({ ...manual, notes: e.target.value })}
                />
              </label>
            </div>
            {manualErr && <p className="text-red-600 text-sm mt-3">{manualErr}</p>}
            <div className="flex gap-2 justify-end mt-5">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border text-sm font-semibold"
                disabled={manualBusy}
                onClick={() => {
                  setManualOpen(false);
                  setManualErr(null);
                }}
              >
                Batal
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-60"
                disabled={manualBusy}
                onClick={() => void submitManual()}
              >
                {manualBusy ? "Menyimpan…" : "Simpan lead"}
              </button>
            </div>
          </div>
        </div>
      )}

      {notesDraft && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-black text-lg mb-2">Catatan internal</h3>
            <p className="text-xs text-gray-500 mb-3">Lead #{idStr(notesDraft.id)}</p>
            <textarea
              className="w-full rounded-lg border border-gray-200 p-3 text-sm min-h-[120px] mb-4"
              value={notesDraft.text}
              onChange={(e) => setNotesDraft({ ...notesDraft, text: e.target.value })}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border text-sm font-semibold"
                onClick={() => setNotesDraft(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold"
                onClick={async () => {
                  await patchLead(notesDraft.id, { admin_notes: notesDraft.text });
                  setNotesDraft(null);
                }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
