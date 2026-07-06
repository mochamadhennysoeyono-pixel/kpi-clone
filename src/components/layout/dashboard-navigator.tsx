
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
    ArrowRight,
    ClipboardCheck,
    Settings,
    Search,
    FilePlus,
    Folder,
    BrainCircuit,
    Settings2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

const DASHBOARD_MODES = [
    { id: 'integrated', label: 'Dashboard Appraisal', href: '/appraisal-dashboard', icon: LayoutGrid, description: 'Ringkasan Skor Terintegrasi' },
    { id: 'kpi', label: 'Dashboard KPI', href: '/reports', icon: PieChart, description: 'Analisis Target Bulanan' },
    { id: 'cycle', label: 'Dashboard Siklus KPI', href: '/cycle-reports', icon: Activity, description: 'Laporan Kumulatif Jangka Panjang' },
    { id: 'kbo', label: 'Dashboard KBO', href: '/kbo-appraisal', icon: BadgeCheck, description: 'Evaluasi Kompetensi Perilaku' },
    { id: 'okr', label: 'Dashboard OKR', href: '/okr/reports', icon: Target, description: 'Pencapaian Sasaran Strategis' },
];

const KPI_MANAGEMENT_MODES = [
    { id: 'setup', label: 'Konfigurasi Setup', href: '/setup-kpi', icon: Settings, description: 'Definisikan parameter & indikator KPI' },
    { id: 'categories', label: 'Kategori KPI', href: '/master-data/kpi-categories', icon: Folder, description: 'Kelola library kategori indikator' },
    { id: 'data', label: 'Arsip Pencapaian', href: '/master-data/kpi-data', icon: Search, description: 'Pusat penyimpanan database KPI' },
    { id: 'input', label: 'Input Realisasi', href: '/input-achievement', icon: FilePlus, description: 'Pusat input pencapaian rutin' },
];

const KBO_MANAGEMENT_MODES = [
    { id: 'competencies', label: 'Pustaka Kompetensi', href: '/master-data/kbo-competencies', icon: BrainCircuit, description: 'Kelola dimensi & perilaku kunci' },
    { id: 'categories', label: 'Kategori KBO', href: '/master-data/kbo-categories', icon: Folder, description: 'Kelola library kategori kompetensi' },
    { id: 'settings', label: 'Setup Matriks Rater', href: '/appraisal-settings', icon: Settings2, description: 'Pemetaan penilai & bobot penilaian' },
];

interface SwitcherProps {
    title: string;
    modes: typeof DASHBOARD_MODES;
    activeMode: any;
    onSwitch: (href: string) => void;
}

function GenericSwitcher({ title, modes, activeMode, onSwitch }: SwitcherProps) {
    return (
        <div className="flex items-center gap-3">
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-primary/40 hover:shadow-md transition-all active:scale-95 group">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                            <activeMode.icon size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col items-start text-left min-w-0 pr-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">{title}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-slate-900 truncate uppercase tracking-tighter">{activeMode.label}</span>
                                <ChevronDown size={14} className="text-slate-400 group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                    align="start" 
                    className="w-[calc(100vw-32px)] sm:w-[320px] p-0 overflow-hidden rounded-2xl shadow-2xl border-none z-[500]"
                >
                    <ScrollArea className="max-h-[60vh] sm:max-h-[70vh]">
                        <div className="p-2">
                            <div className="px-3 py-3 mb-1 border-b border-slate-50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pilih Mode {title}</p>
                            </div>
                            <div className="space-y-1">
                                {modes.map((mode) => {
                                    const isActive = activeMode.id === mode.id;
                                    return (
                                        <DropdownMenuItem 
                                            key={mode.id} 
                                            onClick={() => onSwitch(mode.href)}
                                            className={cn(
                                                "flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all outline-none",
                                                isActive ? "bg-primary/5 border border-primary/10" : "hover:bg-slate-50 focus:bg-slate-50"
                                            )}
                                        >
                                            <div className={cn(
                                                "size-9 rounded-lg flex items-center justify-center shrink-0 border transition-all",
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
                                            {isActive && <ArrowRight size={14} className="text-primary mt-1 shrink-0" strokeWidth={3} />}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </div>
                        </div>
                    </ScrollArea>
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden sm:flex items-center gap-2 px-4 h-12 rounded-2xl bg-slate-50 border border-slate-100 italic">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sync Status:</span>
                <span className="text-[10px] font-black text-emerald-600 uppercase">Real-time Data Active</span>
            </div>
        </div>
    );
}

export function DashboardNavigator() {
    const pathname = usePathname();
    const router = useRouter();
    const activeMode = DASHBOARD_MODES.find(m => pathname.startsWith(m.href)) || DASHBOARD_MODES[0];
    return <div className="w-full mb-8 no-print"><GenericSwitcher title="Analytics" modes={DASHBOARD_MODES} activeMode={activeMode} onSwitch={(h) => router.push(h)} /></div>;
}

export function KpiNavigator() {
    const pathname = usePathname();
    const router = useRouter();
    const activeMode = KPI_MANAGEMENT_MODES.find(m => pathname === m.href) || KPI_MANAGEMENT_MODES[0];
    return <div className="w-full mb-8 no-print"><GenericSwitcher title="Manajemen KPI" modes={KPI_MANAGEMENT_MODES} activeMode={activeMode} onSwitch={(h) => router.push(h)} /></div>;
}

export function KboNavigator() {
    const pathname = usePathname();
    const router = useRouter();
    const activeMode = KBO_MANAGEMENT_MODES.find(m => pathname === m.href) || KBO_MANAGEMENT_MODES[0];
    return <div className="w-full mb-8 no-print"><GenericSwitcher title="Manajemen KBO" modes={KBO_MANAGEMENT_MODES} activeMode={activeMode} onSwitch={(h) => router.push(h)} /></div>;
}
