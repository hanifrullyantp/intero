import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type Ctx = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

const LeadModalContext = createContext<Ctx | null>(null);

export function LeadModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);
  return <LeadModalContext.Provider value={value}>{children}</LeadModalContext.Provider>;
}

export function useLeadModal() {
  const c = useContext(LeadModalContext);
  if (!c) throw new Error("useLeadModal outside provider");
  return c;
}
