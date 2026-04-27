import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  ClipboardList,
  Code,
  FileText,
  HelpCircle,
  Layout,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Palette,
  PanelLeft,
  Phone,
  Search,
  Users,
} from "lucide-react";
import { fetchAdminMe, fetchAdminSettings, logoutAdmin } from "@/lib/api";
import { AdminProvider } from "@/admin/adminContext";
import type { SiteSettings } from "@/types/site-settings";
import { getDefaultSiteSettings } from "@/types/site-settings";
import { cn } from "@/utils/cn";

const SIDEBAR_COLLAPSED_KEY = "intero-admin-sidebar-collapsed";

type NavDef = { to: string; label: string; icon: typeof LayoutDashboard };

const NAV: NavDef[] = [
  { to: "/admin/dashboard", label: "Beranda", icon: LayoutDashboard },
  { to: "/admin/global", label: "Global & merek", icon: Palette },
  { to: "/admin/contact", label: "Kontak & sosial", icon: Phone },
  { to: "/admin/form", label: "FORM", icon: ClipboardList },
  { to: "/admin/seo", label: "SEO & tracking", icon: Search },
  { to: "/admin/toast", label: "Notifikasi toast", icon: Bell },
  { to: "/admin/faq", label: "FAQ", icon: HelpCircle },
  { to: "/admin/footer", label: "Footer & privasi", icon: FileText },
  { to: "/admin/sections", label: "Konten landing (visual)", icon: Layout },
  { to: "/admin/sections-json", label: "Konten landing (JSON)", icon: Code },
  { to: "/admin/leads", label: "CRM & leads", icon: Users },
  { to: "/admin/crm-settings", label: "CRM — template & kategori", icon: MessageSquare },
];

export default function AdminLayout() {
  const nav = useNavigate();
  const [boot, setBoot] = useState<"loading" | "ok" | "fail">("loading");
  const [initial, setInitial] = useState<SiteSettings | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    (async () => {
      const me = await fetchAdminMe();
      if (!me) {
        setBoot("fail");
        nav("/admin/login", { replace: true });
        return;
      }
      try {
        const s = await fetchAdminSettings();
        setInitial(s);
      } catch {
        setInitial(getDefaultSiteSettings());
      }
      setBoot("ok");
    })();
  }, [nav]);

  async function onLogout() {
    await logoutAdmin();
    nav("/admin/login", { replace: true });
  }

  if (boot === "loading" || !initial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900 text-white">
        Memuat panel…
      </div>
    );
  }

  return (
    <AdminProvider initial={initial}>
      <div className="min-h-screen flex bg-gray-100 font-sans text-navy-900">
        <aside
          className={cn(
            "bg-navy-900 text-white flex flex-col shrink-0 transition-[width] duration-200 ease-out",
            collapsed ? "w-[4.25rem]" : "w-56",
          )}
        >
          <div
            className={cn(
              "border-b border-white/10 flex items-center gap-2 shrink-0",
              collapsed ? "flex-col py-3 px-2" : "p-4 justify-between",
            )}
          >
            {!collapsed && <div className="font-black text-lg truncate">Intero CMS</div>}
            {collapsed && (
              <div className="font-black text-sm w-10 h-10 flex items-center justify-center rounded-lg bg-white/10">
                I
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className={cn(
                "rounded-lg p-2 text-blue-100/90 hover:bg-white/10 hover:text-white transition-colors",
                collapsed && "mt-1",
              )}
              title={collapsed ? "Perluas menu" : "Kecilkan menu"}
              aria-expanded={!collapsed}
            >
              <PanelLeft className={cn("h-5 w-5 transition-transform", collapsed && "scale-x-[-1]")} />
            </button>
          </div>
          <nav className="p-2 space-y-1 flex-1 overflow-y-auto overflow-x-hidden">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                    collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
                    isActive ? "bg-white/15 text-white" : "text-blue-100/80 hover:bg-white/10",
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="p-2 border-t border-white/10 shrink-0">
            <button
              type="button"
              onClick={onLogout}
              title={collapsed ? "Keluar" : undefined}
              className={cn(
                "w-full rounded-lg text-sm text-red-300 hover:bg-white/10 hover:text-red-200 transition-colors flex items-center gap-3",
                collapsed ? "justify-center px-2 py-2.5" : "text-left px-3 py-2",
              )}
            >
              <LogOut className="h-5 w-5 shrink-0" aria-hidden />
              {!collapsed && <span>Keluar</span>}
            </button>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </AdminProvider>
  );
}
