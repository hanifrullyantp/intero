import { useCallback, useEffect } from "react";
import { useLeadModal } from "@/context/LeadModalContext";
import { scrollToPriceSection } from "@/lib/scrollToPrice";
import { usePublicSettings } from "@/context/PublicSettingsContext";
import { trackContactClick } from "@/lib/tracking";
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
  const onScrollToPrice = useCallback(() => {
    trackContactClick(settings);
    scrollToPriceSection();
  }, [settings]);
  const onLeadOpen = useCallback(() => {
    trackContactClick(settings);
    open();
  }, [settings, open]);

  useEffect(() => {
    if (loading) return;
    const href = settings.sections.hero.imageUrl?.trim();
    if (!href) return;
    const id = "preload-lcp-hero-img";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [loading, settings.sections.hero.imageUrl]);

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
      <LandingNavbar settings={settings} onLead={onLeadOpen} onScrollToPrice={onScrollToPrice} />
      <main>
        <LandingHero
          settings={settings}
          onPrimaryCtaIntent={() => trackContactClick(settings)}
        />
        <LandingProblem settings={settings} />
        <LandingSolution settings={settings} />
        <LandingTaglineBig settings={settings} onLead={onLeadOpen} onScrollToPrice={onScrollToPrice} />
        <LandingSteps settings={settings} onLead={onLeadOpen} onScrollToPrice={onScrollToPrice} />
        <LandingBonus settings={settings} />
        <LandingUrgency settings={settings} onLead={onLeadOpen} onScrollToPrice={onScrollToPrice} />
        <LandingGuarantee settings={settings} />
        <LandingComparison settings={settings} />
        <LandingProductDetails settings={settings} />
        <LandingGallery settings={settings} />
        <LandingFaq settings={settings} />
        <LandingWhyNow settings={settings} />
        <LandingFinalCta settings={settings} onLead={onLeadOpen} onScrollToPrice={onScrollToPrice} />
      </main>
      <LandingFooter settings={settings} onScrollToPrice={onScrollToPrice} />
      <LandingStickyCta settings={settings} onLead={onLeadOpen} onScrollToPrice={onScrollToPrice} />
      <LeadModal />
      <NotificationToast />
    </div>
  );
}
