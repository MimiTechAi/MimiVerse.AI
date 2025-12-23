import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type UIMode = "simple" | "advanced" | "expert";

interface UIModeContextValue {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
}

const UIModeContext = createContext<UIModeContextValue | undefined>(undefined);

export function UIModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UIMode>(() => {
    if (typeof window === "undefined") return "simple";
    const stored = window.localStorage.getItem("mimiverse-ui-mode");
    if (stored === "advanced" || stored === "expert" || stored === "simple") {
      return stored;
    }
    return "simple";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("mimiverse-ui-mode", mode);
    } catch {
    }
  }, [mode]);

  const setMode = (next: UIMode) => {
    setModeState(next);
  };

  const value = useMemo(() => ({ mode, setMode }), [mode]);

  return <UIModeContext.Provider value={value}>{children}</UIModeContext.Provider>;
}

export function useUIMode() {
  const ctx = useContext(UIModeContext);
  if (!ctx) {
    throw new Error("useUIMode must be used within a UIModeProvider");
  }
  return ctx;
}
