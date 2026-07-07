
// src/components/portal/module-access-mapper.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { 
    Users, 
    Search, 
    Building, 
    Network, 
    Briefcase, 
    ShieldCheck, 
    ChevronDown, 
    Check, 
    X,
    Filter,
    ClipboardCheck,
    GraduationCap,
    LayoutGrid,
    CheckCircle2,
    Lock,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdaptiveTable } from '@/components/ui/adaptive-table';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Employee, ModuleId, Company } from '@/types';

interface ModuleAccessMapperProps {
    manageableCompanies: Company[];
    isSuperadmin: boolean;
}

const MODULE_DEFS = [
    { id: 'appraisal' as ModuleId, label: 'Appraisal', icon: ClipboardCheck, color: 'text-blue-600' },
    { id: 'lms' as ModuleId, label: 'LMS', icon: GraduationCap, color: 'text-amber-600' },
    { id: 'collabspace' as ModuleId, label: 'Collab', icon: LayoutGrid, color: 'text-emerald-600' },
];

export function ModuleAccessMapper({ manageableCompanies, isSuperadmin }: ModuleAccessMapperProps) {
    const { employees, departments, positions, bulkUpdateEmployeeAccess, companies } = useMasterData();
    const { currentUser } = useAuth();
    const { toast } = useToast();

    // --- Filter States ---
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
    const [selectedDept, setSelectedDept] = useState<string>("all");
    const [selectedPos, setSelectedPos] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

    // --- Data Mapping & Quota Analysis ---
    const selectedCompanyData = useMemo(() => 
        companies.find(c => c.id === selectedCompanyId),
    [companies, selectedCompanyId]);

    const moduleStats = useMemo(() => {
        const stats: Record<string, { used: number, total: number, active: boolean, remaining: number }> = {};
        
        MODULE_DEFS.forEach(m => {
            const sub = selectedCompanyData?.moduleSubscriptions?.[m.id];
            const isActive = sub?.status === 'active';
            const limit = sub?.quota ?? 0;
            const used = employees.filter(e => e.company === selectedCompanyData?.name && e.moduleAccess?.[m.id]).length;
            const remaining = limit === -1 ? Infinity : Math.max(0, limit - used);
            
            stats[m.id] = { used, total: limit, active: isActive, remaining };
        });
        
        return stats;
    }, [selectedCompanyData, employees]);

    // --- UI Filter: Only show active modules in table ---
    const activeModules = useMemo(() => {
        // Jika "Semua", tampilkan semua modul yang aktif di setidaknya satu perusahaan yang dikelola
        if (selectedCompanyId === 'all') {
            return MODULE_DEFS.filter(m => {
                return manageableCompanies.some(c => c.moduleSubscriptions?.[m.id]?.status === 'active');
            });
        }
        // Jika spesifik, hanya yang aktif di perusahaan itu
        return MODULE_DEFS.filter(m => moduleStats[m.id].active);
    }, [selectedCompanyId, moduleStats, manageableCompanies]);

    const deptOptions = useMemo(() => {
        if (selectedCompanyId === 'all') return [];
        const companyName = selectedCompanyData?.name;
        return departments.filter(d => d.company === companyName);
    }, [departments, selectedCompanyId, selectedCompanyData]);

    const posOptions = useMemo(() => {
        if (selectedDept === 'all') return [];
        const companyName = selectedCompanyData?.name;
        return positions.filter(p => p.company === companyName && p.department === selectedDept);
    }, [positions, selectedCompanyId, selectedCompanyData, selectedDept]);

    const filteredEmployees = useMemo(() => {
        let result = employees.filter(e => e.role === 'user');

        if (selectedCompanyId !== "all") {
            const companyName = selectedCompanyData?.name;
            result = result.filter(e => e.company === companyName);
        }
        if (selectedDept !== "all") result = result.filter(e => e.department === selectedDept);
        if (selectedPos !== "all") result = result.filter(e => e.position === selectedPos);
        
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(e => e.name.toLowerCase().includes(lower) || e.email.toLowerCase().includes(lower));
        }

        return result.sort((a, b) => a.name.localeCompare(b.name));
    }, [employees, selectedCompanyId, selectedCompanyData, selectedDept, selectedPos, searchTerm]);

    // --- Validation Logic ---
    const validateQuota = (employee: Employee, moduleId: ModuleId, activating: boolean) => {
        if (!activating) return { allowed: true };

        const empCompany = companies.find(c => c.name === employee.company);
        const sub = empCompany?.moduleSubscriptions?.[moduleId];

        if (!sub || sub.status !== 'active') {
            return { allowed: false, reason: `Modul ${moduleId.toUpperCase()} belum diaktifkan untuk ${employee.company}.` };
        }

        if (sub.quota === -1) return { allowed: true };

        const currentUsed = employees.filter(e => e.company === employee.company && e.moduleAccess?.[moduleId]).length;
        if (currentUsed >= sub.quota) {
            return { allowed: false, reason: `Kuota ${moduleId.toUpperCase()} penuh (${sub.quota}/${sub.quota}). Silakan investasi tambah kuota.` };
        }

        return { allowed: true };
    };

    const handleToggleSelect = (id: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleIndividualToggle = async (employee: Employee, moduleId: ModuleId, checked: boolean) => {
        const validation = validateQuota(employee, moduleId, checked);
        
        if (!validation.allowed) {
            toast({ variant: 'destructive', title: "Akses Ditolak", description: validation.reason });
            return;
        }

        const newAccess = { ...(employee.moduleAccess || {}), [moduleId]: checked };
        await bulkUpdateEmployeeAccess([employee.id], newAccess);
    };

    const handleBulkUpdate = async (moduleId: ModuleId, status: boolean) => {
        if (selectedTaskIds.size === 0) return;
        
        const ids = Array.from(selectedTaskIds);
        const targets = filteredEmployees.filter(e => ids.includes(e.id));
        const companiesAffected = new Set(targets.map(t => t.company));
        
        for (const companyName of Array.from(companiesAffected)) {
            const comp = companies.find(c => c.name === companyName);
            const sub = comp?.moduleSubscriptions?.[moduleId];
            const limit = sub?.quota ?? 0;

            if (!sub || sub.status !== 'active') {
                toast({ variant: 'destructive', title: "Gagal Masal", description: `Modul ${moduleId.toUpperCase()} tidak aktif di ${companyName}.` });
                return;
            }

            if (limit !== -1) {
                const currentUsed = employees.filter(e => e.company === companyName && e.moduleAccess?.[moduleId]).length;
                const newAdditions = targets.filter(t => t.company === companyName && !t.moduleAccess?.[moduleId] && status).length;
                
                if (currentUsed + newAdditions > limit) {
                    toast({ variant: 'destructive', title: "Kuota Tidak Cukup", description: `Batas kuota ${companyName} akan terlampaui jika aksi ini dijalankan.` });
                    return;
                }
            }
        }

        await Promise.all(targets.map(e => {
            const newAccess = { ...(e.moduleAccess || {}), [moduleId]: status };
            return bulkUpdateEmployeeAccess([e.id], newAccess);
        }));

        setSelectedTaskIds(new Set());
        toast({ title: "Akses Masal Berhasil Diperbarui" });
    };

    return (
        <div className="space-y-6">
            {/* Filter Panel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Pilih Unit Bisnis</Label>
                    <Select value={selectedCompanyId} onValueChange={(v) => { setSelectedCompanyId(v); setSelectedDept('all'); setSelectedPos('all'); }}>
                        <SelectTrigger className="h-10 bg-slate-50 border-none shadow-none text-xs font-bold">
                            <Building size={14} className="mr-2 text-primary" />
                            <SelectValue placeholder="Perusahaan" />
                        </SelectTrigger>
                        <SelectContent className="z-[350]">
                            <SelectItem value="all">Semua Unit</SelectItem>
                            {manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Departemen</Label>
                    <Select value={selectedDept} onValueChange={(v) => { setSelectedDept(v); setSelectedPos('all'); }} disabled={selectedCompanyId === 'all'}>
                        <SelectTrigger className="h-10 bg-slate-50 border-none shadow-none text-xs font-bold">
                            <Network size={14} className="mr-2 text-primary" />
                            <SelectValue placeholder="Departemen" />
                        </SelectTrigger>
                        <SelectContent className="z-[350]">
                            <SelectItem value="all">Semua Dept</SelectItem>
                            {deptOptions.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Jabatan</Label>
                    <Select value={selectedPos} onValueChange={setSelectedPos} disabled={selectedDept === 'all'}>
                        <SelectTrigger className="h-10 bg-slate-50 border-none shadow-none text-xs font-bold">
                            <Briefcase size={14} className="mr-2 text-primary" />
                            <SelectValue placeholder="Jabatan" />
                        </SelectTrigger>
                        <SelectContent className="z-[350]">
                            <SelectItem value="all">Semua Jabatan</SelectItem>
                            {posOptions.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Pencarian Nama</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                        <Input 
                            placeholder="Cari staff..." 
                            className="h-10 pl-9 bg-slate-50 border-none shadow-none text-xs font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Staff Table */}
            <AdaptiveTable 
                data={filteredEmployees}
                keyExtractor={(e) => e.id}
                columns={[
                    {
                        header: "",
                        className: "w-10",
                        cell: (e) => (
                            <Checkbox 
                                checked={selectedTaskIds.has(e.id)} 
                                onCheckedChange={() => handleToggleSelect(e.id)}
                            />
                        )
                    },
                    {
                        header: "Karyawan",
                        cell: (e) => (
                            <div className="flex items-center gap-3">
                                <Avatar className="size-8 border shadow-sm shrink-0">
                                    <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary uppercase">
                                        {e.name.substring(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-900 truncate">{e.name}</p>
                                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tight">{e.company}</p>
                                </div>
                            </div>
                        )
                    },
                    ...activeModules.map(m => ({
                        header: (
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase">{m.label}</span>
                                {selectedCompanyId !== 'all' && (
                                    <div className="flex flex-col items-center -mt-0.5">
                                        <span className="text-[8px] opacity-60 font-bold">({moduleStats[m.id].used}/{moduleStats[m.id].total === -1 ? '∞' : moduleStats[m.id].total})</span>
                                        <span className={cn("text-[7px] font-black uppercase", moduleStats[m.id].remaining <= 2 ? "text-rose-500" : "text-emerald-600")}>
                                            Sisa: {moduleStats[m.id].remaining === Infinity ? '∞' : moduleStats[m.id].remaining}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ),
                        className: "text-center",
                        cell: (e: Employee) => {
                            const empCompany = companies.find(c => c.name === e.company);
                            const sub = empCompany?.moduleSubscriptions?.[m.id];
                            const isActive = sub?.status === 'active';

                            if (!isActive) return <div className="flex justify-center"><Lock size={12} className="text-slate-200" /></div>;

                            return (
                                <div className="flex justify-center">
                                    <Checkbox 
                                        checked={!!e.moduleAccess?.[m.id]} 
                                        onCheckedChange={(v) => handleIndividualToggle(e, m.id, !!v)}
                                    />
                                </div>
                            );
                        }
                    }))
                ]}
                renderMobileCard={(e) => (
                    <Card className="border-border/40 shadow-sm bg-background">
                        <CardContent className="p-4 space-y-4">
                            <div className="flex items-center gap-4">
                                <Checkbox checked={selectedTaskIds.has(e.id)} onCheckedChange={() => handleToggleSelect(e.id)} />
                                <Avatar className="size-9 border shadow-sm">
                                    <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary uppercase">
                                        {e.name.substring(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-sm text-slate-900 truncate">{e.name}</h4>
                                    <p className="text-[9px] text-slate-400 uppercase font-black">{e.position}</p>
                                </div>
                            </div>
                            <div className={cn("grid gap-2 pt-3 border-t", `grid-cols-${activeModules.length || 1}`)}>
                                {activeModules.map(m => {
                                    const empCompany = companies.find(c => c.name === e.company);
                                    const isActive = empCompany?.moduleSubscriptions?.[m.id]?.status === 'active';
                                    return (
                                        <div key={m.id} className={cn(
                                            "flex flex-col items-center gap-1.5 p-2 rounded-lg",
                                            isActive ? "bg-slate-50" : "bg-muted/30 opacity-40"
                                        )}>
                                            <span className="text-[8px] font-black uppercase text-slate-400">{m.label}</span>
                                            {isActive ? (
                                                <Checkbox 
                                                    checked={!!e.moduleAccess?.[m.id]} 
                                                    onCheckedChange={(v) => handleIndividualToggle(e, m.id, !!v)}
                                                />
                                            ) : <Lock size={10} />}
                                        </div>
                                    );
                                })}
                                {activeModules.length === 0 && <p className="col-span-full text-center text-[10px] text-muted-foreground italic py-2">Tidak ada modul aktif untuk unit ini.</p>}
                            </div>
                        </CardContent>
                    </Card>
                )}
            />

            {/* Bulk Actions Floating Bar */}
            {selectedTaskIds.size > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-bottom-full duration-300 w-[calc(100%-32px)] sm:w-auto">
                    <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-4 sm:px-8 py-3 flex flex-col sm:flex-row items-center gap-4 sm:gap-8 border-none">
                        <div className="flex items-center gap-2 border-b sm:border-b-0 sm:border-r border-white/20 pb-2 sm:pb-0 sm:pr-8 w-full sm:w-auto justify-center">
                            <Users className="size-4" />
                            <span className="text-xs font-black uppercase tracking-tight">{selectedTaskIds.size} Staff Terpilih</span>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <div className="hidden lg:block text-[9px] font-bold uppercase tracking-widest text-white/50">MANDAT AKSES:</div>
                            {activeModules.map(m => (
                                <button 
                                    key={m.id}
                                    onClick={() => handleBulkUpdate(m.id, true)}
                                    className="flex flex-col items-center gap-1 hover:text-primary transition-colors group"
                                >
                                    <div className="size-9 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                        {React.createElement(m.icon, { size: 18 })}
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-tighter">{m.label}</span>
                                </button>
                            ))}
                            <Separator orientation="vertical" className="h-10 bg-white/10 hidden sm:block" />
                            <button 
                                onClick={() => setSelectedTaskIds(new Set())}
                                className="size-9 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all active:scale-90"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
