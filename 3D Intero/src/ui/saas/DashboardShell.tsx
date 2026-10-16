import { useEffect, useRef, useState, type ReactNode } from 'react';
import InteroLogo from '../InteroLogo';
import {
  Home, FolderOpen, Users, LayoutTemplate, Palette, CreditCard, BarChart3, Settings, HelpCircle,
  Bell, Search, ChevronDown, LogOut, User,
} from '../icons';
import type { OrgSummary } from '../../cloud/orgProjects';

export type HubSection = 'home' | 'projects' | 'shared' | 'templates';

const NAV_MAIN: { id: HubSection | 'library'; icon: typeof Home; label: string; href?: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'projects', icon: FolderOpen, label: 'Projects' },
  { id: 'shared', icon: Users, label: 'Shared' },
  { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
  { id: 'library', icon: Palette, label: 'Library', href: '/' },
];

export default function DashboardShell({
  children,
  userEmail,
  displayName,
  orgs,
  orgId,
  onOrgChange,
  onSignOut,
  searchQuery,
  onSearchChange,
  activeSection,
  onSectionChange,
  onNewProject,
  canCreate,
}: {
  children: ReactNode;
  userEmail: string;
  displayName: string;
  orgs: OrgSummary[];
  orgId: string | null;
  onOrgChange: (id: string) => void;
  onSignOut: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeSection: HubSection;
  onSectionChange: (s: HubSection) => void;
  onNewProject: () => void;
  canCreate: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentOrg = orgs.find((o) => o.id === orgId);

  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.dataset.saas = '1';
    const h = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', h);
    return () => {
      window.removeEventListener('mousedown', h);
      delete document.documentElement.dataset.saas;
    };
  }, []);

  return (
    <div className="saas-app">
      <header className="saas-dash-header">
        <a href="/app" className="flex items-center gap-2 shrink-0 no-underline text-inherit">
          <InteroLogo size={36} className="rounded-lg" />
          <span className="font-bold text-[#111827] hidden sm:inline">Instant 3D</span>
        </a>
        {orgs.length > 0 && (
          <div className="relative hidden md:block min-w-[140px]">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm bg-white cursor-pointer">
              <span className="max-w-[160px] truncate">{currentOrg?.name ?? 'Workspace'}</span>
              <ChevronDown size={14} className="opacity-50 shrink-0" />
              <select
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                value={orgId ?? ''}
                onChange={(e) => onOrgChange(e.target.value)}
                aria-label="Switch workspace"
              >
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
          </div>
        )}
        <div className="flex-1 max-w-md mx-auto hidden sm:block">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
            <input
              className="saas-input saas-input-search"
              placeholder="Cari proyek…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        <div className="relative">
          <button type="button" className="saas-nav-btn" title="Notifikasi" onClick={() => setNotifOpen((o) => !o)}>
            <Bell size={18} />
          </button>
          {notifOpen && (
            <div className="saas-dropdown" style={{ right: 0, minWidth: 260 }}>
              <p className="px-3 py-2 text-xs text-[#6b7280]">Belum ada notifikasi baru.</p>
              <button type="button" onClick={() => setNotifOpen(false)}>Tutup</button>
            </div>
          )}
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-[#e8f5ef] text-[#1b9d6b] font-bold text-sm grid place-items-center border-2 border-white shadow-sm cursor-pointer"
            onClick={() => setMenuOpen((o) => !o)}
            title="Akun"
          >
            {(displayName[0] || userEmail[0] || '?').toUpperCase()}
          </button>
          {menuOpen && (
            <div className="saas-dropdown">
              <div className="px-3 py-2 border-b border-[#e5e7eb] mb-1">
                <div className="font-semibold text-sm">{displayName}</div>
                <div className="text-xs text-[#6b7280] truncate">{userEmail}</div>
                <div className="text-[10px] text-[#9ca3af] mt-1">{currentOrg?.name} · {currentOrg?.plan ?? 'free'}</div>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)}><User size={14} className="inline mr-2 opacity-60" /> Profile</button>
              <button type="button" onClick={() => setMenuOpen(false)}><Settings size={14} className="inline mr-2 opacity-60" /> Settings</button>
              <button type="button" onClick={() => setMenuOpen(false)}><CreditCard size={14} className="inline mr-2 opacity-60" /> Billing</button>
              <button type="button" className="danger" onClick={() => { setMenuOpen(false); onSignOut(); }}><LogOut size={14} className="inline mr-2" /> Sign out</button>
            </div>
          )}
        </div>
      </header>

      <div className="saas-dash-body">
        <nav className="saas-side-nav" aria-label="Main">
          {NAV_MAIN.map((n) => {
            if (n.href) {
              return (
                <a key={n.id} href={n.href} className="saas-nav-btn" title={n.label}>
                  <n.icon size={20} />
                  <span className="saas-nav-tip">{n.label}</span>
                </a>
              );
            }
            const active = activeSection === n.id;
            return (
              <button
                key={n.id}
                type="button"
                className={`saas-nav-btn ${active ? 'active' : ''}`}
                title={n.label}
                onClick={() => onSectionChange(n.id as HubSection)}
              >
                <n.icon size={20} />
                <span className="saas-nav-tip">{n.label}</span>
              </button>
            );
          })}
          <div className="w-8 h-px bg-[#e5e7eb] my-2" />
          {[
            { id: 'billing', icon: CreditCard, label: 'Billing' },
            { id: 'analytics', icon: BarChart3, label: 'Analytics' },
            { id: 'settings', icon: Settings, label: 'Settings' },
            { id: 'help', icon: HelpCircle, label: 'Help' },
          ].map((n) => (
            <button key={n.id} type="button" className="saas-nav-btn" title={n.label} onClick={() => window.open('https://intero.id', '_blank')}>
              <n.icon size={20} />
              <span className="saas-nav-tip">{n.label}</span>
            </button>
          ))}
        </nav>
        <main className="saas-main flex-1 w-full min-w-0">{children}</main>
      </div>

      <nav className="saas-mobile-bottom mobile-only" aria-label="Mobile">
        <button type="button" className={`text-xs flex flex-col items-center border-none bg-transparent ${activeSection === 'home' ? 'text-[#1b9d6b]' : 'text-[#6b7280]'}`} onClick={() => onSectionChange('home')}>
          <Home size={20} /> Home
        </button>
        <button type="button" className={`text-xs flex flex-col items-center border-none bg-transparent ${activeSection === 'projects' ? 'text-[#1b9d6b]' : 'text-[#6b7280]'}`} onClick={() => onSectionChange('projects')}>
          <FolderOpen size={20} /> Projects
        </button>
        {canCreate && (
          <button type="button" className="text-xs flex flex-col items-center text-[#1b9d6b] border-none bg-transparent font-semibold" onClick={onNewProject}>
            <span className="w-10 h-10 rounded-full bg-[#1b9d6b] text-white grid place-items-center text-xl -mt-4 shadow-lg">+</span>
            New
          </button>
        )}
        <a href="/" className="text-[#6b7280] text-xs flex flex-col items-center no-underline">
          <Palette size={20} /> Editor
        </a>
      </nav>
    </div>
  );
}
