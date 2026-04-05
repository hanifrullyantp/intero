import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { usePublicSettings } from "@/context/PublicSettingsContext";
import type { SiteSettings } from "@/types/site-settings";
import { playTingFromUrl, playSyntheticTing } from "@/lib/playTing";

const STORAGE_MUTE = "intero_toast_muted";
const STORAGE_SHOWN = "intero_toast_session_count";
const STORAGE_DAY = "intero_toast_day_key";
const STORAGE_DAY_N = "intero_toast_day_n";
const DAY_KEY = () => new Date().toDateString();

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomRelativeTime(): string {
  const opts = [
    "barusan",
    "1 menit yang lalu",
    "2 menit yang lalu",
    "beberapa menit lalu",
    "5 menit yang lalu",
  ];
  return pick(opts);
}

function inActiveHours(start: string, end: string, tz: string): boolean {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz || "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const hh = parts.find((p) => p.type === "hour")?.value ?? "12";
    const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
    const cur = `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
    return cur >= start && cur <= end;
  } catch {
    return true;
  }
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  let s = tpl;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{{${k}}}`).join(v);
  }
  return s;
}

export function NotificationToast() {
  const { settings } = usePublicSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const t = settings.toast;

  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [timeLabel, setTimeLabel] = useState("");
  const [muted, setMuted] = useState(() => {
    const stored = localStorage.getItem(STORAGE_MUTE);
    if (stored === "1") return true;
    if (stored === "0") return false;
    return settings.toast.muteDefault;
  });
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const unlock = useCallback(() => {
    setAudioUnlocked(true);
    const m = localStorage.getItem(STORAGE_MUTE) === "1";
    if (!m) playSyntheticTing(0.05);
  }, []);

  useEffect(() => {
    const onInteract = () => {
      unlock();
      window.removeEventListener("click", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("scroll", onInteract, true);
    };
    window.addEventListener("click", onInteract);
    window.addEventListener("keydown", onInteract);
    window.addEventListener("scroll", onInteract, { capture: true, passive: true });
    return () => {
      window.removeEventListener("click", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("scroll", onInteract, true);
    };
  }, [unlock]);

  useEffect(() => {
    localStorage.setItem(STORAGE_MUTE, muted ? "1" : "0");
  }, [muted]);

  const playFor = useCallback(
    (cfg: SiteSettings["toast"]) => {
      if (muted || !audioUnlocked) return;
      if (cfg.audioUrl) playTingFromUrl(cfg.audioUrl, 0.35);
      else playSyntheticTing(0.22);
    },
    [muted, audioUnlocked],
  );

  useEffect(() => {
    if (!t.enabled) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const runCycle = () => {
      if (cancelled) return;
      const cfg = settingsRef.current.toast;
      if (!cfg.enabled) return;

      const min = Math.max(5, cfg.intervalMinSec) * 1000;
      const max = Math.max(min, cfg.intervalMaxSec * 1000);
      const delay = min + Math.random() * (max - min);

      timeoutId = setTimeout(() => {
        if (cancelled) return;
        const c = settingsRef.current.toast;

        if (!inActiveHours(c.activeHours.start, c.activeHours.end, c.timezone)) {
          runCycle();
          return;
        }

        const sess = Number(sessionStorage.getItem(STORAGE_SHOWN) || "0");
        if (sess >= c.maxToastsPerSession) return;

        const day = localStorage.getItem(STORAGE_DAY);
        const dayCount =
          day === DAY_KEY() ? Number(localStorage.getItem(STORAGE_DAY_N) || "0") : 0;
        if (dayCount >= c.maxToastsPerSession * 2) {
          runCycle();
          return;
        }

        const name = c.names.length ? pick(c.names) : "Pelanggan";
        const action = c.actions.length ? pick(c.actions) : "memesan";
        const product = c.products.length ? pick(c.products) : "kitchen set";
        const city = c.cities.length ? pick(c.cities) : "";
        const tpl = c.actionTemplates.length
          ? pick(c.actionTemplates)
          : "{{name}} {{action}} {{product}}";
        const text = renderTemplate(tpl, { name, action, product, city }).trim();

        setMessage(text);
        setTimeLabel(randomRelativeTime());
        setVisible(true);
        sessionStorage.setItem(STORAGE_SHOWN, String(sess + 1));
        localStorage.setItem(STORAGE_DAY, DAY_KEY());
        localStorage.setItem(STORAGE_DAY_N, String(dayCount + 1));

        playFor(c);
        window.setTimeout(() => setVisible(false), 6500);
        runCycle();
      }, delay);
    };

    const initial = window.setTimeout(runCycle, 4000 + Math.random() * 4000);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      clearTimeout(initial);
    };
  }, [t.enabled, t.intervalMinSec, t.intervalMaxSec, playFor]);

  if (!t.enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[90] flex flex-col items-end gap-2 pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 120, opacity: 0 }}
            transition={{ type: "spring", damping: 22 }}
            className="pointer-events-auto max-w-sm rounded-xl border border-gray-200 bg-white/95 backdrop-blur-md shadow-xl p-4 text-sm"
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-semibold text-navy-900 leading-snug">{message}</p>
                <p className="text-xs text-gray-500 mt-2">{timeLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
                title={muted ? "Nyalakan suara" : "Bisukan"}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
