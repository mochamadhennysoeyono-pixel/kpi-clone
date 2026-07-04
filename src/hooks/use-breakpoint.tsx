
"use client";

import { useState, useEffect } from "react";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

/**
 * Hook untuk mendeteksi breakpoint secara presisi
 * xs: < 640px (Mobile)
 * sm: 640px - 767px (Tablet Portrait)
 * md: 768px - 1023px (Tablet Landscape)
 * lg: 1024px - 1279px (Laptop)
 * xl: 1280px - 1535px (Desktop)
 * 2xl: >= 1536px (Large Desktop)
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("xs");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint("xs");
      else if (width < 768) setBreakpoint("sm");
      else if (width < 1024) setBreakpoint("md");
      else if (width < 1280) setBreakpoint("lg");
      else if (width < 1536) setBreakpoint("xl");
      else setBreakpoint("2xl");
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = breakpoint === "xs" || breakpoint === "sm";
  const isTablet = breakpoint === "md";
  const isLaptop = breakpoint === "lg";
  const isDesktop = breakpoint === "xl" || breakpoint === "2xl";

  return { breakpoint, isMobile, isTablet, isLaptop, isDesktop };
}
