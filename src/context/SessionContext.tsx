"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SessionAnalytics } from "@/lib/types";

interface SessionContextValue {
  analytics: SessionAnalytics | null;
  setAnalytics: (analytics: SessionAnalytics) => void;
  clearAnalytics: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const STORAGE_KEY = "suturelab-analytics";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [analytics, setAnalyticsState] = useState<SessionAnalytics | null>(
    null
  );
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const setAnalytics = useCallback((a: SessionAnalytics) => {
    setAnalyticsState(a);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(a));
      sessionStorage.setItem("suturelab-summary", JSON.stringify(a));
    }
  }, []);

  const clearAnalytics = useCallback(() => {
    setAnalyticsState(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem("suturelab-summary");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      analytics,
      setAnalytics,
      clearAnalytics,
      theme,
      toggleTheme,
    }),
    [analytics, setAnalytics, clearAnalytics, theme, toggleTheme]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
