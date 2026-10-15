import { useEffect, useRef, useState, type ReactNode } from 'react';
import InteroLogo from '../InteroLogo';
import {
  Home, FolderOpen, Users, LayoutTemplate, Palette, CreditCard, BarChart3, Settings, HelpCircle,
  Bell, Search, ChevronDown, LogOut, User,
} from '../icons';
import type { OrgSummary } from '../../cloud/orgProjects';

const NAV_MAIN = [
  { id: 'home', icon: Home, label: 'Home', href: '/app' },
  { id: 'projects', icon: FolderOpen, label: 'Projects', href: '/app' },
  { id: 'shared', icon: Users, label: 'Shared', href: '/app' },
  { id: 'templates', icon: LayoutTemplate, label: 'Templates', href: '/app' },
  { id: 'library', icon: Palette, label: 'Library', href: '/' },
];
const NAV_BOTTOM = [
  { id: 'billing', icon: CreditCard, label: 'Billing' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'help', icon: HelpCircle, label: 'Help' },
];

export default function DashboardShell({
  children,
  userEmail,
  displayName,
  orgs,
  orgId,
  onOrgChange,
  onSignOut,
}: {
  children: ReactNode;
  userEmail: string;
  displayName: string;
  orgs: OrgSummary[];
  orgId: string | null;
  onOrgChange: (id: string) => void;
  onSignOut: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentOrg = orgs.find((o) => o.id === orgId);

  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    const h = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="saas-app">
      <header className="saas-dash-header">
        <div className="flex items-center gap-2 shrink-0">
          <InteroLogo size={36} className="rounded-lg" />
          <span className="font-bold text-[#111827] hidden sm:inline">Instant 3D</span>
        </div>
        {orgs.length > 0 && (
          <div className="relative hidden md:block">
            <button type="button" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm bg-white" onClick={() => {}}>
              <span className="max-w-[160px] truncate">{currentOrg?.name ?? 'Workspace'}</span>
              <ChevronDown size={14} className="opacity-50" />
            </button>
            {orgs.length > 1 && (
              <select
                className="absolute inset-0 opacity-0 cursor-pointer"
                value={orgId ?? ''}
                onChange={(e) => onOrgChange(e.target.value)}
                aria-label="Switch workspace"
              >
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            )}
          </div>
        )}
        <div className="flex-1 max-w-md mx-auto hidden sm:block">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input className="saas-input saas-input-search" placeholder="Cari proyek…" />
          </div>
        </div>
        <button type="button" className="saas-nav-btn" title="Notifikasi"><Bell size={18} /></button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-[#e8f5ef] text-[#1b9d6b] font-bold text-sm grid place-items-center border-2 border-white shadow-sm"
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
              <button type="button"><User size={14} className="inline mr-2 opacity-60" /> Profile</button>
              <button type="button"><Settings size={14} className="inline mr-2 opacity-60" /> Settings</button>
              <button type="button"><CreditCard size={14} className="inline mr-2 opacity-60" /> Billing</button>
              <button type="button" className="danger" onClick={() => { setMenuOpen(false); onSignOut(); }}><LogOut size={14} className="inline mr-2" /> Sign out</button>
            </div>
          )}
        </div>
      </header>

      <div className="saas-dash-body">
        <nav className="saas-side-nav" aria-label="Main">
          {NAV_MAIN.map((n) => (
            <a key={n.id} href={n.href} className={`saas-nav-btn ${n.id === 'projects' ? 'active' : ''}`} title={n.label}>
              <n.icon size={20} />
              <span className="saas-nav-tip">{n.label}</span>
            </a>
          ))}
          <div className="w-8 h-px bg-[#e5e7eb] my-2" />
          {NAV_BOTTOM.map((n) => (
            <button key={n.id} type="button" className="saas-nav-btn" title={n.label}>
              <n.icon size={20} />
              <span className="saas-nav-tip">{n.label}</span>
            </button>
          ))}
        </nav>
        <main className="saas-main flex-1">{children}</main>
      </div>

      <nav className="saas-mobile-bottom mobile-only" aria-label="Mobile">
        <a href="/app" className="text-[#1b9d6b] text-xs flex flex-col items-center"><Home size={20} /> Home</a>
        <a href="/app" className="text-[#6b7280] text-xs flex flex-col items-center"><FolderOpen size={20} /> Projects</a>
        <a href="/" className="text-[#6b7280] text-xs flex flex-col items-center"><Palette size={20} /> Editor</a>
      </nav>
    </div>
  );
}
