import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import {
  createCloudProject,
  duplicateCloudProject,
  ensurePersonalWorkspace,
  fetchMyOrganizations,
  fetchProjectPayload,
  listOrgProjects,
  renameProject,
  softDeleteProject,
  type OrgSummary,
  type ProjectSummary,
} from '../cloud/orgProjects';
import { createShareLink } from '../core/share';
import { useWorkspaceStore } from '../workspace/workspaceStore';
import { canEditProjects } from '../permissions/roles';
import type { OrgRole } from '../permissions/roles';
import DashboardShell, { type HubSection } from './saas/DashboardShell';
import OnboardingWizard from './saas/OnboardingWizard';
import KitchenPreviewVisual from './saas/KitchenPreviewVisual';
import SaasToast from './saas/SaasToast';
import { useSaasPage } from './saas/useSaasPage';
import {
  FilePlus2, Plus, Rocket, PencilRuler, Calculator, Wand, Play, FileText,
  MoreHorizontal, Grid2x2, List, ArrowRight,
} from './icons';

const ORG_KEY = 'instant3d_last_org';

const TEMPLATES = [
  { name: 'Modern L-Shape', dim: '300×250 cm', variant: 0 },
  { name: 'Scandinavian I', dim: '280×220 cm', variant: 1 },
  { name: 'Classic U', dim: '320×280 cm', variant: 2 },
  { name: 'Industrial Island', dim: '340×260 cm', variant: 3 },
];

function onboardingKey(userId: string) {
  return `instant3d_onboarding_done_${userId}`;
}

function displayNameFromUser(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const meta = user.user_metadata?.full_name;
  if (typeof meta === 'string' && meta.trim()) return meta.trim();
  return user.email?.split('@')[0] ?? 'Designer';
}

export default function ProjectHub() {
  useSaasPage('Dashboard · Instant 3D');
  const { user, loading, signOut, configured } = useAuth();
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [orgId, setOrgId] = useState<string | null>(() => {
    try { return localStorage.getItem(ORG_KEY); } catch { return null; }
  });
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'info' | 'success' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all' | 'draft' | 'complete'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [query, setQuery] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [hubSection, setHubSection] = useState<HubSection>('home');

  const templatesRef = useRef<HTMLElement>(null);
  const projectsRef = useRef<HTMLElement>(null);
  const sharedRef = useRef<HTMLElement>(null);

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
    void (async () => {
      try {
        let list = await fetchMyOrganizations();
        if (!list.length) {
          await ensurePersonalWorkspace();
          list = await fetchMyOrganizations();
        }
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
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!orgId || !user) return;
    setProjectsLoading(true);
    void listOrgProjects(orgId)
      .then(setProjects)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setProjectsLoading(false));
  }, [orgId, user]);

  useEffect(() => {
    const close = () => setMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const currentOrg = orgs.find((o) => o.id === orgId);
  const canEdit = canEditProjects((currentOrg?.role as OrgRole) ?? null);

  const filtered = useMemo(() => {
    let list = [...projects];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filter === 'complete') list = [];
    return list;
  }, [projects, query, filter]);

  const stats = useMemo(() => {
    const total = projects.length;
    return { total, draft: total, complete: 0, value: total * 3_750_000 };
  }, [projects]);

  const notify = (msg: string, tone: 'info' | 'success' | 'error' = 'info') => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 6000);
  };

  const newProject = async (name?: string) => {
    if (!orgId || !canEdit) {
      notify('Anda tidak punya izin membuat proyek di workspace ini.', 'error');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const id = await createCloudProject(orgId, name ?? `Project ${projects.length + 1}`);
      window.location.href = `/p/${id}`;
    } catch (e) {
      const msg = (e as Error).message;
      setErr(msg);
      notify(msg, 'error');
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
      notify('Proyek dihapus.', 'success');
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  };

  const rename = async (p: ProjectSummary) => {
    setMenuId(null);
    const next = window.prompt('Nama proyek baru:', p.name);
    if (next == null || next.trim() === p.name) return;
    try {
      await renameProject(p.id, next);
      setProjects((list) => list.map((x) => (x.id === p.id ? { ...x, name: next.trim() } : x)));
      notify('Nama proyek diperbarui.', 'success');
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  };

  const duplicate = async (p: ProjectSummary) => {
    if (!orgId || !canEdit) return;
    setMenuId(null);
    setBusy(true);
    try {
      const id = await duplicateCloudProject(orgId, p.id);
      const list = await listOrgProjects(orgId);
      setProjects(list);
      notify('Duplikat dibuat.', 'success');
      window.location.href = `/p/${id}`;
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const shareProject = async (p: ProjectSummary) => {
    setMenuId(null);
    setBusy(true);
    try {
      const payload = await fetchProjectPayload(p.id);
      const { url } = await createShareLink(payload);
      await navigator.clipboard.writeText(url);
      notify('Link view-only disalin ke clipboard.', 'success');
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const exportProject = (id: string) => {
    setMenuId(null);
    window.location.href = `/p/${id}`;
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

  const goSection = (s: HubSection) => {
    setHubSection(s);
    const ref = s === 'templates' ? templatesRef : s === 'shared' ? sharedRef : s === 'projects' ? projectsRef : null;
    ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!configured) {
    return (
      <div className="saas-app p-8 text-center min-h-dvh grid place-items-center">
        <div>
          <p className="text-sm mb-4 text-[#6b7280]">Cloud workspace membutuhkan env Supabase (VITE_SUPABASE_URL).</p>
          <a href="/" className="saas-btn-primary saas-btn-inline">Buka editor lokal</a>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="saas-app min-h-dvh p-8 max-w-lg mx-auto space-y-4">
        <div className="saas-skeleton h-10 w-48" />
        <div className="saas-skeleton h-32 w-full" />
        <div className="saas-skeleton h-48 w-full" />
      </div>
    );
  }
  if (!user) {
    window.location.replace('/?auth=login');
    return null;
  }

  const empty = projects.length === 0;
  const showWelcome = empty && (hubSection === 'home' || hubSection === 'projects');
  const showProjectGrid = !empty && (hubSection === 'home' || hubSection === 'projects');

  const templatesBlock = (
    <section id="templates" ref={templatesRef} className="mb-10">
      <h3 className="text-lg font-semibold mb-4 text-[#111827]">Template populer</h3>
      <div className="saas-template-scroll">
        {TEMPLATES.map((t) => (
          <div key={t.name} className="saas-template-card">
            <div className="saas-project-thumb p-3 flex items-center justify-center">
              <KitchenPreviewVisual variant={t.variant} className="saas-kitchen-preview--fill" />
            </div>
            <div className="p-4 pt-2">
              <div className="font-semibold text-sm">{t.name}</div>
              <div className="text-xs text-[#6b7280] mb-3">{t.dim}</div>
              <button type="button" className="text-sm font-semibold text-[#1b9d6b] flex items-center gap-1 bg-transparent border-none cursor-pointer p-0" disabled={!canEdit || busy} onClick={() => { void newProject(t.name); }}>
                Use <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  const quickStartBlock = (
    <section className="mb-10">
      <h3 className="text-lg font-semibold mb-4 text-[#111827]">Quick start</h3>
      <div className="saas-quick-grid">
        <button type="button" className="saas-quick-tile" disabled={busy || !canEdit} onClick={() => { void newProject('Magic Wizard'); }}>
          <Rocket size={22} className="text-[#1b9d6b] mb-2" />
          <div className="font-semibold text-sm">Magic Wizard</div>
          <div className="text-xs text-[#6b7280] mt-1">Auto-generate 3D dari brief singkat</div>
        </button>
        <button type="button" className="saas-quick-tile" onClick={() => { window.location.href = '/'; }}>
          <PencilRuler size={22} className="text-[#1b9d6b] mb-2" />
          <div className="font-semibold text-sm">Import File</div>
          <div className="text-xs text-[#6b7280] mt-1">SKP / DXF / JSON (editor lokal)</div>
        </button>
        <button type="button" className="saas-quick-tile" disabled={busy || !canEdit} onClick={() => { void newProject('From Estimator'); }}>
          <Calculator size={22} className="text-[#1b9d6b] mb-2" />
          <div className="font-semibold text-sm">From Estimator</div>
          <div className="text-xs text-[#6b7280] mt-1">Convert list → layout 3D</div>
        </button>
        <button type="button" className="saas-quick-tile" disabled={busy || !canEdit} onClick={() => { void newProject('Blank Canvas'); }}>
          <Wand size={22} className="text-[#1b9d6b] mb-2" />
          <div className="font-semibold text-sm">Blank Canvas</div>
          <div className="text-xs text-[#6b7280] mt-1">Start from zero</div>
        </button>
      </div>
    </section>
  );

  const learnBlock = (
    <section className="mb-10">
      <h3 className="text-lg font-semibold mb-4 text-[#111827]">Belajar</h3>
      <div className="saas-learn-grid">
        <button type="button" className="saas-learn-card w-full text-left border-none" onClick={() => window.open('https://www.youtube.com/results?search_query=kitchen+set+design+tutorial', '_blank')}>
          <Play size={28} className="text-[#1b9d6b] shrink-0" />
          <div>
            <div className="font-semibold text-sm">Video Tutorial 5min</div>
            <div className="text-xs text-[#6b7280]">Tour editor & export cutting list</div>
          </div>
        </button>
        <button type="button" className="saas-learn-card w-full text-left border-none" onClick={() => window.open('https://intero.id', '_blank')}>
          <FileText size={28} className="text-[#1b9d6b] shrink-0" />
          <div>
            <div className="font-semibold text-sm">Quick Guide</div>
            <div className="text-xs text-[#6b7280]">Tips kitchen set untuk workshop</div>
          </div>
        </button>
      </div>
    </section>
  );

  const projectGrid = (
    <section ref={projectsRef}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-[#111827]">{empty ? 'Projects' : 'Recent projects'}</h1>
        {canEdit && (
          <button type="button" className="saas-btn-primary saas-btn-inline" disabled={busy} onClick={() => { void newProject(); }}>
            <FilePlus2 size={16} /> New Project
          </button>
        )}
      </div>

      {!empty && (
        <div className="saas-filter-bar">
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter">
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="complete">Complete</option>
          </select>
          <input className="saas-input flex-1 min-w-[120px] max-w-xs sm:hidden" placeholder="Cari…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="flex gap-1 ml-auto">
            <button type="button" className={`saas-nav-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')} title="Grid"><Grid2x2 size={18} /></button>
            <button type="button" className={`saas-nav-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} title="List"><List size={18} /></button>
          </div>
        </div>
      )}

      {projectsLoading ? (
        <div className="saas-project-grid">
          {[1, 2, 3].map((i) => <div key={i} className="saas-skeleton h-52" />)}
        </div>
      ) : (
        <div className={`saas-project-grid ${view === 'list' ? 'list-view' : ''}`}>
          {canEdit && (
            <button type="button" className="saas-create-card" disabled={busy} onClick={() => { void newProject(); }}>
              <Plus size={28} />
              <span className="font-semibold text-sm">Create New</span>
            </button>
          )}
          {filtered.map((p, idx) => (
            <article
              key={p.id}
              className="saas-project-card relative"
              onClick={() => { if (menuId !== p.id) window.location.href = `/p/${p.id}`; }}
            >
              <div className="saas-project-thumb flex items-center justify-center p-2">
                <KitchenPreviewVisual variant={idx} className="saas-kitchen-preview--fill" />
                <span className="saas-badge saas-badge-draft absolute top-3 left-3">Draft</span>
                {canEdit && (
                  <button
                    type="button"
                    className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-white/90 border border-[#e5e7eb] grid place-items-center cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setMenuId(menuId === p.id ? null : p.id); }}
                    aria-label="Menu"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                )}
                {menuId === p.id && (
                  <div className="saas-context-menu" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => { window.location.href = `/p/${p.id}`; }}>Open</button>
                    <button type="button" onClick={() => { void rename(p); }}>Rename</button>
                    <button type="button" onClick={() => { void duplicate(p); }}>Duplicate</button>
                    <button type="button" onClick={() => { void shareProject(p); }}>Share</button>
                    <button type="button" onClick={() => exportProject(p.id)}>Export</button>
                    <button type="button" onClick={() => { setMenuId(null); notify('Arsip — segera hadir. Gunakan Hapus jika perlu.', 'info'); }}>Archive</button>
                    <button type="button" className="danger" onClick={() => { void remove(p.id); }}>Delete</button>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-xs text-[#6b7280] mt-0.5">Kitchen · 300×250 cm</div>
                <div className="flex items-center justify-between mt-3 text-[11px] text-[#9ca3af]">
                  <span>{new Date(p.updated_at).toLocaleDateString('id-ID')}</span>
                  <span className="w-6 h-6 rounded-full bg-[#e8f5ef] text-[#1b9d6b] text-[10px] font-bold grid place-items-center border border-white">{displayName[0]?.toUpperCase()}</span>
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
      )}
      {!projectsLoading && !empty && filtered.length === 0 && (
        <p className="text-sm text-[#6b7280] py-8 text-center">Tidak ada proyek cocok dengan filter/pencarian.</p>
      )}
    </section>
  );

  const sharedBlock = (
    <section ref={sharedRef} className="mt-12">
      <h2 className="text-lg font-semibold mb-4 text-[#111827]">Shared with me</h2>
      <p className="text-sm text-[#6b7280] py-6 text-center border border-dashed border-[#e5e7eb] rounded-2xl bg-white">Belum ada proyek yang dibagikan ke Anda.</p>
    </section>
  );

  return (
    <DashboardShell
      userEmail={user.email ?? ''}
      displayName={displayName}
      orgs={orgs}
      orgId={orgId}
      onOrgChange={onOrgChange}
      onSignOut={() => { void signOut().then(() => { window.location.replace('/login'); }); }}
      searchQuery={query}
      onSearchChange={setQuery}
      activeSection={hubSection}
      onSectionChange={goSection}
      onNewProject={() => { void newProject(); }}
      canCreate={canEdit}
    >
      {toast && <SaasToast message={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}

      {showOnboard && <OnboardingWizard name={displayName} onDone={finishOnboarding} />}

      {err && <p className="text-sm text-[#dc2626] mb-4">{err}</p>}

      {showWelcome && (
        <>
          <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-2">
            Hi, {displayName.split(' ')[0]}! 👋 Selamat datang di Instant 3D
          </h1>
          <p className="text-[#6b7280] mb-8 max-w-xl">Mulai dari template atau canvas kosong — design kitchen set impian Anda dalam hitungan menit.</p>
          <div className="saas-cta-hero mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-2">Buat design pertama Anda</h2>
            <p className="text-white/90 text-sm mb-6 max-w-md">Parametric 3D, cutting list, dan estimasi harga — siap presentasi ke klien.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="saas-btn-secondary bg-white/95 border-none font-semibold" disabled={busy || !canEdit} onClick={() => { void newProject(); }}>
                <Plus size={16} className="inline mr-1" /> New Project
              </button>
              <button type="button" className="saas-btn-secondary bg-transparent text-white border-white/40" onClick={() => goSection('templates')}>
                Browse Templates
              </button>
            </div>
          </div>
          {(hubSection === 'home' || hubSection === 'templates') && templatesBlock}
          {(hubSection === 'home' || hubSection === 'templates') && quickStartBlock}
          {hubSection === 'home' && learnBlock}
          {hubSection === 'projects' && projectGrid}
        </>
      )}

      {showProjectGrid && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="saas-stat-card"><strong>{stats.total}</strong><span>Projects</span></div>
            <div className="saas-stat-card"><strong>{stats.complete}</strong><span>Complete</span></div>
            <div className="saas-stat-card"><strong>{stats.draft}</strong><span>Draft</span></div>
            <div className="saas-stat-card"><strong>Rp {(stats.value / 1_000_000).toFixed(0)}M</strong><span>Est. value</span></div>
          </div>
          {projectGrid}
        </>
      )}

      {hubSection === 'templates' && !showWelcome && (
        <>
          <h1 className="text-2xl font-bold mb-6 text-[#111827]">Templates</h1>
          {templatesBlock}
          {quickStartBlock}
        </>
      )}

      {(hubSection === 'shared' || (showProjectGrid && hubSection === 'home')) && sharedBlock}

      {showProjectGrid && hubSection === 'home' && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-4 text-[#111827]">Suggested for you</h2>
          <div className="saas-template-scroll">
            {TEMPLATES.slice(0, 3).map((t) => (
              <button key={t.name} type="button" className="saas-template-card text-left border-none cursor-pointer" disabled={!canEdit} onClick={() => { void newProject(t.name); }}>
                <div className="saas-project-thumb p-2"><KitchenPreviewVisual variant={t.variant} /></div>
                <div className="p-3 text-sm font-medium">{t.name}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {hubSection === 'shared' && !showWelcome && (
        <section className="mt-8">
          <h1 className="text-2xl font-bold mb-4 text-[#111827]">Shared with me</h1>
          {sharedBlock}
        </section>
      )}

      {canEdit && showProjectGrid && (
        <button type="button" className="saas-fab mobile-only" aria-label="New project" disabled={busy} onClick={() => { void newProject(); }}>+</button>
      )}

      <p className="text-[11px] text-[#9ca3af] mt-10 text-center pb-4">
        <a href="/" className="hover:text-[#1b9d6b]">Editor lokal</a> (tanpa akun) · sync otomatis saat online
      </p>
    </DashboardShell>
  );
}
