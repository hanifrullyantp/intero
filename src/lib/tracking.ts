import type { SiteSettings } from "@/types/site-settings";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackFacebook(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.fbq) return;
  if (params) window.fbq("track", eventName, params);
  else window.fbq("track", eventName);
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
  if (s.fontFamily) {
    const fontName = s.fontFamily.replace(/ /g, "+");
    const id = `gf-${fontName}`;
    if (!document.getElementById(id)) {
      const pre = document.createElement("link");
      pre.rel = "preconnect";
      pre.href = "https://fonts.googleapis.com";
      document.head.appendChild(pre);
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
    }
    document.documentElement.style.setProperty("--font-sans", `"${s.fontFamily}", system-ui, sans-serif`);
  }
}

export function injectFacebookPixel(
  pixelId: string,
  enabled: boolean,
  pageViewEvent: string,
) {
  if (!enabled || !pixelId) return;
  const cleanId = pixelId.replace(/\D/g, "");
  if (!cleanId) return;
  const pv = pageViewEvent || "PageView";
  if (typeof window.fbq === "function") {
    window.fbq("track", pv);
    return;
  }
  if (document.getElementById("intero-fbq-inline")) return;
  const scr = document.createElement("script");
  scr.id = "intero-fbq-inline";
  scr.innerHTML = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${cleanId}');
fbq('track', '${pv.replace(/'/g, "\\'")}');
  `;
  document.head.appendChild(scr);
  const nos = document.createElement("noscript");
  nos.id = "intero-fbq-noscript";
  const img = document.createElement("img");
  img.height = 1;
  img.width = 1;
  img.style.display = "none";
  img.alt = "";
  img.src = `https://www.facebook.com/tr?id=${cleanId}&ev=PageView&noscript=1`;
  nos.appendChild(img);
  document.body.appendChild(nos);
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
