"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string | null;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader Adaptif:
 * Optimized for Bright Industrial Utility.
 * High contrast Navy titles on white canvas.
 */
export function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col gap-4 mb-6 sm:mb-8",
      "lg:flex-row lg:items-center lg:justify-between",
      className
    )}>
      <div className="flex items-center gap-4 min-w-0">
        {Icon && (
          <div className="size-11 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-900 shadow-stripe shrink-0">
            <Icon size={24} weight="fill" style={{ fill: "url(#brand-gradient)" }} />
          </div>
        )}
        <div className="min-w-0 space-y-0.5">
          <h1 className={cn(
            "font-black tracking-tight text-slate-900 leading-tight",
            "text-lg sm:text-xl md:text-2xl" 
          )}>
            {title}
          </h1>
          {description && (
            <p className={cn(
              "text-muted-foreground font-medium leading-relaxed max-w-2xl",
              "text-[11px] sm:text-xs"
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
