"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

type SidebarContextValue = {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    } else {
        setIsOpen(false);
    }
  }, [isMobile]);

  const toggleSidebar = () => setIsOpen((s) => !s);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}
