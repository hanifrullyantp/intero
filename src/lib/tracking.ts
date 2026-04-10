import type { SiteSettings } from "@/types/site-settings";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[][];
      push?: (...args: unknown[]) => void;
      loaded?: boolean;
      version?: string;
    };
    _fbq?: typeof window.fbq;
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

let _fbqPixelInjected = false;

/**
 * Meta Pixel — menjalankan kode bootstrap fbq secara LANGSUNG di JS,
 * bukan lewat inject <script textContent> yang sering gagal di SPA / module bundler.
 * Kemudian memuat fbevents.js via <script src>.
 */
export function injectFacebookPixel(
  pixelId: string,
  enabled: boolean,
  pageViewEvent: string,
) {
  if (!enabled || !pixelId) return;
  const cleanId = pixelId.replace(/\D/g, "");
  if (!cleanId) return;
  if (_fbqPixelInjected) return;
  _fbqPixelInjected = true;

  const pv = (pageViewEvent || "PageView").replace(/[^a-zA-Z0-9_]/g, "") || "PageView";

  // --- 1. Bootstrap fbq function (sama persis dengan snippet resmi Meta) ---
  if (!window.fbq) {
    const n: Window["fbq"] = function (this: unknown, ...args: unknown[]) {
      if (n!.callMethod) {
        n!.callMethod(...args);
      } else {
        n!.queue!.push(args);
      }
    } as Window["fbq"];
    n!.push = n!;
    n!.loaded = true;
    n!.version = "2.0";
    n!.queue = [];
    window.fbq = n;
    if (!window._fbq) window._fbq = n;
  }

  // --- 2. Muat fbevents.js via <script src> ---
  if (!document.getElementById("intero-fbq-sdk")) {
    const sdk = document.createElement("script");
    sdk.id = "intero-fbq-sdk";
    sdk.async = true;
    sdk.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(sdk);
  }

  // --- 3. Init + PageView ---
  window.fbq!("init", cleanId);
  window.fbq!("track", pv);

  // --- 4. Noscript fallback ---
  if (!document.getElementById("intero-fbq-noscript")) {
    const nos = document.createElement("noscript");
    nos.id = "intero-fbq-noscript";
    nos.innerHTML =
      `<img height="1" width="1" style="display:none" ` +
      `src="https://www.facebook.com/tr?id=${cleanId}&ev=PageView&noscript=1" />`;
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
  s2.textContent = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId.replace(/'/g, "")}');
  `;
  document.head.appendChild(s2);
}
