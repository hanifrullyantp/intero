import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SiteSettings } from "@/types/site-settings";
import { getDefaultSiteSettings } from "@/types/site-settings";
import { fetchPublicSettings } from "@/lib/api";
import {
  injectGoogleAnalytics,
  injectMetaAndLinks,
  injectFacebookPixel,
} from "@/lib/tracking";

type Ctx = {
  settings: SiteSettings;
  loading: boolean;
  reload: () => Promise<void>;
};

const PublicSettingsContext = createContext<Ctx | null>(null);

export function PublicSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(() => getDefaultSiteSettings());
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchPublicSettings();
      setSettings(s);
    } catch {
      setSettings(getDefaultSiteSettings());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (loading) return;
    injectMetaAndLinks(settings);
    injectFacebookPixel(
      settings.tracking.facebookPixelId,
      settings.tracking.facebookPixelEnabled,
      settings.tracking.events.pageView,
    );
    if (settings.tracking.googleAnalyticsId) {
      injectGoogleAnalytics(settings.tracking.googleAnalyticsId);
    }
  }, [settings, loading]);

  const value = useMemo(
    () => ({ settings, loading, reload }),
    [settings, loading, reload],
  );

  return (
    <PublicSettingsContext.Provider value={value}>{children}</PublicSettingsContext.Provider>
  );
}

export function usePublicSettings() {
  const c = useContext(PublicSettingsContext);
  if (!c) throw new Error("usePublicSettings outside provider");
  return c;
}
