
"use client";

import React from "react";
import { Card, CardContent } from "./card";
import { cn } from "@/lib/utils";
import { useBreakpoint } from "@/hooks/use-breakpoint";

interface ResponsiveStatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  color?: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
}

export function ResponsiveStatCard({ title, value, icon: Icon, description, color, trend }: ResponsiveStatCardProps) {
  return (
    <Card className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all bg-background">
      <CardContent className="p-4 sm:p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest truncate">{title}</p>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 leading-none truncate">{value}</h3>
            
            {trend && (
               <div className={cn(
                 "flex items-center gap-1 text-[9px] font-bold uppercase",
                 trend.isUp ? "text-green-600" : "text-rose-600"
               )}>
                 {trend.value}% dari periode lalu
               </div>
            )}
            
            {description && (
              <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground opacity-60 uppercase truncate">{description}</p>
            )}
          </div>
          <div className={cn(
            "p-2.5 sm:p-3 rounded-xl transition-transform group-hover:scale-110 duration-300 shrink-0",
            color || "bg-primary/10 text-primary"
          )}>
            <Icon className="size-4 sm:size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
