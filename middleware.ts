import { next, rewrite } from "@vercel/functions";

/** Subdomain hosts that serve the 3D Intero SPA from /3d */
const HOSTS_3D = new Set(["3d.intero.id", "3d.intero.com"]);

function pathFor3dApp(pathname: string): string {
  if (pathname.startsWith("/api/")) return pathname;
  if (pathname === "/") return "/3d/index.html";
  if (/^\/v\/[A-Za-z0-9_-]{8,32}\/?$/.test(pathname)) return "/3d/index.html";
  if (pathname === "/app" || pathname.startsWith("/app/")) return "/3d/index.html";
  if (/^\/p\/[0-9a-f-]{36}\/?$/i.test(pathname)) return "/3d/index.html";
  if (
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js"
  ) {
    return `/3d${pathname}`;
  }
  if (pathname.startsWith("/3d/")) return pathname;
  return `/3d${pathname}`;
}

/** Vercel serves root index.html before vercel.json rewrites; route 3d hosts here. */
export default function middleware(request: Request) {
  const url = new URL(request.url);
  if (!HOSTS_3D.has(url.hostname.toLowerCase())) {
    return next();
  }
  return rewrite(new URL(pathFor3dApp(url.pathname), url));
}
