"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./card";
import { Badge } from "./badge";

/**
 * AdaptiveCardGrid: Mengatur jumlah kolom berdasarkan kompleksitas isi.
 */
interface AdaptiveCardGridProps {
  children: React.ReactNode;
  complexity?: 'simple' | 'medium' | 'complex';
  className?: string;
}

export function AdaptiveCardGrid({ children, complexity = 'simple', className }: AdaptiveCardGridProps) {
  const gridClasses = cn(
    "grid gap-3 sm:gap-4 md:gap-6",
    complexity === 'simple' && "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
    complexity === 'medium' && "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    complexity === 'complex' && "grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3",
    className
  );

  return <div className={gridClasses}>{children}</div>;
}

/**
 * AdaptiveMetricCard (Simple Card): Untuk angka, counter, status ringkas.
 * Optimized for Bright Contrast & Tabular Nums.
 */
interface AdaptiveMetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  badge?: string;
  trend?: { value: number; isUp: boolean };
  color?: string;
}

export function AdaptiveMetricCard({ title, value, icon: Icon, description, badge, trend, color }: AdaptiveMetricCardProps) {
  const { isMobile } = useBreakpoint();

  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-all bg-card group overflow-hidden">
      <CardContent className={cn("flex flex-col h-full", isMobile ? "p-3" : "p-6")}>
        <div className="flex items-center justify-between mb-2">
          <div className={cn(
            "rounded-xl transition-transform group-hover:scale-110 shrink-0",
            isMobile ? "p-1.5" : "p-2.5",
            color || "bg-primary/10 text-primary"
          )}>
            <Icon size={isMobile ? 16 : 22} />
          </div>
          {badge && (
            <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 h-4 border-none bg-muted/30 text-muted-foreground">
              {badge}
            </Badge>
          )}
        </div>
        
        <div className="space-y-1 min-w-0">
          <p className={cn(
            "font-black uppercase text-muted-foreground tracking-widest truncate",
            isMobile ? "text-[8px]" : "text-[10px]"
          )}>
            {title}
          </p>
          <h3 className={cn(
            "font-black text-foreground leading-none truncate tnum",
            isMobile ? "text-lg" : "text-3xl"
          )}>
            {value}
          </h3>
          
          {trend && (
            <div className={cn(
              "flex items-center gap-1 font-bold uppercase",
              isMobile ? "text-[7px]" : "text-[9px]",
              trend.isUp ? "text-green-600" : "text-rose-600"
            )}>
              {trend.value}% {isMobile ? "" : "vs periode lalu"}
            </div>
          )}

          {description && !isMobile && (
            <p className="text-[10px] font-medium text-muted-foreground opacity-60 uppercase truncate">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * AdaptiveInsightCard (Complex Card): Untuk Chart, Activity Log, Tabel Mini.
 */
interface AdaptiveInsightCardProps {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AdaptiveInsightCard({ title, description, icon: Icon, children, footer, className }: AdaptiveInsightCardProps) {
  const { isMobile } = useBreakpoint();

  return (
    <Card className={cn("shadow-sm border-border/60 overflow-hidden flex flex-col bg-card", className)}>
      <CardHeader className={isMobile ? "p-4 pb-2" : "p-6 pb-2"}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/5 rounded-lg text-primary shrink-0 border border-primary/20">
            <Icon size={isMobile ? 16 : 20} />
          </div>
          <div className="min-w-0">
            <CardTitle className={cn("font-black uppercase tracking-widest text-foreground", isMobile ? "text-[10px]" : "text-sm")}>
              {title}
            </CardTitle>
            {description && (
              <CardDescription className={cn("line-clamp-1", isMobile ? "text-[9px]" : "text-xs")}>
                {description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={isMobile ? "p-3" : "p-6"}>
        {children}
      </CardContent>
      {footer && (
        <CardFooter className={cn("bg-muted/30 border-t", isMobile ? "p-3" : "p-4")}>
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}