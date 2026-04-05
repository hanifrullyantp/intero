import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { fetchAdminMe, fetchAdminSettings, logoutAdmin } from "@/lib/api";
import { AdminProvider } from "@/admin/adminContext";
import type { SiteSettings } from "@/types/site-settings";
import { getDefaultSiteSettings } from "@/types/site-settings";

const navCls = ({ isActive }: { isActive: boolean }) =>
  `block px-4 py-2 rounded-lg text-sm font-medium ${
    isActive ? "bg-white/15 text-white" : "text-blue-100/80 hover:bg-white/10"
  }`;

export default function AdminLayout() {
  const nav = useNavigate();
  const [boot, setBoot] = useState<"loading" | "ok" | "fail">("loading");
  const [initial, setInitial] = useState<SiteSettings | null>(null);

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
        <aside className="w-56 bg-navy-900 text-white flex flex-col shrink-0">
          <div className="p-4 font-black text-lg border-b border-white/10">Intero CMS</div>
          <nav className="p-3 space-y-1 flex-1">
            <NavLink to="/admin/dashboard" className={navCls}>
              Beranda
            </NavLink>
            <NavLink to="/admin/global" className={navCls}>
              Global & merek
            </NavLink>
            <NavLink to="/admin/contact" className={navCls}>
              Kontak & sosial
            </NavLink>
            <NavLink to="/admin/seo" className={navCls}>
              SEO & tracking
            </NavLink>
            <NavLink to="/admin/toast" className={navCls}>
              Notifikasi toast
            </NavLink>
            <NavLink to="/admin/faq" className={navCls}>
              FAQ
            </NavLink>
            <NavLink to="/admin/footer" className={navCls}>
              Footer & privasi
            </NavLink>
            <NavLink to="/admin/sections" className={navCls}>
              Konten landing
            </NavLink>
            <NavLink to="/admin/leads" className={navCls}>
              Leads
            </NavLink>
          </nav>
          <div className="p-3 border-t border-white/10">
            <button
              type="button"
              onClick={onLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-white/10 rounded-lg"
            >
              Keluar
            </button>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </AdminProvider>
  );
}
