
// src/components/layout/dashboard-navigator.tsx
"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
    Activity, 
    PieChart, 
    BarChart3, 
    BadgeCheck, 
    Target, 
    LayoutGrid,
    BarChartHorizontal
} from 'lucide-react';

const DASHBOARD_MODES = [
    { id: 'integrated', label: 'Dashboard Appraisal', href: '/appraisal-dashboard', icon: LayoutGrid },
    { id: 'kpi', label: 'Dashboard KPI', href: '/reports', icon: PieChart },
    { id: 'cycle', label: 'Dashboard Siklus KPI', href: '/cycle-reports', icon: Activity },
    { id: 'kbo', label: 'Dashboard KBO', href: '/kbo-appraisal', icon: BadgeCheck },
    { id: 'okr', label: 'Dashboard OKR', href: '/okr/reports', icon: Target },
];

export function DashboardNavigator() {
    const pathname = usePathname();
    const router = useRouter();

    return (
        <div className="w-full overflow-x-auto no-scrollbar pb-2 mb-6">
            <div className="flex w-max sm:w-full items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/40">
                {DASHBOARD_MODES.map((mode) => {
                    const isActive = pathname === mode.href;
                    return (
                        <button
                            key={mode.id}
                            onClick={() => router.push(mode.href)}
                            className={cn(
                                "flex items-center justify-center gap-2 px-4 h-9 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all shrink-0",
                                isActive 
                                    ? "bg-background text-primary shadow-sm ring-1 ring-border/50" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            <mode.icon size={14} className={cn(isActive ? "text-primary" : "opacity-40")} />
                            {mode.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
