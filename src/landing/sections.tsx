import { useState, useEffect, type ReactNode } from "react";
import {
  Check,
  MessageCircle,
  ShieldCheck,
  Clock,
  Award,
  BugOff,
  ArrowRight,
  ChevronDown,
  Phone,
  Menu,
  Play,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SiteSettings } from "@/types/site-settings";
import { Button, Section, FadeUp } from "@/components/ui";
import { cn } from "@/utils/cn";
import { trackContactClick } from "@/lib/tracking";
import { Link } from "react-router-dom";
import { BonusIcon, CmpIcon, HeroIcon, StepIcon } from "@/landing/iconMap";
import { Countdown } from "@/landing/Countdown";
import { getYoutubeEmbedSrc } from "@/lib/youtube";

type CTA = { onLead: () => void; onScrollToPrice: () => void; settings: SiteSettings };

function HeroPrimaryCtaLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const external = /^https?:\/\//i.test(href) || href.startsWith("//");
  const hashOnly = href.startsWith("#");
  const cls = cn(
    "group inline-flex items-center justify-center gap-2 rounded-full transition-all duration-300 active:scale-95",
    "bg-gold-500 text-navy-900 hover:bg-gold-400 shadow-lg",
    "px-7 py-3 sm:px-8 sm:py-3.5 text-sm sm:text-base font-bold uppercase tracking-wide",
  );
  if (external || hashOnly) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={cls}>
      {children}
    </Link>
  );
}

export function LandingNavbar({ onScrollToPrice, settings }: CTA) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);
  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 py-4 flex items-center justify-between",
        scrolled ? "bg-white/90 backdrop-blur-md shadow-md py-3" : "bg-transparent",
      )}
    >
      <a href="#" className="flex items-center gap-2">
        {settings.logoUrl ? (
          <img src={settings.logoUrl} alt="" className="h-10 w-10 object-contain rounded-lg" />
        ) : (
          <div className="w-10 h-10 bg-navy-900 rounded-lg flex items-center justify-center overflow-hidden">
            <span className="text-gold-400 font-black text-xl">
              {settings.siteName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span
          className={cn(
            "font-black text-2xl tracking-tighter",
            scrolled ? "text-navy-900" : "text-white",
          )}
        >
          {settings.siteName.toUpperCase()}
        </span>
      </a>
      <div className="hidden md:flex items-center gap-8">
        {settings.navbar.links.map((l) => (
          <a
            key={l.href + l.label}
            href={l.href}
            className={cn(
              "font-medium hover:text-gold-500 transition",
              scrolled ? "text-navy-900" : "text-white",
            )}
          >
            {l.label}
          </a>
        ))}
      </div>
      <Button
        type="button"
        variant={scrolled ? "primary" : "secondary"}
        size="sm"
        className="hidden md:flex"
        onClick={onScrollToPrice}
      >
        {settings.navbar.ctaLabel}
      </Button>
      <button
        type="button"
        className="md:hidden p-2 -mr-2 rounded-lg hover:bg-white/10"
        aria-label="Menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(true)}
      >
        <Menu className={scrolled ? "text-navy-900" : "text-white"} />
      </button>
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Tutup menu"
              className="fixed inset-0 z-[70] bg-black/50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal
              className="fixed top-0 right-0 z-[71] h-full w-[min(88vw,300px)] bg-navy-900 text-white shadow-2xl md:hidden flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <div className="p-5 border-b border-white/10 flex justify-between items-center">
                <span className="font-black text-lg">Menu</span>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-white/10 text-sm font-bold"
                  onClick={() => setMenuOpen(false)}
                >
                  Tutup
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
                {settings.navbar.links.map((l) => (
                  <a
                    key={l.href + l.label}
                    href={l.href}
                    className="px-4 py-3 rounded-xl font-medium hover:bg-white/10"
                    onClick={() => setMenuOpen(false)}
                  >
                    {l.label}
                  </a>
                ))}
                <button
                  type="button"
                  className="mt-4 mx-4 py-3 rounded-xl bg-gold-500 text-navy-900 font-black text-sm"
                  onClick={() => {
                    setMenuOpen(false);
                    onScrollToPrice();
                  }}
                >
                  {settings.navbar.ctaLabel}
                </button>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

export function LandingHero({ settings }: Pick<CTA, "settings">) {
  const h = settings.sections.hero;
  const yt = getYoutubeEmbedSrc(h.youtubeUrl);
  const [playHeroVideo, setPlayHeroVideo] = useState(false);
  return (
    <section className="relative min-h-[100vh] flex items-center pt-24 pb-12 px-6 bg-navy-900 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gold-600 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600 blur-[120px]" />
      </div>
      <div className="max-w-6xl mx-auto w-full relative z-10 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <FadeUp>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
              <span className="text-xs font-bold tracking-widest uppercase text-gold-400">{h.badge}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-[1.1] mb-4">
              {h.titleLine1} <br />
              <span className="text-gold-400">{h.titleAccent}</span>
            </h1>
            <p className="text-2xl md:text-3xl font-bold text-blue-100 mb-6 italic">{h.subtitle}</p>
            <p className="text-lg md:text-xl text-blue-50/80 mb-10 leading-relaxed max-w-lg">{h.description}</p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12 items-stretch sm:items-center">
              <HeroPrimaryCtaLink href={h.primaryCtaHref}>
                <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
                {h.primaryCta}
                <ArrowRight
                  className="h-4 w-4 shrink-0 group-hover:translate-x-1 transition-transform"
                  aria-hidden
                />
              </HeroPrimaryCtaLink>
              <a
                href={h.secondaryCtaHref}
                className="inline-flex items-center justify-center rounded-full transition-all duration-300 border-2 border-white/30 text-white hover:bg-white/10 px-8 py-3.5 text-sm sm:text-base font-bold uppercase tracking-wide"
              >
                {h.secondaryCta}
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {h.features.map((item, i) => (
                <div
                  key={i}
                  className="flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-2 text-left"
                >
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-white/10 flex items-center justify-center">
                    <HeroIcon name={item.icon} className="text-gold-400 w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-white/70 leading-snug">{item.text}</span>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
        <div className="relative space-y-5">
          <FadeUp delay={0.2}>
            <div className="relative rounded-2xl overflow-hidden border-4 border-white/10 shadow-2xl bg-black aspect-[4/5]">
              {yt && playHeroVideo ? (
                <iframe
                  title="Video hero"
                  src={`${yt}?autoplay=1&rel=0`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  className="absolute inset-0 text-left"
                  onClick={() => {
                    if (yt) setPlayHeroVideo(true);
                  }}
                >
                  <img src={h.imageUrl} alt={h.imageAlt} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 to-transparent" />
                  {yt && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="h-16 w-16 rounded-full bg-white/90 text-navy-900 flex items-center justify-center shadow-xl">
                        <Play className="h-7 w-7 ml-1" fill="currentColor" />
                      </span>
                    </div>
                  )}
                </button>
              )}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-8 right-[-20px] bg-gold-500 text-navy-900 p-4 rounded-xl shadow-xl transform -rotate-12 z-20"
              >
                <div className="font-black text-2xl tracking-tighter">{h.floatingBadgeTitle}</div>
                <div className="text-xs font-bold">{h.floatingBadgeSubtitle}</div>
              </motion.div>
            </div>
            {h.videoDisclaimer?.trim() && (
              <p className="text-center md:text-left text-[11px] sm:text-xs text-white/50 mt-3 px-1">
                {h.videoDisclaimer}
              </p>
            )}
          </FadeUp>
        </div>
      </div>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
        <ChevronDown size={32} />
      </div>
    </section>
  );
}

export function LandingProblem({ settings }: { settings: SiteSettings }) {
  const p = settings.sections.problem;
  const heroProblemImg = p.images[0] || "";
  return (
    <Section bg="gray" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 p-20 opacity-[0.03] rotate-12">
        <BugOff size={400} />
      </div>
      <div className="text-center mb-16">
        <FadeUp>
          <span className="text-gold-600 font-black tracking-[0.2em] uppercase text-sm mb-4 block">
            {p.eyebrow}
          </span>
          <h2 className="text-4xl md:text-6xl font-black text-navy-900 mb-6">{p.title}</h2>
          <p className="text-xl text-navy-800/70 max-w-2xl mx-auto leading-relaxed">{p.intro}</p>
        </FadeUp>
      </div>
      <div className="relative z-10 bg-white p-5 sm:p-8 md:p-12 rounded-[32px] shadow-2xl border border-gray-100 max-w-5xl mx-auto overflow-hidden">
        <div className="flex flex-col md:grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
          <div className="order-1 md:order-none w-full">
            <FadeUp>
              <h3
                className="text-3xl md:text-4xl font-black text-navy-900 leading-tight mb-6"
                dangerouslySetInnerHTML={{ __html: p.headingHtml }}
              />
              <div className="text-6xl mb-6">{p.emoji}</div>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">{p.body}</p>
            </FadeUp>
          </div>
          <div className="order-2 md:order-none w-full">
            <FadeUp delay={0.1}>
              <div className="flex justify-center md:justify-end">
                <div className="rounded-2xl overflow-hidden aspect-square border-4 border-gray-50 shadow-inner group w-full max-w-[280px] md:max-w-[260px] md:ml-auto">
                {heroProblemImg ? (
                  <img
                    src={heroProblemImg}
                    alt=""
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100" />
                )}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </div>
    </Section>
  );
}

export function LandingSolution({ settings }: { settings: SiteSettings }) {
  const sol = settings.sections.solution;
  return (
    <Section id={sol.id}>
      <div className="grid md:grid-cols-2 gap-16 items-center">
        <div className="order-2 md:order-1">
          <FadeUp>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img src={sol.imageUrl} alt="" className="w-full h-[600px] object-cover" />
              <div className="absolute top-6 left-6 bg-white/90 backdrop-blur px-6 py-3 rounded-full shadow-lg">
                <span className="text-navy-900 font-black flex items-center gap-2">
                  <ShieldCheck className="text-green-600" /> {sol.badgeText}
                </span>
              </div>
            </div>
          </FadeUp>
        </div>
        <div className="order-1 md:order-2">
          <FadeUp>
            <span className="text-gold-600 font-black tracking-widest uppercase text-sm mb-4 block">
              {sol.eyebrow}
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-navy-900 mb-6 leading-tight">{sol.title}</h2>
            <p className="text-xl font-bold text-navy-800/80 italic mb-8 border-l-4 border-gold-500 pl-6">
              {sol.quote}
            </p>
            <p className="text-lg text-gray-600 mb-10">{sol.intro}</p>
            <div className="space-y-6">
              {sol.points.map((item, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center group-hover:bg-navy-900 transition-colors">
                    <Check className="text-navy-900 group-hover:text-gold-400 transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-bold text-navy-900 text-lg mb-1">{item.title}</h4>
                    <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </div>
      <div className="mt-20 p-8 md:p-12 bg-navy-900 text-white rounded-[40px] text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold-400 to-transparent" />
        <FadeUp>
          <p className="text-xl md:text-2xl leading-relaxed italic max-w-4xl mx-auto relative z-10">
            {sol.closingQuote}
          </p>
        </FadeUp>
      </div>
    </Section>
  );
}

export function LandingTaglineBig({ onScrollToPrice, settings }: CTA) {
  const t = settings.sections.taglineBig;
  return (
    <section className="bg-navy-950 py-32 px-6 text-center overflow-hidden">
      <FadeUp>
        <div className="relative inline-block">
          <motion.h2
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-white to-gold-300 bg-[length:200%_auto] leading-tight"
          >
            {t.line1} <br /> {t.line2}
          </motion.h2>
        </div>
        <div className="mt-12">
          <Button variant="secondary" size="lg" type="button" onClick={onScrollToPrice}>
            {t.ctaLabel}
          </Button>
        </div>
      </FadeUp>
    </section>
  );
}

export function LandingSteps({ onScrollToPrice, settings }: CTA) {
  const st = settings.sections.steps;
  return (
    <Section id={st.id} bg="gray">
      <div className="text-center mb-20">
        <FadeUp>
          <span className="text-gold-600 font-black tracking-widest uppercase text-sm mb-4 block">
            {st.eyebrow}
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-navy-900 mb-6">{st.title}</h2>
        </FadeUp>
      </div>
      <div className="grid md:grid-cols-5 gap-6 relative">
        <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-navy-100 z-0" />
        {st.items.map((step, i) => (
          <FadeUp key={i} delay={i * 0.1}>
            <div className="relative z-10 bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-50 h-full flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-2xl bg-navy-900 text-gold-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <StepIcon name={step.icon} size={36} />
              </div>
              <div className="text-gold-600 font-black text-xs mb-2 tracking-widest uppercase">
                Step 0{i + 1}
              </div>
              <h4 className="font-black text-navy-900 text-lg mb-4">{step.title}</h4>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          </FadeUp>
        ))}
      </div>
      <div className="mt-20 text-center">
        <FadeUp>
          <h3 className="text-2xl md:text-3xl font-black text-navy-900 mb-4">{st.bottomTitle}</h3>
          <p className="text-gray-600 mb-8">{st.bottomSubtitle}</p>
          <Button variant="primary" size="lg" className="px-12" type="button" onClick={onScrollToPrice}>
            {st.bottomCta}
          </Button>
        </FadeUp>
      </div>
    </Section>
  );
}

export function LandingBonus({ settings }: { settings: SiteSettings }) {
  const b = settings.sections.bonus;
  return (
    <Section id={b.id} className="bg-navy-900 text-white relative">
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-gray-50 to-transparent opacity-10" />
      <div className="text-center mb-16">
        <FadeUp>
          <div className="inline-block bg-gold-500 text-navy-900 px-6 py-2 rounded-full font-black text-sm uppercase tracking-[0.2em] mb-6">
            {b.badge}
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-6">{b.title}</h2>
          <p className="text-blue-100/70 max-w-2xl mx-auto">{b.subtitle}</p>
        </FadeUp>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {b.items.map((item, i) => (
          <FadeUp key={i} delay={i * 0.1}>
            <div className="bg-white/5 border border-white/10 p-10 rounded-[40px] text-center hover:bg-white/10 transition-all group relative overflow-hidden">
              <div className="absolute -top-4 -right-4 bg-gold-500 text-navy-900 px-6 py-8 font-black rounded-bl-[40px] transform rotate-12 group-hover:rotate-0 transition-transform">
                FREE
              </div>
              <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center mx-auto mb-8">
                <BonusIcon name={item.icon} className="text-gold-400" size={32} />
              </div>
              <h4 className="text-xl font-black mb-4 leading-snug">{item.title}</h4>
              <div className="text-gold-400 font-bold mb-2">SENILAI</div>
              <div className="text-2xl font-black line-through opacity-50">{item.val}</div>
            </div>
          </FadeUp>
        ))}
      </div>
      <div className="mt-12 text-center text-blue-200/50 text-sm font-medium italic">{b.footnote}</div>
    </Section>
  );
}

export function LandingUrgency({ onLead, settings }: CTA) {
  const u = settings.sections.urgency;
  return (
    <Section id="harga" bg="gold" className="relative overflow-hidden scroll-mt-24">
      <div className="absolute inset-0 bg-gold-500 opacity-[0.05] pointer-events-none" />
      <div className="text-center mb-12">
        <FadeUp>
          <h2
            className="text-4xl md:text-6xl font-black text-navy-900 mb-6 leading-tight"
            dangerouslySetInnerHTML={{ __html: u.titleHtml }}
          />
          <div className="inline-block bg-red-600 text-white px-8 py-3 rounded-full font-black text-xl mb-8 animate-bounce shadow-xl">
            {u.redBanner}
          </div>
          <p className="text-3xl font-black text-navy-900 mb-10 flex items-center justify-center gap-4">
            <span className="w-12 h-1 bg-navy-900" />
            {u.slotsLine} <span className="text-red-600 text-5xl">{u.slotsNumber}</span> Slot!
            <span className="w-12 h-1 bg-navy-900" />
          </p>
        </FadeUp>
      </div>
      <FadeUp>
        <div className="mb-16">
          <Countdown />
        </div>
      </FadeUp>
      <div className="max-w-2xl mx-auto bg-white px-6 pt-12 pb-10 sm:px-10 sm:pt-14 sm:pb-12 md:px-16 md:pb-16 rounded-[50px] shadow-2xl border-4 border-navy-900/5 text-center relative">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-navy-900 text-white px-4 py-2 sm:px-6 rounded-full font-black text-[11px] sm:text-sm uppercase tracking-wide shadow-lg">
          {u.promoBadgeLabel}
        </div>
        <div className="mb-8 mt-1 space-y-2">
          <div className="text-lg sm:text-2xl font-bold text-red-500/55 line-through decoration-red-400/50 decoration-2">
            {u.oldPrice}
          </div>
          <div className="text-navy-900 text-5xl sm:text-6xl md:text-7xl font-black leading-tight">
            {u.promoPrice}
          </div>
        </div>
        <div className="space-y-4 text-gray-600 font-medium mb-12">
          {u.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
        <Button variant="whatsapp" size="xl" className="w-full gap-3 justify-center" type="button" onClick={onLead}>
          <MessageCircle className="h-8 w-8 shrink-0" />
          <span className="font-black tracking-wide">{u.ctaLabel}</span>
        </Button>
      </div>
    </Section>
  );
}

export function LandingGuarantee({ settings }: { settings: SiteSettings }) {
  const g = settings.sections.guarantee;
  return (
    <Section className="py-0">
      <div className="bg-white border-4 border-navy-900 rounded-[50px] p-10 md:p-20 relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <ShieldCheck size={200} />
        </div>
        <FadeUp>
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 mb-8 bg-gold-500 rounded-full flex items-center justify-center shadow-xl">
              <Award size={48} className="text-navy-900" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-navy-900 mb-6">{g.title}</h2>
            <div
              className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed mb-10"
              dangerouslySetInnerHTML={{ __html: g.bodyHtml }}
            />
            <div className="text-xs font-bold text-gray-400 italic">{g.footnote}</div>
          </div>
        </FadeUp>
      </div>
    </Section>
  );
}

export function LandingComparison({ settings }: { settings: SiteSettings }) {
  const c = settings.sections.comparison;
  const cols = c.columns;
  return (
    <Section>
      <div className="text-center mb-16">
        <FadeUp>
          <h2 className="text-4xl md:text-5xl font-black text-navy-900 mb-4">{c.title}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">{c.subtitle}</p>
        </FadeUp>
      </div>
      <div className="overflow-x-auto pb-10">
        <div className="min-w-[800px]">
          <table className="w-full border-separate border-spacing-2">
            <thead>
              <tr>
                <th className="p-6 text-left text-navy-900 font-black text-xl w-1/4">Fitur Utama</th>
                {cols.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "p-6 rounded-2xl font-bold w-1/4",
                      col.highlight
                        ? "bg-navy-900 text-gold-400 font-black text-2xl shadow-2xl relative"
                        : "bg-gray-50 text-gray-500",
                    )}
                  >
                    {col.label}
                    {col.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-500 text-navy-900 text-[10px] py-1 px-3 rounded-full font-black tracking-tighter">
                        BEST VALUE
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-center">
              {c.rows.map((row, i) => (
                <tr key={i} className="group">
                  <td className="p-4 text-left font-bold text-navy-900">{row.name}</td>
                  {cols.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "p-4 rounded-xl",
                        col.highlight
                          ? "bg-navy-900/5 text-navy-900 font-black"
                          : "bg-gray-50/50 text-gray-500",
                      )}
                    >
                      {row.values[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-16 grid md:grid-cols-3 gap-8">
        {c.cards.map((item, i) => (
          <div key={i} className="flex gap-4 p-6 rounded-2xl border border-gray-100 shadow-sm">
            <CmpIcon name={item.icon} className={cn("flex-shrink-0", item.color)} />
            <div>
              <h4 className="font-black text-navy-900 mb-2">{item.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function LandingProductDetails({ settings }: { settings: SiteSettings }) {
  const pd = settings.sections.productDetails;
  return (
    <Section bg="navy">
      <div className="grid md:grid-cols-2 gap-16 items-center">
        <FadeUp>
          <span className="text-gold-400 font-black tracking-widest uppercase text-sm mb-4 block">
            {pd.eyebrow}
          </span>
          <h2
            className="text-4xl md:text-5xl font-black mb-8 leading-tight"
            dangerouslySetInnerHTML={{ __html: pd.titleHtml }}
          />
          <div className="space-y-6 text-lg text-blue-100/80 leading-relaxed">
            {pd.paragraphs.map((p, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: p }} />
            ))}
          </div>
          <div className="mt-12 flex items-center gap-6">
            <div className="h-14 w-0.5 bg-gold-500" />
            <p
              className="text-2xl font-black italic"
              dangerouslySetInnerHTML={{ __html: pd.quoteHtml }}
            />
          </div>
        </FadeUp>
        <div className="grid grid-cols-2 gap-4">
          {pd.images.map((img, i) => (
            <FadeUp key={i} delay={i * 0.1}>
              <div className="aspect-square rounded-2xl overflow-hidden border-2 border-white/10 group">
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function LandingGallery({ settings }: { settings: SiteSettings }) {
  const g = settings.sections.gallery;
  const visibleProjects = g.projects.filter((p) => p.visible !== false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const n = visibleProjects.length;
  const gridClass = cn(
    "gap-6",
    n === 0 && "hidden",
    n === 1 && "grid grid-cols-1 max-w-md mx-auto",
    n === 2 && "grid grid-cols-1 md:grid-cols-2 md:max-w-4xl md:mx-auto",
    n >= 3 && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  );
  return (
    <Section id={g.id}>
      <div className="text-center mb-16">
        <FadeUp>
          <span className="text-gold-600 font-black tracking-widest uppercase text-sm mb-4 block">
            {g.eyebrow}
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-navy-900">{g.title}</h2>
        </FadeUp>
      </div>
      <div className={gridClass}>
        {visibleProjects.map((item, i) => (
          <FadeUp key={`${item.title}-${item.area}-${i}`} delay={i * 0.05}>
            <div className="group relative rounded-[30px] overflow-hidden shadow-lg aspect-[4/5]">
              {item.videoUrl && activeVideo === `${item.title}-${item.area}-${i}` ? (
                <iframe
                  title={item.title}
                  src={`${getYoutubeEmbedSrc(item.videoUrl) ?? ""}?autoplay=1&rel=0`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  className="w-full h-full text-left"
                  onClick={() => {
                    if (item.videoUrl && getYoutubeEmbedSrc(item.videoUrl)) {
                      setActiveVideo(`${item.title}-${item.area}-${i}`);
                    }
                  }}
                >
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  {item.videoUrl && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="h-14 w-14 rounded-full bg-white/90 text-navy-900 flex items-center justify-center shadow-xl">
                        <Play className="h-6 w-6 ml-1" fill="currentColor" />
                      </span>
                    </div>
                  )}
                </button>
              )}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-navy-900/90 via-navy-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                <h4 className="text-white text-xl font-black">{item.title}</h4>
                <p className="text-gold-400 font-bold">{item.area}</p>
              </div>
            </div>
          </FadeUp>
        ))}
      </div>
    </Section>
  );
}

export function LandingWhyNow({ settings }: { settings: SiteSettings }) {
  const w = settings.sections.whyNow;
  return (
    <Section bg="gray">
      <div className="text-center mb-16">
        <FadeUp>
          <h2
            className="text-4xl md:text-5xl font-black text-navy-900 mb-6"
            dangerouslySetInnerHTML={{ __html: w.titleHtml }}
          />
        </FadeUp>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {w.cards.map((item, i) => (
          <FadeUp key={i} delay={i * 0.1}>
            <div className="bg-white p-10 rounded-[40px] border-b-4 border-gold-500 shadow-xl h-full">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-6">
                <Clock size={28} />
              </div>
              <h4 className="text-xl font-black text-navy-900 mb-4">{item.title}</h4>
              <p className="text-gray-500 leading-relaxed">{item.text}</p>
            </div>
          </FadeUp>
        ))}
      </div>
    </Section>
  );
}

export function LandingFinalCta({ onScrollToPrice, settings }: CTA) {
  const f = settings.sections.finalCta;
  return (
    <Section bg="navy" className="text-center relative">
      <div
        className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"
      />
      <FadeUp>
        <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">{f.title}</h2>
        <p className="text-xl text-blue-100/70 mb-12 max-w-2xl mx-auto">{f.subtitle}</p>
        <div className="flex flex-col items-center gap-6">
          <Button
            variant="whatsapp"
            size="xl"
            className="px-12 py-6 text-2xl gap-3"
            type="button"
            onClick={onScrollToPrice}
          >
            <MessageCircle className="h-10 w-10 shrink-0" />
            {f.ctaLabel}
          </Button>
          <p className="flex items-center gap-2 text-gold-400 font-bold">
            <Check size={20} /> {f.perkLine}
          </p>
          <div className="mt-4 px-6 py-2 bg-red-600 rounded-full font-black animate-pulse">{f.slotsBadge}</div>
        </div>
      </FadeUp>
    </Section>
  );
}

/** Mobile: banner bawah + tombol WA bulat mengarah ke blok harga (#harga). */
export function LandingStickyCta({ onScrollToPrice, settings }: CTA) {
  const sticky = settings.sections.stickyCta;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const tick = () => setVisible(window.scrollY > 420 && window.innerWidth < 768);
    tick();
    window.addEventListener("scroll", tick);
    window.addEventListener("resize", tick);
    return () => {
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
    };
  }, []);
  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", damping: 24 }}
            className="fixed bottom-3 left-3 right-[4.5rem] z-[60] md:hidden pointer-events-none"
          >
            <div className="pointer-events-auto rounded-xl border border-amber-300/90 bg-gradient-to-r from-amber-50 via-amber-100/95 to-amber-200/85 px-3 py-2.5 shadow-[0_8px_28px_-6px_rgba(180,83,9,0.35)] text-[12px] sm:text-sm text-amber-950 leading-snug">
              <span className="font-semibold">{sticky.topLine}</span>
              <button
                type="button"
                className="ml-1 font-black underline decoration-amber-800/40 underline-offset-2"
                onClick={onScrollToPrice}
              >
                {sticky.mainLine}
              </button>
            </div>
          </motion.div>
          <motion.button
            type="button"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", damping: 22 }}
            aria-label="Lihat paket harga"
            className="fixed bottom-4 right-4 z-[61] md:hidden h-14 w-14 rounded-full bg-[#25D366] text-white shadow-2xl flex items-center justify-center border-[3px] border-white ring-2 ring-black/5"
            onClick={onScrollToPrice}
          >
            <MessageCircle className="h-7 w-7" strokeWidth={2.4} />
          </motion.button>
        </>
      )}
    </AnimatePresence>
  );
}

export function LandingFaq({ settings }: { settings: SiteSettings }) {
  const [open, setOpen] = useState<string | null>(settings.faq[0]?.id ?? null);
  return (
    <Section id="faq" bg="white">
      <div className="text-center mb-12">
        <FadeUp>
          <span className="text-gold-600 font-black tracking-widest uppercase text-sm mb-4 block">FAQ</span>
          <h2 className="text-4xl md:text-5xl font-black text-navy-900">Pertanyaan umum</h2>
        </FadeUp>
      </div>
      <div className="max-w-3xl mx-auto space-y-3">
        {settings.faq.map((item) => {
          const isOpen = open === item.id;
          return (
            <div key={item.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <button
                type="button"
                className="w-full text-left px-6 py-4 font-black text-navy-900 flex justify-between items-center gap-4 hover:bg-gray-50"
                onClick={() => setOpen(isOpen ? null : item.id)}
              >
                {item.question}
                <span className="text-gold-500 text-xl">{isOpen ? "−" : "+"}</span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-4 text-gray-600 leading-relaxed">{item.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function LandingFooter({
  settings,
  onScrollToPrice,
}: {
  settings: SiteSettings;
  onScrollToPrice: () => void;
}) {
  const f = settings.footer;
  const onPhoneClick = () => {
    trackContactClick(settings);
    const d = settings.contact.whatsapp.replace(/\D/g, "");
    if (d) window.location.href = `tel:+${d}`;
  };
  const onWaToPrice = () => {
    trackContactClick(settings);
    onScrollToPrice();
  };
  const onMailClick = () => {
    trackContactClick(settings);
    window.location.href = `mailto:${settings.contact.email}`;
  };

  return (
    <footer className="bg-navy-950 text-white pt-20 pb-10 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-12 mb-20">
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-6">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="" className="h-10 w-10 object-contain rounded-lg bg-white p-1" />
            ) : (
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-navy-900 font-black text-xl">{settings.siteName.charAt(0)}</span>
              </div>
            )}
            <span className="font-black text-2xl tracking-tighter">{settings.siteName.toUpperCase()}</span>
          </div>
          <p className="text-blue-100/50 leading-relaxed max-w-sm mb-4">{f.tagline}</p>
          <p className="text-blue-100/40 text-sm">{f.workingHours}</p>
          <p className="text-blue-100/40 text-sm mt-2">{settings.contact.address}</p>
        </div>
        <div>
          <h4 className="font-black text-lg mb-6">Menu</h4>
          <ul className="space-y-4 text-blue-100/50">
            {f.menuLinks.map((l) => (
              <li key={l.href + l.label}>
                <a href={l.href} className="hover:text-gold-400 transition">
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link to="/privacy" className="hover:text-gold-400 transition">
                Kebijakan Privasi
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-black text-lg mb-6">Kontak</h4>
          <ul className="space-y-4 text-blue-100/50">
            <li>
              <button
                type="button"
                onClick={onPhoneClick}
                className="flex items-center gap-3 hover:text-gold-400 transition text-left w-full"
              >
                <Phone size={18} className="text-gold-500 shrink-0" /> {settings.contact.phoneDisplay}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={onWaToPrice}
                className="flex items-center gap-3 hover:text-gold-400 transition text-left w-full"
              >
                <MessageCircle size={18} className="text-gold-500 shrink-0" /> WhatsApp
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={onMailClick}
                className="hover:text-gold-400 transition text-left"
              >
                {settings.contact.email}
              </button>
            </li>
            <li className="text-sm">{settings.contact.instagramHandle}</li>
          </ul>
          <div className="flex flex-wrap gap-3 mt-6">
            {settings.socialLinks.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 hover:bg-white/20"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-blue-100/30">
        <p>
          © {new Date().getFullYear()} {f.copyrightLine}
        </p>
        <div className="flex gap-6 flex-wrap justify-center">
          <a href={f.termsUrl} className="hover:text-gold-400">
            Syarat & Ketentuan
          </a>
          <Link to="/privacy" className="hover:text-gold-400">
            Kebijakan Privasi
          </Link>
        </div>
      </div>
    </footer>
  );
}

