import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "three";
          if (id.includes("node_modules/gsap")) return "gsap";
          if (id.includes("node_modules/@supabase")) return "supabase";
          if (id.includes("/src/landing/")) return "landing";
        },
      },
    },
  },
  server: {
    proxy: {
      "/api/instant3d": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
