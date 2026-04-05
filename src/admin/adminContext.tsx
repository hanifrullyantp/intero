import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { SiteSettings } from "@/types/site-settings";
import { fetchAdminSettings, saveAdminSettings } from "@/lib/api";

export type AdminContextValue = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  save: () => Promise<void>;
  saving: boolean;
  reload: () => Promise<void>;
  message: string | null;
  setMessage: (m: string | null) => void;
};

const Ctx = createContext<AdminContextValue | null>(null);

export function AdminProvider({
  initial,
  children,
}: {
  initial: SiteSettings;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const s = await fetchAdminSettings();
    setSettings(s);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveAdminSettings(settings);
      setMessage("Tersimpan.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      save,
      saving,
      reload,
      message,
      setMessage,
    }),
    [settings, save, saving, reload, message],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin outside AdminProvider");
  return c;
}
