import { useCallback } from "react";
import { useLeadModal } from "@/context/LeadModalContext";
import { scrollToPriceSection } from "@/lib/scrollToPrice";
import { usePublicSettings } from "@/context/PublicSettingsContext";
import { GlobalStyles } from "@/components/GlobalStyles";
import { LeadModal } from "@/components/LeadModal";
import { NotificationToast } from "@/components/NotificationToast";
import {
  LandingNavbar,
  LandingHero,
  LandingProblem,
  LandingSolution,
  LandingTaglineBig,
  LandingSteps,
  LandingBonus,
  LandingUrgency,
  LandingGuarantee,
  LandingComparison,
  LandingProductDetails,
  LandingGallery,
  LandingWhyNow,
  LandingFinalCta,
  LandingStickyCta,
  LandingFaq,
  LandingFooter,
} from "@/landing/sections";

export default function LandingPage() {
  const { settings, loading } = usePublicSettings();
  const { open } = useLeadModal();
  const onScrollToPrice = useCallback(() => scrollToPriceSection(), []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900 text-white font-sans">
        Memuat…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-navy-900 selection:bg-gold-500 selection:text-navy-900">
      <GlobalStyles settings={settings} />
      <LandingNavbar settings={settings} onLead={open} onScrollToPrice={onScrollToPrice} />
      <main>
        <LandingHero settings={settings} />
        <LandingProblem settings={settings} />
        <LandingSolution settings={settings} />
        <LandingTaglineBig settings={settings} onLead={open} onScrollToPrice={onScrollToPrice} />
        <LandingSteps settings={settings} onLead={open} onScrollToPrice={onScrollToPrice} />
        <LandingBonus settings={settings} />
        <LandingUrgency settings={settings} onLead={open} onScrollToPrice={onScrollToPrice} />
        <LandingGuarantee settings={settings} />
        <LandingComparison settings={settings} />
        <LandingProductDetails settings={settings} />
        <LandingGallery settings={settings} />
        <LandingFaq settings={settings} />
        <LandingWhyNow settings={settings} />
        <LandingFinalCta settings={settings} onLead={open} onScrollToPrice={onScrollToPrice} />
      </main>
      <LandingFooter settings={settings} onScrollToPrice={onScrollToPrice} />
      <LandingStickyCta settings={settings} onLead={open} onScrollToPrice={onScrollToPrice} />
      <LeadModal />
      <NotificationToast />
    </div>
  );
}
