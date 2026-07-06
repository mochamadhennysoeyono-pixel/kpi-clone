
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
    ChevronDown,
    ArrowRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DASHBOARD_MODES = [
    { id: 'integrated', label: 'Dashboard Appraisal', href: '/appraisal-dashboard', icon: LayoutGrid, description: 'Ringkasan Skor Terintegrasi' },
    { id: 'kpi', label: 'Dashboard KPI', href: '/reports', icon: PieChart, description: 'Analisis Target Bulanan' },
    { id: 'cycle', label: 'Dashboard Siklus KPI', href: '/cycle-reports', icon: Activity, description: 'Laporan Kumulatif Jangka Panjang' },
    { id: 'kbo', label: 'Dashboard KBO', href: '/kbo-appraisal', icon: BadgeCheck, description: 'Evaluasi Kompetensi Perilaku' },
    { id: 'okr', label: 'Dashboard OKR', href: '/okr/reports', icon: Target, description: 'Pencapaian Sasaran Strategis' },
];

export function DashboardNavigator() {
    const pathname = usePathname();
    const router = useRouter();

    const activeMode = React.useMemo(() => {
        return DASHBOARD_MODES.find(m => pathname.startsWith(m.href)) || DASHBOARD_MODES[0];
    }, [pathname]);

    return (
        <div className="w-full mb-8 no-print">
            {/* Environment Switcher (Desktop & Mobile) */}
            <div className="flex items-center gap-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-primary/40 hover:shadow-md transition-all active:scale-95 group">
                            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                <activeMode.icon size={18} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col items-start text-left min-w-0 pr-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Environment</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-sm text-slate-900 truncate uppercase tracking-tighter">{activeMode.label}</span>
                                    <ChevronDown size={14} className="text-slate-400 group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[300px] p-2 rounded-2xl shadow-2xl border-none">
                        <div className="px-3 py-2 mb-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pindah Dashboard</p>
                        </div>
                        {DASHBOARD_MODES.map((mode) => {
                            const isActive = activeMode.id === mode.id;
                            return (
                                <DropdownMenuItem 
                                    key={mode.id} 
                                    onClick={() => router.push(mode.href)}
                                    className={cn(
                                        "flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 last:mb-0",
                                        isActive ? "bg-primary/5 border border-primary/20" : "hover:bg-slate-50"
                                    )}
                                >
                                    <div className={cn(
                                        "size-9 rounded-lg flex items-center justify-center shrink-0 border",
                                        isActive ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white text-slate-400 border-slate-100"
                                    )}>
                                        <mode.icon size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn("text-xs font-black uppercase tracking-tight", isActive ? "text-primary" : "text-slate-900")}>
                                            {mode.label}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5 line-clamp-1 italic">
                                            {mode.description}
                                        </p>
                                    </div>
                                    {isActive && <ArrowRight size={14} className="text-primary mt-1" strokeWidth={3} />}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Status Indicator (Contextual) */}
                <div className="hidden sm:flex items-center gap-2 px-4 h-12 rounded-2xl bg-slate-50 border border-slate-100 italic">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sync Status:</span>
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Real-time Data Active</span>
                </div>
            </div>
        </div>
    );
}
