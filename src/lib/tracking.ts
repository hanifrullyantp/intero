import type { SiteSettings } from "@/types/site-settings";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackFacebook(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    if (params) window.fbq("track", eventName, params);
    else window.fbq("track", eventName);
  } catch {
    /* fbq belum siap */
  }
}

export function trackContactClick(settings: SiteSettings) {
  const name = settings.tracking.events.contactClick || "Contact";
  trackFacebook(name);
}

export function injectMetaAndLinks(s: SiteSettings) {
  document.title = s.seo.metaTitle;
  const setMeta = (attr: "name" | "property", key: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };
  setMeta("name", "description", s.seo.metaDescription);
  setMeta("property", "og:title", s.seo.metaTitle);
  setMeta("property", "og:description", s.seo.metaDescription);
  if (s.seo.ogImageUrl) {
    const abs =
      s.seo.ogImageUrl.startsWith("http") || s.seo.ogImageUrl.startsWith("//")
        ? s.seo.ogImageUrl
        : `${window.location.origin}${s.seo.ogImageUrl}`;
    setMeta("property", "og:image", abs);
  }
  const fav =
    s.faviconUrl &&
    (s.faviconUrl.startsWith("http")
      ? s.faviconUrl
      : `${window.location.origin}${s.faviconUrl}`);
  if (fav) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "icon");
      document.head.appendChild(link);
    }
    link.setAttribute("href", fav);
  }
  const fontFamily = (s.fontFamily && s.fontFamily.trim()) || "Montserrat";
  const fontName = fontFamily.replace(/ /g, "+");
  const id = `gf-${fontName}`;
  if (!document.getElementById(id)) {
    const pre = document.createElement("link");
    pre.rel = "preconnect";
    pre.href = "https://fonts.googleapis.com";
    document.head.appendChild(pre);
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontName}:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap`;
    document.head.appendChild(link);
  }
  document.documentElement.style.setProperty(
    "--font-sans",
    `"${fontFamily}", ui-sans-serif, system-ui, sans-serif`,
  );
}

/**
 * Memuat Meta Pixel (snippet resmi Meta). Jangan memanggil fbq('track') lagi jika script sudah ada —
 * itu menduplikasi PageView (React Strict Mode / re-render).
 */
export function injectFacebookPixel(
  pixelId: string,
  enabled: boolean,
  pageViewEvent: string,
) {
  if (!enabled || !pixelId) return;
  const cleanId = pixelId.replace(/\D/g, "");
  if (!cleanId) return;
  const pv = (pageViewEvent || "PageView").replace(/[^a-zA-Z0-9_]/g, "") || "PageView";

  const existing = document.getElementById("intero-fbq-inline");
  if (existing) {
    return;
  }

  const pre = document.getElementById("intero-fbq-preconnect");
  if (!pre) {
    const p = document.createElement("link");
    p.id = "intero-fbq-preconnect";
    p.rel = "preconnect";
    p.href = "https://connect.facebook.net";
    document.head.appendChild(p);
  }

  const scr = document.createElement("script");
  scr.id = "intero-fbq-inline";
  scr.type = "text/javascript";
  scr.textContent = [
    "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?",
    "n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;",
    "n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;",
    "t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,",
    "document,'script','https://connect.facebook.net/en_US/fbevents.js');",
    `fbq('init','${cleanId}');`,
    `fbq('track','${pv}');`,
  ].join("");
  document.head.appendChild(scr);

  if (!document.getElementById("intero-fbq-noscript")) {
    const nos = document.createElement("noscript");
    nos.id = "intero-fbq-noscript";
    const img = document.createElement("img");
    img.height = 1;
    img.width = 1;
    img.style.display = "none";
    img.alt = "";
    img.referrerPolicy = "no-referrer-when-downgrade";
    img.src = `https://www.facebook.com/tr?id=${cleanId}&ev=PageView&noscript=1`;
    nos.appendChild(img);
    document.body.insertBefore(nos, document.body.firstChild);
  }
}

let gaIdInjected = "";

export function injectGoogleAnalytics(gaId: string) {
  if (!gaId || gaIdInjected === gaId) return;
  gaIdInjected = gaId;
  const s1 = document.createElement("script");
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  document.head.appendChild(s1);
  const s2 = document.createElement("script");
  s2.innerHTML = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId.replace(/'/g, "")}');
  `;
  document.head.appendChild(s2);
}
