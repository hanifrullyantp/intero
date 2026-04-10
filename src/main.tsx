import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { injectFacebookPixel } from "./lib/tracking";

const earlyPixel = import.meta.env.VITE_META_PIXEL_ID?.trim();
if (earlyPixel) {
  const digits = earlyPixel.replace(/\D/g, "");
  if (digits.length >= 8) {
    injectFacebookPixel(digits, true, "PageView");
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
