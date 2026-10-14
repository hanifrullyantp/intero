import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import ShareApp from "./ShareApp";
import { parseShareIdFromPath } from "./core/share";

const shareId = typeof window !== "undefined" ? parseShareIdFromPath(window.location.pathname) : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {shareId ? <ShareApp /> : <App />}
  </StrictMode>
);

// PWA: register the service worker (production + https/localhost only)
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
