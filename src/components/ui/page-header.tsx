
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useBreakpoint } from "@/hooks/use-breakpoint";

interface PageHeaderProps {
  title: string;
  description?: string | null;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader Adaptif:
 * - Ukuran teks menyesuaikan layar.
 * - Actions berjejer di desktop, menumpuk di mobile.
 * - Optimized for Deep Dark Contrast.
 */
export function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  const { isMobile } = useBreakpoint();

  return (
    <div className={cn(
      "flex flex-col gap-4 mb-6 sm:mb-8",
      "lg:flex-row lg:items-start lg:justify-between",
      className
    )}>
      <div className="flex items-start gap-4 min-w-0">
        {Icon && (
          <div className="p-2 sm:p-3 bg-primary/10 rounded-xl shrink-0 border border-primary/20 shadow-stripe">
            <Icon className="size-5 sm:size-6 lg:size-8 text-primary" />
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <h1 className={cn(
            "font-black tracking-tight text-white leading-tight", // Contrast Fix
            "text-xl sm:text-2xl md:text-3xl lg:text-4xl" // Adaptive Typography
          )}>
            {title}
          </h1>
          {description && (
            <p className={cn(
              "text-[#8a8f98] font-medium leading-relaxed max-w-3xl", // Muted Gray for description
              "text-xs sm:text-sm md:text-base" // Adaptive Typography
            )}>
              {description}
            </p>
          )}
        </div>
      </div>
      
      {actions && (
        <div className={cn(
          "flex flex-wrap items-center gap-2",
          "w-full lg:w-auto shrink-0",
          "justify-start lg:justify-end"
        )}>
          {actions}
        </div>
      )}
    </div>
  );
}
