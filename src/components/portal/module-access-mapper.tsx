
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
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdaptiveTable } from '@/components/ui/adaptive-table';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ModuleAccessMapperProps {
    manageableCompanies: any[];
    isSuperadmin: boolean;
}

const MODULES = [
    { id: 'appraisal', label: 'Appraisal', icon: ClipboardCheck, color: 'text-blue-600' },
    { id: 'lms', label: 'LMS', icon: GraduationCap, color: 'text-amber-600' },
    { id: 'collabspace', label: 'CollabSpace', icon: LayoutGrid, color: 'text-emerald-600' },
];

export function ModuleAccessMapper({ manageableCompanies, isSuperadmin }: ModuleAccessMapperProps) {
    const { employees, departments, positions, bulkUpdateEmployeeAccess } = useMasterData();
    const { currentUser } = useAuth();

    // --- Filter States ---
    const [selectedCompany, setSelectedCompany] = useState<string>("all");
    const [selectedDept, setSelectedDept] = useState<string>("all");
    const [selectedPos, setSelectedPos] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

    // --- Smart Filter Options ---
    const deptOptions = useMemo(() => {
        if (selectedCompany === 'all') return [];
        return departments.filter(d => d.company === selectedCompany);
    }, [departments, selectedCompany]);

    const posOptions = useMemo(() => {
        if (selectedDept === 'all') return [];
        return positions.filter(p => p.company === selectedCompany && p.department === selectedDept);
    }, [positions, selectedCompany, selectedDept]);

    const filteredEmployees = useMemo(() => {
        let result = employees.filter(e => e.role === 'user');

        if (selectedCompany !== "all") result = result.filter(e => e.company === selectedCompany);
        if (selectedDept !== "all") result = result.filter(e => e.department === selectedDept);
        if (selectedPos !== "all") result = result.filter(e => e.position === selectedPos);
        
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(e => e.name.toLowerCase().includes(lower) || e.email.toLowerCase().includes(lower));
        }

        return result.sort((a, b) => a.name.localeCompare(b.name));
    }, [employees, selectedCompany, selectedDept, selectedPos, searchTerm]);

    const handleToggleSelect = (id: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedTaskIds(new Set(filteredEmployees.map(e => e.id)));
        } else {
            setSelectedTaskIds(new Set());
        }
    };

    const handleBulkUpdate = async (moduleId: string, status: boolean) => {
        if (selectedIds.size === 0) return;
        
        const updateMap: Record<string, boolean> = {};
        // Note: For existing logic we might need to preserve other module access,
        // but typically users want to toggle one specifically.
        
        // This is a simplified bulk update. In context we will merge.
        const ids = Array.from(selectedIds);
        
        // To be safe, we'll get current access and merge
        for (const id of ids) {
            const emp = employees.find(e => e.id === id);
            const currentAccess = emp?.moduleAccess || {};
            await bulkUpdateEmployeeAccess([id], { ...currentAccess, [moduleId]: status });
        }
        
        setSelectedTaskIds(new Set());
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Pilih Unit Bisnis</Label>
                    <Select value={selectedCompany} onValueChange={(v) => { setSelectedCompany(v); setSelectedDept('all'); setSelectedPos('all'); }}>
                        <SelectTrigger className="h-10 bg-slate-50 border-none shadow-none text-xs font-bold">
                            <Building size={14} className="mr-2 text-primary" />
                            <SelectValue placeholder="Perusahaan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Unit</SelectItem>
                            {manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Departemen</Label>
                    <Select value={selectedDept} onValueChange={(v) => { setSelectedDept(v); setSelectedPos('all'); }} disabled={selectedCompany === 'all'}>
                        <SelectTrigger className="h-10 bg-slate-50 border-none shadow-none text-xs font-bold">
                            <Network size={14} className="mr-2 text-primary" />
                            <SelectValue placeholder="Departemen" />
                        </SelectTrigger>
                        <SelectContent>
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
                        <SelectContent>
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

            <AdaptiveTable 
                data={filteredEmployees}
                keyExtractor={(e) => e.id}
                columns={[
                    {
                        header: "",
                        cell: (e) => (
                            <Checkbox 
                                checked={selectedIds.has(e.id)} 
                                onCheckedChange={() => handleToggleSelect(e.id)}
                            />
                        )
                    },
                    {
                        header: "Karyawan",
                        cell: (e) => (
                            <div className="flex items-center gap-3">
                                <Avatar className="size-8 border shadow-sm">
                                    <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary uppercase">
                                        {e.name.substring(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-900 truncate">{e.name}</p>
                                    <p className="text-[9px] text-muted-foreground uppercase font-black">{e.position}</p>
                                </div>
                            </div>
                        )
                    },
                    {
                        header: "Appraisal",
                        className: "text-center",
                        cell: (e) => (
                            <div className="flex justify-center">
                                <Checkbox 
                                    checked={!!e.moduleAccess?.appraisal} 
                                    onCheckedChange={(v) => bulkUpdateEmployeeAccess([e.id], { ...(e.moduleAccess || {}), appraisal: !!v })}
                                />
                            </div>
                        )
                    },
                    {
                        header: "LMS",
                        className: "text-center",
                        cell: (e) => (
                            <div className="flex justify-center">
                                <Checkbox 
                                    checked={!!e.moduleAccess?.lms} 
                                    onCheckedChange={(v) => bulkUpdateEmployeeAccess([e.id], { ...(e.moduleAccess || {}), lms: !!v })}
                                />
                            </div>
                        )
                    },
                    {
                        header: "Collab",
                        className: "text-center",
                        cell: (e) => (
                            <div className="flex justify-center">
                                <Checkbox 
                                    checked={!!e.moduleAccess?.collabspace} 
                                    onCheckedChange={(v) => bulkUpdateEmployeeAccess([e.id], { ...(e.moduleAccess || {}), collabspace: !!v })}
                                />
                            </div>
                        )
                    },
                ]}
                renderMobileCard={(e) => (
                    <Card className="border-slate-100 shadow-sm">
                        <CardContent className="p-4 space-y-4">
                            <div className="flex items-center gap-3">
                                <Checkbox checked={selectedIds.has(e.id)} onCheckedChange={() => handleToggleSelect(e.id)} />
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs">{e.name}</h4>
                                    <p className="text-[9px] text-slate-400 uppercase font-black">{e.position}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                                {MODULES.map(m => (
                                    <div key={m.id} className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-slate-50">
                                        <span className="text-[8px] font-black uppercase text-slate-400">{m.label}</span>
                                        <Checkbox 
                                            checked={!!e.moduleAccess?.[m.id]} 
                                            onCheckedChange={(v) => bulkUpdateEmployeeAccess([e.id], { ...(e.moduleAccess || {}), [m.id]: !!v })}
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            />

            {selectedIds.size > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-bottom-full duration-300">
                    <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-6 border-none">
                        <div className="flex items-center gap-2 border-r border-white/20 pr-6">
                            <Users className="size-4" />
                            <span className="text-xs font-black uppercase tracking-tight">{selectedIds.size} Staff Terpilih</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-white/50">AKTIFKAN AKSES:</div>
                            {MODULES.map(m => (
                                <button 
                                    key={m.id}
                                    onClick={() => handleBulkUpdate(m.id, true)}
                                    className="flex flex-col items-center gap-1 hover:text-primary transition-colors group"
                                >
                                    <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                        <m.icon size={16} />
                                    </div>
                                    <span className="text-[8px] font-black">{m.label}</span>
                                </button>
                            ))}
                            <Separator orientation="vertical" className="h-8 bg-white/10" />
                            <button 
                                onClick={() => handleSelectAll(false)}
                                className="size-8 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
