import React, { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "@/admin/adminContext";
import { SaveBar } from "@/admin/SaveBar";
import { uploadFile } from "@/lib/api";
import type { HeroFeature, LandingSections, StepIconName } from "@/types/site-settings";

const HERO_ICONS: HeroFeature["icon"][] = ["Droplets", "BugOff", "Sparkles", "Award"];
const STEP_ICONS: StepIconName[] = ["MessageCircle", "Layout", "Hammer", "Eye", "ShieldCheck"];
const BONUS_ICONS = ["Layout", "Gift", "Zap"] as const;

type TabId =
  | "hero"
  | "problem"
  | "solution"
  | "gallery"
  | "product"
  | "steps"
  | "bonus"
  | "pricing"
  | "cta";

function wocensaColumnKey(sec: LandingSections): string | null {
  const col =
    sec.comparison.columns.find((c) => c.highlight) ??
    sec.comparison.columns.find((c) => c.key === "wocensa");
  return col?.key ?? null;
}

/** Sinkronkan harga promo kartu urgency dengan baris "Harga / m²" kolom WOCENSA di tabel perbandingan. */
function patchUrgencyWithComparisonSync(
  sec: LandingSections,
  updates: Partial<
    Pick<LandingSections["urgency"], "oldPrice" | "promoPrice" | "promoBadgeLabel" | "ctaLabel">
  >,
): LandingSections {
  const urgency = { ...sec.urgency, ...updates };
  let comparison = sec.comparison;
  if (updates.promoPrice !== undefined) {
    const key = wocensaColumnKey(sec);
    if (key) {
      const rows = sec.comparison.rows.map((r) => {
        if (r.name.trim() === "Harga / m²") {
          return { ...r, values: { ...r.values, [key]: updates.promoPrice! } };
        }
        return r;
      });
      comparison = { ...sec.comparison, rows };
    }
  }
  return { ...sec, urgency, comparison };
}

const TABS: { id: TabId; label: string }[] = [
  { id: "hero", label: "Hero & video" },
  { id: "problem", label: "Problem" },
  { id: "solution", label: "Solusi" },
  { id: "gallery", label: "Galeri proyek" },
  { id: "product", label: "Detail produk" },
  { id: "steps", label: "Proses (5 step)" },
  { id: "bonus", label: "Bonus" },
  { id: "pricing", label: "Harga & promo" },
  { id: "cta", label: "CTA & sticky" },
];

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function MediaField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadFile(f);
      onChange(url);
    } catch {
      alert("Upload gagal. Pastikan server / Supabase storage aktif.");
    }
    e.target.value = "";
  };

  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-3 items-start">
        {value ? (
          <img
            src={value}
            alt=""
            className="h-24 w-auto max-w-[160px] rounded-lg border border-gray-200 object-cover bg-gray-50"
          />
        ) : (
          <div className="h-24 w-28 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-400 flex items-center justify-center text-center px-1">
            Belum ada gambar
          </div>
        )}
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-900 text-white text-sm font-semibold cursor-pointer hover:opacity-90">
            <span>Unggah file</span>
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="Atau tempel URL gambar"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
    </Field>
  );
}

export default function SectionsVisualPage() {
  const { settings, setSettings } = useAdmin();
  const [tab, setTab] = useState<TabId>("hero");

  const patchSections = useCallback(
    (fn: (sec: LandingSections) => LandingSections) => {
      setSettings((s) => ({ ...s, sections: fn(s.sections) }));
    },
    [setSettings],
  );

  const sec = settings.sections;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-1">Konten landing (visual)</h1>
      <p className="text-sm text-gray-600 mb-4">
        Edit seperti CMS: unggah gambar, tempel URL YouTube, tanpa menyentuh JSON. Untuk tabel
        perbandingan, urgency HTML, dan halaman kompleks lainnya gunakan{" "}
        <Link to="/admin/sections-json" className="text-blue-700 font-medium hover:underline">
          mode JSON lanjutan
        </Link>
        .
      </p>
      <SaveBar />

      <div className="flex flex-wrap gap-2 my-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.id
                ? "bg-gold-500 text-navy-900"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-sm">
        {tab === "hero" && (
          <>
            <Field label="Badge atas">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.hero.badge}
                onChange={(e) =>
                  patchSections((p) => ({ ...p, hero: { ...p.hero, badge: e.target.value } }))
                }
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Judul baris 1">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={sec.hero.titleLine1}
                  onChange={(e) =>
                    patchSections((p) => ({
                      ...p,
                      hero: { ...p.hero, titleLine1: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="Judul aksen (warna emas)">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={sec.hero.titleAccent}
                  onChange={(e) =>
                    patchSections((p) => ({
                      ...p,
                      hero: { ...p.hero, titleAccent: e.target.value },
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="Subjudul">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.hero.subtitle}
                onChange={(e) =>
                  patchSections((p) => ({ ...p, hero: { ...p.hero, subtitle: e.target.value } }))
                }
              />
            </Field>
            <Field label="Deskripsi">
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm min-h-[88px]"
                value={sec.hero.description}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    hero: { ...p.hero, description: e.target.value },
                  }))
                }
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Tombol utama">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={sec.hero.primaryCta}
                  onChange={(e) =>
                    patchSections((p) => ({
                      ...p,
                      hero: { ...p.hero, primaryCta: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="Tombol sekunder">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={sec.hero.secondaryCta}
                  onChange={(e) =>
                    patchSections((p) => ({
                      ...p,
                      hero: { ...p.hero, secondaryCta: e.target.value },
                    }))
                  }
                />
              </Field>
            </div>
            <Field
              label="Link tombol utama (href)"
              hint="Untuk scroll ke blok harga di landing: #harga. Contoh lain: /pricelist, https://..."
            >
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm font-mono text-xs"
                value={sec.hero.primaryCtaHref ?? "#harga"}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    hero: { ...p.hero, primaryCtaHref: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Link tombol sekunder (href)">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.hero.secondaryCtaHref}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    hero: { ...p.hero, secondaryCtaHref: e.target.value },
                  }))
                }
              />
            </Field>
            <Field
              label="Video YouTube"
              hint="Tempel URL lengkap (youtube.com/watch, youtu.be, atau /shorts/). Kosongkan bila tidak pakai video."
            >
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="https://www.youtube.com/watch?v=..."
                value={sec.hero.youtubeUrl ?? ""}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    hero: {
                      ...p.hero,
                      youtubeUrl: e.target.value.trim() || null,
                    },
                  }))
                }
              />
            </Field>
            <Field
              label="Teks kecil di bawah video / thumbnail"
              hint="Muncul di halaman sebagai keterangan (mis. sumber testimoni)."
            >
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.hero.videoDisclaimer ?? ""}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    hero: { ...p.hero, videoDisclaimer: e.target.value },
                  }))
                }
              />
            </Field>
            <MediaField
              label="Gambar hero"
              value={sec.hero.imageUrl}
              onChange={(url) =>
                patchSections((p) => ({ ...p, hero: { ...p.hero, imageUrl: url } }))
              }
            />
            <Field label="Alt text gambar (SEO)">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.hero.imageAlt}
                onChange={(e) =>
                  patchSections((p) => ({ ...p, hero: { ...p.hero, imageAlt: e.target.value } }))
                }
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Teks badge mengambang (baris 1)">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={sec.hero.floatingBadgeTitle}
                  onChange={(e) =>
                    patchSections((p) => ({
                      ...p,
                      hero: { ...p.hero, floatingBadgeTitle: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="Teks badge mengambang (baris 2)">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={sec.hero.floatingBadgeSubtitle}
                  onChange={(e) =>
                    patchSections((p) => ({
                      ...p,
                      hero: { ...p.hero, floatingBadgeSubtitle: e.target.value },
                    }))
                  }
                />
              </Field>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase">4 fitur kecil di hero</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {sec.hero.features.map((feat, i) => (
                <div key={i} className="rounded-lg border border-gray-100 p-3 space-y-2 bg-gray-50/80">
                  <label className="text-xs text-gray-600">Ikon</label>
                  <select
                    className="w-full rounded-lg border px-2 py-1.5 text-sm"
                    value={feat.icon}
                    onChange={(e) =>
                      patchSections((p) => {
                        const features = [...p.hero.features];
                        features[i] = { ...features[i]!, icon: e.target.value as HeroFeature["icon"] };
                        return { ...p, hero: { ...p.hero, features } };
                      })
                    }
                  >
                    {HERO_ICONS.map((ic) => (
                      <option key={ic} value={ic}>
                        {ic}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-lg border px-2 py-1.5 text-sm"
                    placeholder="Teks"
                    value={feat.text}
                    onChange={(e) =>
                      patchSections((p) => {
                        const features = [...p.hero.features];
                        features[i] = { ...features[i]!, text: e.target.value };
                        return { ...p, hero: { ...p.hero, features } };
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "problem" && (
          <>
            <Field label="Eyebrow">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.problem.eyebrow}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    problem: { ...p.problem, eyebrow: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Judul">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.problem.title}
                onChange={(e) =>
                  patchSections((p) => ({ ...p, problem: { ...p.problem, title: e.target.value } }))
                }
              />
            </Field>
            <Field label="Intro">
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm min-h-[72px]"
                value={sec.problem.intro}
                onChange={(e) =>
                  patchSections((p) => ({ ...p, problem: { ...p.problem, intro: e.target.value } }))
                }
              />
            </Field>
            <Field label="Heading HTML (boleh pakai &lt;br /&gt;)">
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px] font-mono text-xs"
                value={sec.problem.headingHtml}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    problem: { ...p.problem, headingHtml: e.target.value },
                  }))
                }
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Emoji">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={sec.problem.emoji}
                  onChange={(e) =>
                    patchSections((p) => ({
                      ...p,
                      problem: { ...p.problem, emoji: e.target.value },
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="Body teks">
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm min-h-[100px]"
                value={sec.problem.body}
                onChange={(e) =>
                  patchSections((p) => ({ ...p, problem: { ...p.problem, body: e.target.value } }))
                }
              />
            </Field>
            <MediaField
              label="Gambar problem (portrait)"
              hint="Dipakai 1 gambar saja di sisi kanan (rasio potrait)."
              value={sec.problem.images[0] ?? ""}
              onChange={(url) =>
                patchSections((p) => {
                  const images = [...(p.problem.images.length ? p.problem.images : [""])];
                  images[0] = url;
                  return { ...p, problem: { ...p.problem, images } };
                })
              }
            />
          </>
        )}

        {tab === "solution" && (
          <>
            <Field label="ID anchor (mis. solusi)">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.solution.id}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    solution: { ...p.solution, id: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Eyebrow">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.solution.eyebrow}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    solution: { ...p.solution, eyebrow: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Judul">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.solution.title}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    solution: { ...p.solution, title: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Quote">
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.solution.quote}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    solution: { ...p.solution, quote: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Intro">
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm min-h-[72px]"
                value={sec.solution.intro}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    solution: { ...p.solution, intro: e.target.value },
                  }))
                }
              />
            </Field>
            <MediaField
              label="Gambar solusi"
              value={sec.solution.imageUrl}
              onChange={(url) =>
                patchSections((p) => ({
                  ...p,
                  solution: { ...p.solution, imageUrl: url },
                }))
              }
            />
            <Field label="Teks badge">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.solution.badgeText}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    solution: { ...p.solution, badgeText: e.target.value },
                  }))
                }
              />
            </Field>
            <p className="text-xs font-bold text-gray-500 uppercase">Poin bullet</p>
            {sec.solution.points.map((pt, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <input
                  className="w-full rounded-lg border px-2 py-1.5 text-sm font-semibold"
                  placeholder="Judul poin"
                  value={pt.title}
                  onChange={(e) =>
                    patchSections((p) => {
                      const points = [...p.solution.points];
                      points[i] = { ...points[i]!, title: e.target.value };
                      return { ...p, solution: { ...p.solution, points } };
                    })
                  }
                />
                <textarea
                  className="w-full rounded-lg border px-2 py-1.5 text-sm"
                  placeholder="Deskripsi"
                  value={pt.desc}
                  onChange={(e) =>
                    patchSections((p) => {
                      const points = [...p.solution.points];
                      points[i] = { ...points[i]!, desc: e.target.value };
                      return { ...p, solution: { ...p.solution, points } };
                    })
                  }
                />
              </div>
            ))}
            <Field label="Closing quote">
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm min-h-[100px]"
                value={sec.solution.closingQuote}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    solution: { ...p.solution, closingQuote: e.target.value },
                  }))
                }
              />
            </Field>
          </>
        )}

        {tab === "gallery" && (
          <>
            <Field label="ID anchor">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.gallery.id}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    gallery: { ...p.gallery, id: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Eyebrow">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.gallery.eyebrow}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    gallery: { ...p.gallery, eyebrow: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Judul section">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.gallery.title}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    gallery: { ...p.gallery, title: e.target.value },
                  }))
                }
              />
            </Field>
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-gray-500 uppercase">Item proyek</p>
              <button
                type="button"
                className="text-sm font-semibold text-blue-700 hover:underline"
                onClick={() =>
                  patchSections((p) => ({
                    ...p,
                    gallery: {
                      ...p.gallery,
                      projects: [
                        ...p.gallery.projects,
                        {
                          title: "Proyek baru",
                          area: "Kota",
                          img: "",
                          videoUrl: null,
                          visible: true,
                        },
                      ],
                    },
                  }))
                }
              >
                + Tambah proyek
              </button>
            </div>
            <div className="space-y-6">
              {sec.gallery.projects.map((proj, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/50">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-bold text-navy-900">#{i + 1}</span>
                    <button
                      type="button"
                      className="text-xs text-red-600 font-semibold hover:underline"
                      onClick={() =>
                        patchSections((p) => ({
                          ...p,
                          gallery: {
                            ...p.gallery,
                            projects: p.gallery.projects.filter((_, j) => j !== i),
                          },
                        }))
                      }
                    >
                      Hapus
                    </button>
                  </div>
                  <Field label="Judul">
                    <input
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
                      value={proj.title}
                      onChange={(e) =>
                        patchSections((p) => {
                          const projects = [...p.gallery.projects];
                          projects[i] = { ...projects[i]!, title: e.target.value };
                          return { ...p, gallery: { ...p.gallery, projects } };
                        })
                      }
                    />
                  </Field>
                  <Field label="Area / lokasi">
                    <input
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
                      value={proj.area}
                      onChange={(e) =>
                        patchSections((p) => {
                          const projects = [...p.gallery.projects];
                          projects[i] = { ...projects[i]!, area: e.target.value };
                          return { ...p, gallery: { ...p.gallery, projects } };
                        })
                      }
                    />
                  </Field>
                  <MediaField
                    label="Foto"
                    value={proj.img}
                    onChange={(url) =>
                      patchSections((p) => {
                        const projects = [...p.gallery.projects];
                        projects[i] = { ...projects[i]!, img: url };
                        return { ...p, gallery: { ...p.gallery, projects } };
                      })
                    }
                  />
                  <Field label="URL video (YouTube atau TikTok)">
                    <p className="text-[11px] text-gray-500 mb-1">
                      YouTube: tautan watch / Shorts. TikTok: tempel URL halaman video lengkap (bukan vm.tiktok.com).
                    </p>
                    <input
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
                      placeholder="YouTube atau https://www.tiktok.com/@user/video/…"
                      value={proj.videoUrl ?? ""}
                      onChange={(e) =>
                        patchSections((p) => {
                          const projects = [...p.gallery.projects];
                          projects[i] = {
                            ...projects[i]!,
                            videoUrl: e.target.value.trim() || null,
                          };
                          return { ...p, gallery: { ...p.gallery, projects } };
                        })
                      }
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm font-medium text-navy-900 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={proj.visible !== false}
                      onChange={(e) =>
                        patchSections((p) => {
                          const projects = [...p.gallery.projects];
                          projects[i] = { ...projects[i]!, visible: e.target.checked };
                          return { ...p, gallery: { ...p.gallery, projects } };
                        })
                      }
                    />
                    Tampilkan di halaman utama
                  </label>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "pricing" && (
          <>
            <p className="text-sm text-gray-600 leading-relaxed">
              <strong>Harga promo (utama)</strong> otomatis menyamakan teks pada kolom produk unggulan
              (WOCENSA / highlight) di baris <strong>Harga / m²</strong> pada section perbandingan.
            </p>
            <Field label="Label pill di kartu harga (satu baris)">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.urgency.promoBadgeLabel ?? "Harga promo khusus"}
                onChange={(e) =>
                  patchSections((p) =>
                    patchUrgencyWithComparisonSync(p, { promoBadgeLabel: e.target.value }),
                  )
                }
              />
            </Field>
            <Field label="Harga dicoret">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Rp. 3.500.000"
                value={sec.urgency.oldPrice}
                onChange={(e) =>
                  patchSections((p) => patchUrgencyWithComparisonSync(p, { oldPrice: e.target.value }))
                }
              />
            </Field>
            <Field label="Harga promo (angka utama)">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Rp. 2.900.000"
                value={sec.urgency.promoPrice}
                onChange={(e) =>
                  patchSections((p) =>
                    patchUrgencyWithComparisonSync(p, { promoPrice: e.target.value }),
                  )
                }
              />
            </Field>
            <Field label="Label tombol di kartu harga (buka form)">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.urgency.ctaLabel}
                onChange={(e) =>
                  patchSections((p) => patchUrgencyWithComparisonSync(p, { ctaLabel: e.target.value }))
                }
              />
            </Field>
          </>
        )}

        {tab === "product" && (
          <>
            <Field label="Eyebrow">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.productDetails.eyebrow}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    productDetails: { ...p.productDetails, eyebrow: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Judul (HTML diperbolehkan)">
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm min-h-[72px] font-mono text-xs"
                value={sec.productDetails.titleHtml}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    productDetails: { ...p.productDetails, titleHtml: e.target.value },
                  }))
                }
              />
            </Field>
            <p className="text-xs font-bold text-gray-500 uppercase">Paragraf (satu per blok)</p>
            {sec.productDetails.paragraphs.map((para, i) => (
              <textarea
                key={i}
                className="w-full rounded-lg border px-3 py-2 text-sm min-h-[72px] font-mono text-xs"
                value={para}
                onChange={(e) =>
                  patchSections((p) => {
                    const paragraphs = [...p.productDetails.paragraphs];
                    paragraphs[i] = e.target.value;
                    return { ...p, productDetails: { ...p.productDetails, paragraphs } };
                  })
                }
              />
            ))}
            <button
              type="button"
              className="text-sm font-semibold text-blue-700"
              onClick={() =>
                patchSections((p) => ({
                  ...p,
                  productDetails: {
                    ...p.productDetails,
                    paragraphs: [...p.productDetails.paragraphs, ""],
                  },
                }))
              }
            >
              + Paragraf
            </button>
            <Field label="Quote HTML">
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm min-h-[60px] font-mono text-xs"
                value={sec.productDetails.quoteHtml}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    productDetails: { ...p.productDetails, quoteHtml: e.target.value },
                  }))
                }
              />
            </Field>
            <p className="text-xs font-bold text-gray-500 uppercase">Empat gambar grid</p>
            {[0, 1, 2, 3].map((idx) => (
              <MediaField
                key={idx}
                label={`Gambar ${idx + 1}`}
                value={sec.productDetails.images[idx] ?? ""}
                onChange={(url) =>
                  patchSections((p) => {
                    const images = [...(p.productDetails.images || [])];
                    while (images.length <= idx) images.push("");
                    images[idx] = url;
                    return { ...p, productDetails: { ...p.productDetails, images } };
                  })
                }
              />
            ))}
          </>
        )}

        {tab === "steps" && (
          <>
            <Field label="ID anchor">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.steps.id}
                onChange={(e) =>
                  patchSections((p) => ({ ...p, steps: { ...p.steps, id: e.target.value } }))
                }
              />
            </Field>
            <Field label="Eyebrow">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.steps.eyebrow}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    steps: { ...p.steps, eyebrow: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Judul">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.steps.title}
                onChange={(e) =>
                  patchSections((p) => ({ ...p, steps: { ...p.steps, title: e.target.value } }))
                }
              />
            </Field>
            <div className="space-y-4">
              {sec.steps.items.map((it, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2 bg-gray-50/80">
                  <div className="flex gap-2">
                    <select
                      className="rounded-lg border px-2 py-1.5 text-sm"
                      value={it.icon}
                      onChange={(e) =>
                        patchSections((p) => {
                          const items = [...p.steps.items];
                          items[i] = { ...items[i]!, icon: e.target.value as StepIconName };
                          return { ...p, steps: { ...p.steps, items } };
                        })
                      }
                    >
                      {STEP_ICONS.map((ic) => (
                        <option key={ic} value={ic}>
                          {ic}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    className="w-full rounded-lg border px-2 py-1.5 text-sm font-semibold"
                    value={it.title}
                    onChange={(e) =>
                      patchSections((p) => {
                        const items = [...p.steps.items];
                        items[i] = { ...items[i]!, title: e.target.value };
                        return { ...p, steps: { ...p.steps, items } };
                      })
                    }
                  />
                  <textarea
                    className="w-full rounded-lg border px-2 py-1.5 text-sm"
                    value={it.desc}
                    onChange={(e) =>
                      patchSections((p) => {
                        const items = [...p.steps.items];
                        items[i] = { ...items[i]!, desc: e.target.value };
                        return { ...p, steps: { ...p.steps, items } };
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <Field label="Judul bawah">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.steps.bottomTitle}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    steps: { ...p.steps, bottomTitle: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Subjudul bawah">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.steps.bottomSubtitle}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    steps: { ...p.steps, bottomSubtitle: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="CTA bawah">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.steps.bottomCta}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    steps: { ...p.steps, bottomCta: e.target.value },
                  }))
                }
              />
            </Field>
          </>
        )}

        {tab === "bonus" && (
          <>
            <Field label="ID anchor">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.bonus.id}
                onChange={(e) =>
                  patchSections((p) => ({ ...p, bonus: { ...p.bonus, id: e.target.value } }))
                }
              />
            </Field>
            <Field label="Badge">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.bonus.badge}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    bonus: { ...p.bonus, badge: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Judul">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.bonus.title}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    bonus: { ...p.bonus, title: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Subtitle">
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.bonus.subtitle}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    bonus: { ...p.bonus, subtitle: e.target.value },
                  }))
                }
              />
            </Field>
            {sec.bonus.items.map((it, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <select
                  className="rounded-lg border px-2 py-1.5 text-sm"
                  value={it.icon}
                  onChange={(e) =>
                    patchSections((p) => {
                      const items = [...p.bonus.items];
                      items[i] = { ...items[i]!, icon: e.target.value as (typeof BONUS_ICONS)[number] };
                      return { ...p, bonus: { ...p.bonus, items } };
                    })
                  }
                >
                  {BONUS_ICONS.map((ic) => (
                    <option key={ic} value={ic}>
                      {ic}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full rounded-lg border px-2 py-1.5 text-sm font-semibold"
                  value={it.title}
                  onChange={(e) =>
                    patchSections((p) => {
                      const items = [...p.bonus.items];
                      items[i] = { ...items[i]!, title: e.target.value };
                      return { ...p, bonus: { ...p.bonus, items } };
                    })
                  }
                />
                <input
                  className="w-full rounded-lg border px-2 py-1.5 text-sm"
                  placeholder="Nilai (mis. Rp ...)"
                  value={it.val}
                  onChange={(e) =>
                    patchSections((p) => {
                      const items = [...p.bonus.items];
                      items[i] = { ...items[i]!, val: e.target.value };
                      return { ...p, bonus: { ...p.bonus, items } };
                    })
                  }
                />
              </div>
            ))}
            <Field label="Footnote">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.bonus.footnote}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    bonus: { ...p.bonus, footnote: e.target.value },
                  }))
                }
              />
            </Field>
          </>
        )}

        {tab === "cta" && (
          <>
            <p className="text-sm font-bold text-navy-900">Tagline besar</p>
            <Field label="Baris 1">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.taglineBig.line1}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    taglineBig: { ...p.taglineBig, line1: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Baris 2">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.taglineBig.line2}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    taglineBig: { ...p.taglineBig, line2: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Label CTA">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.taglineBig.ctaLabel}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    taglineBig: { ...p.taglineBig, ctaLabel: e.target.value },
                  }))
                }
              />
            </Field>
            <hr className="border-gray-200" />
            <p className="text-sm font-bold text-navy-900">Mengapa sekarang (3 kartu)</p>
            <Field label="Judul section (HTML)">
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm font-mono text-xs min-h-[60px]"
                value={sec.whyNow.titleHtml}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    whyNow: { ...p.whyNow, titleHtml: e.target.value },
                  }))
                }
              />
            </Field>
            {sec.whyNow.cards.map((c, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <input
                  className="w-full rounded-lg border px-2 py-1.5 text-sm font-semibold"
                  value={c.title}
                  onChange={(e) =>
                    patchSections((p) => {
                      const cards = [...p.whyNow.cards];
                      cards[i] = { ...cards[i]!, title: e.target.value };
                      return { ...p, whyNow: { ...p.whyNow, cards } };
                    })
                  }
                />
                <textarea
                  className="w-full rounded-lg border px-2 py-1.5 text-sm"
                  value={c.text}
                  onChange={(e) =>
                    patchSections((p) => {
                      const cards = [...p.whyNow.cards];
                      cards[i] = { ...cards[i]!, text: e.target.value };
                      return { ...p, whyNow: { ...p.whyNow, cards } };
                    })
                  }
                />
              </div>
            ))}
            <hr className="border-gray-200" />
            <p className="text-sm font-bold text-navy-900">CTA akhir</p>
            <Field label="Judul">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.finalCta.title}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    finalCta: { ...p.finalCta, title: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Subtitle">
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.finalCta.subtitle}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    finalCta: { ...p.finalCta, subtitle: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Label tombol">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.finalCta.ctaLabel}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    finalCta: { ...p.finalCta, ctaLabel: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Baris benefit">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.finalCta.perkLine}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    finalCta: { ...p.finalCta, perkLine: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Badge slot">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.finalCta.slotsBadge}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    finalCta: { ...p.finalCta, slotsBadge: e.target.value },
                  }))
                }
              />
            </Field>
            <hr className="border-gray-200" />
            <p className="text-sm font-bold text-navy-900">Sticky CTA (mobile)</p>
            <Field label="Baris atas">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.stickyCta.topLine}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    stickyCta: { ...p.stickyCta, topLine: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Baris utama">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={sec.stickyCta.mainLine}
                onChange={(e) =>
                  patchSections((p) => ({
                    ...p,
                    stickyCta: { ...p.stickyCta, mainLine: e.target.value },
                  }))
                }
              />
            </Field>
          </>
        )}
      </div>
    </div>
  );
}
