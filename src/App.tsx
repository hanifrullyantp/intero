import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { PublicSettingsProvider } from "@/context/PublicSettingsContext";
import { LeadModalProvider } from "@/context/LeadModalContext";
import LandingPage from "@/pages/LandingPage";
import PrivacyPage from "@/pages/PrivacyPage";
import PricelistPage from "@/pages/PricelistPage";
import AdminLogin from "@/admin/AdminLogin";
import AdminLayout from "@/admin/AdminLayout";
import Dashboard from "@/admin/pages/Dashboard";
import GlobalPage from "@/admin/pages/GlobalPage";
import ContactPage from "@/admin/pages/ContactPage";
import SeoPage from "@/admin/pages/SeoPage";
import ToastPage from "@/admin/pages/ToastPage";
import FaqPage from "@/admin/pages/FaqPage";
import FooterPage from "@/admin/pages/FooterPage";
import SectionsJsonPage from "@/admin/pages/SectionsJsonPage";
import SectionsVisualPage from "@/admin/pages/SectionsVisualPage";
import LeadsPage from "@/admin/pages/LeadsPage";
import CrmSettingsPage from "@/admin/pages/CrmSettingsPage";

function PublicShell() {
  return (
    <PublicSettingsProvider>
      <LeadModalProvider>
        <Outlet />
      </LeadModalProvider>
    </PublicSettingsProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicShell />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/pricelist" element={<PricelistPage />} />
        </Route>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="global" element={<GlobalPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="seo" element={<SeoPage />} />
          <Route path="toast" element={<ToastPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="footer" element={<FooterPage />} />
          <Route path="sections" element={<SectionsVisualPage />} />
          <Route path="sections-json" element={<SectionsJsonPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="crm-settings" element={<CrmSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
