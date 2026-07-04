
"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * ResponsiveContainer: Mengatur lebar maksimal dan margin tengah secara adaptif.
 */
export function ResponsiveContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "w-full mx-auto px-4 sm:px-6 lg:px-8 max-w-[1920px]",
      className
    )}>
      {children}
    </div>
  );
}

/**
 * ResponsivePage: Wrapper halaman dengan padding adaptif.
 */
export function ResponsivePage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "space-y-4 sm:space-y-6 md:gap-8 p-3 sm:p-5 md:p-6 lg:p-8 xl:p-10 animate-fade-in",
      className
    )}>
      {children}
    </div>
  );
}

/**
 * ResponsiveGrid: Grid yang berubah kolomnya secara adaptif.
 */
export function ResponsiveGrid({ children, cols = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }, className }: { 
    children: React.ReactNode; 
    cols?: { xs: number, sm: number, md: number, lg: number, xl: number };
    className?: string 
}) {
  return (
    <div className={cn(
      "grid gap-3 sm:gap-4 md:gap-6",
      `grid-cols-${cols.xs}`,
      `sm:grid-cols-${cols.sm}`,
      `md:grid-cols-${cols.md}`,
      `lg:grid-cols-${cols.lg}`,
      `xl:grid-cols-${cols.xl}`,
      className
    )}>
      {children}
    </div>
  );
}

/**
 * ResponsiveToolbar: Baris aksi (Search, Filter, Buttons) yang bertransformasi.
 */
export function ResponsiveToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "flex flex-col gap-3 sm:gap-4", // Mobile: Stack
      "md:flex-row md:items-center md:justify-between", // Tablet+: Row
      "bg-muted/30 p-3 sm:p-4 rounded-xl border border-border/40 shadow-sm",
      className
    )}>
      {children}
    </div>
  );
}
