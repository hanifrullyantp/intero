import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import {
  createCloudProject,
  fetchMyOrganizations,
  listOrgProjects,
  softDeleteProject,
  type OrgSummary,
  type ProjectSummary,
} from '../cloud/orgProjects';
import { useWorkspaceStore } from '../workspace/workspaceStore';
import { canEditProjects } from '../permissions/roles';
import type { OrgRole } from '../permissions/roles';
import AuthPage from './AuthPage';
import DashboardShell from './saas/DashboardShell';
import OnboardingWizard from './saas/OnboardingWizard';
import {
  FilePlus2, Plus, Rocket, PencilRuler, Calculator, Wand, Play, FileText,
  MoreHorizontal, Grid2x2, List, ArrowRight,
} from './icons';

const ORG_KEY = 'instant3d_last_org';

const THUMBS = [
  'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1556912177-c54030639a6d?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?auto=format&fit=crop&w=640&q=80',
];

const TEMPLATES = [
  { name: 'Modern L-Shape', dim: '300×250 cm', img: THUMBS[0] },
  { name: 'Scandinavian I', dim: '280×220 cm', img: THUMBS[1] },
  { name: 'Classic U', dim: '320×280 cm', img: THUMBS[2] },
  { name: 'Industrial Island', dim: '340×260 cm', img: THUMBS[3] },
];

function onboardingKey(userId: string) {
  return `instant3d_onboarding_done_${userId}`;
}

function displayNameFromUser(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const meta = user.user_metadata?.full_name;
  if (typeof meta === 'string' && meta.trim()) return meta.trim();
  return user.email?.split('@')[0] ?? 'Designer';
}

function thumbForProject(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % THUMBS.length;
  return THUMBS[h]!;
}

export default function ProjectHub() {
  const { user, loading, signOut, configured } = useAuth();
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [orgId, setOrgId] = useState<string | null>(() => {
    try { return localStorage.getItem(ORG_KEY); } catch { return null; }
  });
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all' | 'draft' | 'complete'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [query, setQuery] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [showOnboard, setShowOnboard] = useState(false);

  const displayName = user ? displayNameFromUser(user) : 'Designer';

  useEffect(() => {
    if (!user) return;
    try {
      const done = localStorage.getItem(onboardingKey(user.id));
      if (!done) setShowOnboard(true);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void fetchMyOrganizations().then((list) => {
      setOrgs(list);
      let stored: string | null = null;
      try { stored = localStorage.getItem(ORG_KEY); } catch { /* ignore */ }
      const pick = stored && list.some((o) => o.id === stored) ? stored : list[0]?.id ?? null;
      if (pick) {
        setOrgId(pick);
        try { localStorage.setItem(ORG_KEY, pick); } catch { /* ignore */ }
        const org = list.find((o) => o.id === pick)!;
        useWorkspaceStore.getState().setOrg(pick, org.role as OrgRole);
      }
    }).catch((e) => setErr((e as Error).message));
  }, [user]);

  useEffect(() => {
    if (!orgId || !user) return;
    void listOrgProjects(orgId).then(setProjects).catch((e) => setErr((e as Error).message));
  }, [orgId, user]);

  useEffect(() => {
    const close = () => setMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const currentOrg = orgs.find((o) => o.id === orgId);
  const canEdit = canEditProjects((currentOrg?.role as OrgRole) ?? null);

  const filtered = useMemo(() => {
    let list = projects;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filter === 'draft') list = list;
    if (filter === 'complete') list = [];
    return list;
  }, [projects, query, filter]);

  const stats = useMemo(() => {
    const total = projects.length;
    const draft = total;
    const complete = 0;
    const value = total * 3_750_000;
    return { total, draft, complete, value };
  }, [projects]);

  const newProject = async (name?: string) => {
    if (!orgId || !canEdit) return;
    setBusy(true);
    setErr(null);
    try {
      const id = await createCloudProject(orgId, name ?? `Project ${projects.length + 1}`);
      window.location.href = `/p/${id}`;
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Hapus proyek dari cloud?')) return;
    setMenuId(null);
    try {
      await softDeleteProject(id);
      setProjects((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const finishOnboarding = () => {
    if (user) {
      try { localStorage.setItem(onboardingKey(user.id), '1'); } catch { /* ignore */ }
    }
    setShowOnboard(false);
    void newProject('Kitchen pertama');
  };

  const onOrgChange = (id: string) => {
    setOrgId(id);
    try { localStorage.setItem(ORG_KEY, id); } catch { /* ignore */ }
    const org = orgs.find((o) => o.id === id);
    if (org) useWorkspaceStore.getState().setOrg(id, org.role as OrgRole);
  };

  if (!configured) {
    return (
      <div className="saas-app p-8 text-center min-h-dvh grid place-items-center">
        <div>
          <p className="text-sm mb-4 text-[#6b7280]">Cloud workspace membutuhkan env Supabase (VITE_SUPABASE_URL).</p>
          <a href="/" className="saas-btn-primary inline-flex px-6 w-auto">Buka editor lokal</a>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="saas-app p-8 text-center text-sm text-[#6b7280] min-h-dvh grid place-items-center">
        Memuat sesi…
      </div>
    );
  }
  if (!user) return <AuthPage />;

  const empty = projects.length === 0;

  return (
    <DashboardShell
      userEmail={user.email ?? ''}
      displayName={displayName}
      orgs={orgs}
      orgId={orgId}
      onOrgChange={onOrgChange}
      onSignOut={() => { void signOut().then(() => { window.location.href = '/login'; }); }}
    >
      {showOnboard && (
        <OnboardingWizard name={displayName} onDone={finishOnboarding} />
      )}

      {empty ? (
        <>
          <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-2">
            Hi, {displayName.split(' ')[0]}! 👋 Selamat datang di Instant 3D
          </h1>
          <p className="text-[#6b7280] mb-8 max-w-xl">Mulai dari template atau canvas kosong — design kitchen set impian Anda dalam hitungan menit.</p>

          <div className="saas-cta-hero mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-2">🎨 Buat Design Pertama Anda</h2>
            <p className="text-white/90 text-sm mb-6 max-w-md">Parametric 3D, cutting list, dan estimasi harga — siap presentasi ke klien.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="saas-btn-secondary bg-white/95 border-none font-semibold" disabled={busy || !canEdit} onClick={() => { void newProject(); }}>
                <Plus size={16} className="inline mr-1" /> New Project
              </button>
              <button type="button" className="saas-btn-secondary bg-transparent text-white border-white/40" onClick={() => document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth' })}>
                📋 Browse Templates
              </button>
            </div>
          </div>

          <section id="templates" className="mb-10">
            <h3 className="text-lg font-semibold mb-4 text-[#111827]">Template populer</h3>
            <div className="saas-template-scroll">
              {TEMPLATES.map((t) => (
                <div key={t.name} className="saas-template-card">
                  <div className="saas-project-thumb">
                    <img src={t.img} alt={t.name} />
                  </div>
                  <div className="p-4">
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-[#6b7280] mb-3">{t.dim}</div>
                    <button type="button" className="text-sm font-semibold text-[#1b9d6b] flex items-center gap-1 bg-transparent border-none cursor-pointer p-0" disabled={!canEdit} onClick={() => { void newProject(t.name); }}>
                      Use <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h3 className="text-lg font-semibold mb-4 text-[#111827]">Quick start</h3>
            <div className="saas-quick-grid">
              <button type="button" className="saas-quick-tile" onClick={() => { void newProject('Magic Wizard'); }}>
                <Rocket size={22} className="text-[#1b9d6b] mb-2" />
                <div className="font-semibold text-sm">Magic Wizard</div>
                <div className="text-xs text-[#6b7280] mt-1">Auto-generate 3D dari brief singkat</div>
              </button>
              <button type="button" className="saas-quick-tile" onClick={() => { window.location.href = '/'; }}>
                <PencilRuler size={22} className="text-[#1b9d6b] mb-2" />
                <div className="font-semibold text-sm">Import File</div>
                <div className="text-xs text-[#6b7280] mt-1">SKP / DXF / JSON (editor lokal)</div>
              </button>
              <button type="button" className="saas-quick-tile" onClick={() => { void newProject('From Estimator'); }}>
                <Calculator size={22} className="text-[#1b9d6b] mb-2" />
                <div className="font-semibold text-sm">From Estimator</div>
                <div className="text-xs text-[#6b7280] mt-1">Convert list → layout 3D</div>
              </button>
              <button type="button" className="saas-quick-tile" disabled={!canEdit} onClick={() => { void newProject('Blank Canvas'); }}>
                <Wand size={22} className="text-[#1b9d6b] mb-2" />
                <div className="font-semibold text-sm">Blank Canvas</div>
                <div className="text-xs text-[#6b7280] mt-1">Start from zero</div>
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-4 text-[#111827]">Belajar</h3>
            <div className="saas-learn-grid">
              <div className="saas-learn-card">
                <Play size={28} className="text-[#1b9d6b] shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Video Tutorial 5min</div>
                  <div className="text-xs text-[#6b7280]">Tour editor & export cutting list</div>
                </div>
              </div>
              <div className="saas-learn-card">
                <FileText size={28} className="text-[#1b9d6b] shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Quick Guide</div>
                  <div className="text-xs text-[#6b7280]">Tips kitchen set untuk workshop</div>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="saas-stat-card"><strong>{stats.total}</strong><span>Projects</span></div>
            <div className="saas-stat-card"><strong>{stats.complete}</strong><span>Complete</span></div>
            <div className="saas-stat-card"><strong>{stats.draft}</strong><span>Draft</span></div>
            <div className="saas-stat-card"><strong>Rp {(stats.value / 1_000_000).toFixed(0)}M</strong><span>Est. value</span></div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h1 className="text-2xl font-bold text-[#111827]">Recent projects</h1>
            {canEdit && (
              <button type="button" className="saas-btn-primary w-auto px-5 flex items-center gap-2" disabled={busy} onClick={() => { void newProject(); }}>
                <FilePlus2 size={16} /> New Project
              </button>
            )}
          </div>

          <div className="saas-filter-bar">
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter">
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="complete">Complete</option>
            </select>
            <input className="saas-input saas-input-search max-w-xs flex-1" placeholder="Cari…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 14 }} />
            <div className="flex gap-1 ml-auto">
              <button type="button" className={`saas-nav-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')} title="Grid"><Grid2x2 size={18} /></button>
              <button type="button" className={`saas-nav-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} title="List"><List size={18} /></button>
            </div>
          </div>

          {err && <p className="text-sm text-[#dc2626] mb-4">{err}</p>}

          <div className={`saas-project-grid ${view === 'list' ? 'list-view' : ''}`}>
            {canEdit && (
              <button type="button" className="saas-create-card" disabled={busy} onClick={() => { void newProject(); }}>
                <Plus size={28} />
                <span className="font-semibold text-sm">Create New</span>
              </button>
            )}
            {filtered.map((p) => (
              <article key={p.id} className="saas-project-card relative" onClick={() => { if (menuId !== p.id) window.location.href = `/p/${p.id}`; }}>
                <div className="saas-project-thumb">
                  <img src={thumbForProject(p.id)} alt="" />
                  <span className="saas-badge saas-badge-draft absolute top-3 left-3">Draft</span>
                  {canEdit && (
                    <button
                      type="button"
                      className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-white/90 border border-[#e5e7eb] grid place-items-center"
                      onClick={(e) => { e.stopPropagation(); setMenuId(menuId === p.id ? null : p.id); }}
                      aria-label="Menu"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  )}
                  {menuId === p.id && (
                    <div className="saas-context-menu" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => { window.location.href = `/p/${p.id}`; }}>Open</button>
                      <button type="button" onClick={() => setMenuId(null)}>Rename</button>
                      <button type="button" onClick={() => setMenuId(null)}>Duplicate</button>
                      <button type="button" onClick={() => setMenuId(null)}>Share</button>
                      <button type="button" onClick={() => setMenuId(null)}>Export</button>
                      <button type="button" onClick={() => setMenuId(null)}>Archive</button>
                      <button type="button" className="danger" onClick={() => { void remove(p.id); }}>Delete</button>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-[#6b7280] mt-0.5">Kitchen · 300×250 cm</div>
                  <div className="flex items-center justify-between mt-3 text-[11px] text-[#9ca3af]">
                    <span>{new Date(p.updated_at).toLocaleDateString('id-ID')}</span>
                    <span className="flex -space-x-2">
                      <span className="w-6 h-6 rounded-full bg-[#e8f5ef] text-[#1b9d6b] text-[10px] font-bold grid place-items-center border border-white">{displayName[0]?.toUpperCase()}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mt-3 text-sm font-semibold text-[#1b9d6b] bg-transparent border-none cursor-pointer p-0"
                    onClick={(e) => { e.stopPropagation(); window.location.href = `/p/${p.id}`; }}
                  >
                    Open →
                  </button>
                </div>
              </article>
            ))}
          </div>

          <section className="mt-12">
            <h2 className="text-lg font-semibold mb-4 text-[#111827]">Shared with me</h2>
            <p className="text-sm text-[#6b7280] py-6 text-center border border-dashed border-[#e5e7eb] rounded-2xl bg-white">Belum ada proyek yang dibagikan ke Anda.</p>
          </section>
          <section className="mt-8">
            <h2 className="text-lg font-semibold mb-4 text-[#111827]">Suggested for you</h2>
            <div className="saas-template-scroll">
              {TEMPLATES.slice(0, 3).map((t) => (
                <div key={t.name} className="saas-template-card">
                  <div className="saas-project-thumb"><img src={t.img} alt="" /></div>
                  <div className="p-3 text-sm font-medium">{t.name}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {canEdit && !empty && (
        <button type="button" className="saas-fab mobile-only" aria-label="New project" disabled={busy} onClick={() => { void newProject(); }}>+</button>
      )}

      <p className="text-[11px] text-[#9ca3af] mt-10 text-center">
        <a href="/" className="hover:text-[#1b9d6b]">Editor lokal</a> (tanpa akun) · sync otomatis saat online
      </p>
    </DashboardShell>
  );
}
