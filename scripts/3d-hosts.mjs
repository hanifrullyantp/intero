/** Hostnames that serve 3D Intero (keep in sync with middleware.ts) */
export const HOSTS_3D = ["3d.intero.id", "3d.intero.com"];

const REWRITE_RULES = [
  { source: "/assets/(.*)", destination: "/3d/assets/$1" },
  { source: "/icons/(.*)", destination: "/3d/icons/$1" },
  { source: "/manifest.json", destination: "/3d/manifest.json" },
  { source: "/sw.js", destination: "/3d/sw.js" },
  { source: "/", destination: "/3d/index.html" },
  { source: "/v/:id", destination: "/3d/index.html" },
  { source: "/app", destination: "/3d/index.html" },
  { source: "/p/:id", destination: "/3d/index.html" },
  { source: "/api/:path*", destination: "/api/:path*" },
  { source: "/:path*", destination: "/3d/:path*" },
];

export function rewritesFor3dHosts() {
  return HOSTS_3D.flatMap((host) =>
    REWRITE_RULES.map((rule) => ({
      ...rule,
      has: [{ type: "host", value: host }],
    })),
  );
}
