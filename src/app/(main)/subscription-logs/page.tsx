// src/app/(main)/subscription-logs/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { 
    History, 
    Search, 
    Building, 
    Filter, 
    Download, 
    Clock, 
    Users, 
    Crown,
    GitMerge,
} from "lucide-react";
import { format, formatDistanceToNowStrict, isAfter } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SubscriptionLogsPage() {
    const { subscriptionLogs, companies, subscriptionPlans, employees } = useMasterData();
    const { userRole } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("logs");

    const filteredLogs = useMemo(() => {
        let logs = [...subscriptionLogs].sort((a, b) => {
            const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
            const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        if (searchTerm && activeTab === 'logs') {
            const lowerSearch = searchTerm.toLowerCase();
            logs = logs.filter(l => l.companyName.toLowerCase().includes(lowerSearch) || l.planName.toLowerCase().includes(lowerSearch) || l.performedBy.toLowerCase().includes(lowerSearch));
        }
        if (actionFilter !== "all" && activeTab === 'logs') logs = logs.filter(l => l.action === actionFilter);
        return logs;
    }, [subscriptionLogs, searchTerm, actionFilter, activeTab]);

    const companyStatuses = useMemo(() => {
        const result = companies.map(company => {
            const plan = subscriptionPlans.find(p => p.id === company.subscriptionPlanId);
            let statusBadge = { label: 'Tidak Aktif', variant: 'outline' as const };
            let remainingText = 'N/A';
            
            if (company.subscriptionExpiryDate) {
                const expiry = new Date(company.subscriptionExpiryDate);
                const now = new Date();
                if (isAfter(now, expiry)) {
                    statusBadge = { label: 'Expired', variant: 'destructive' as const };
                    remainingText = 'Habis';
                } else {
                    statusBadge = { label: 'Aktif', variant: 'default' as const };
                    remainingText = formatDistanceToNowStrict(expiry, { unit: 'day', locale: localeId });
                }
            }

            const companyEmployees = employees.filter(e => e.company === company.name);
            const userCount = companyEmployees.filter(e => e.role === 'user').length;
            const mgmtCount = companyEmployees.filter(e => e.role === 'manajemen').length;

            return { ...company, planName: plan?.name || (company.subscriptionPlanId === 'default-trial' ? 'TRIAL' : 'N/A'), statusBadge, remainingText, usage: { userCount, mgmtCount } };
        });

        if (searchTerm && activeTab === 'status') return result.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return result.sort((a, b) => a.name.localeCompare(b.name));
    }, [companies, subscriptionPlans, employees, searchTerm, activeTab]);

    const handleExport = () => {
        const data = activeTab === 'logs' 
            ? filteredLogs.map(l => ({ 'Waktu': l.timestamp?.toDate ? format(l.timestamp.toDate(), "yyyy-MM-dd HH:mm") : 'N/A', 'Perusahaan': l.companyName, 'Aksi': l.action, 'Paket': l.planName, 'Nilai (Rp)': l.amount, 'Petugas': l.performedBy }))
            : companyStatuses.map(c => ({ 'Perusahaan': c.name, 'Paket': c.planName, 'Status': c.statusBadge.label, 'Sisa Hari': c.remainingText, 'Staff': c.usage.userCount, 'Admin': c.usage.mgmtCount }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab === 'logs' ? "Activity" : "Status");
        XLSX.writeFile(wb, `Log_Subscription_${activeTab}_${format(new Date(), "yyyyMMdd")}.xlsx`);
    };

    if (userRole !== 'superadmin') return <div className="p-10 text-center">Akses Ditolak.</div>;

    return (
        <ResponsivePage>
            <PageHeader 
                title="Pusat Log & Status Langganan"
                description="Monitoring aktivitas transaksi dan status paket seluruh klien secara terpusat."
                icon={History}
                actions={<Button onClick={handleExport} variant="outline" className="font-bold shadow-sm h-9 sm:h-10"><Download className="mr-2 size-4" /> Ekspor Excel</Button>}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6 p-1 bg-muted/50 rounded-xl">
                    <TabsTrigger value="logs" className="font-bold text-xs rounded-lg">Log Aktivitas</TabsTrigger>
                    <TabsTrigger value="status" className="font-bold text-xs rounded-lg">Status Klien</TabsTrigger>
                </TabsList>

                <ResponsiveToolbar className="mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input placeholder="Cari data..." className="pl-9 h-10 border-none bg-background/50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    {activeTab === 'logs' && (
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="w-full md:w-[180px] h-10 bg-background border-none">
                                <Filter className="size-4 mr-2 text-primary" />
                                <SelectValue placeholder="Semua Aksi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Aksi</SelectItem>
                                <SelectItem value="TRIAL">Trial</SelectItem>
                                <SelectItem value="UPGRADE">Upgrade</SelectItem>
                                <SelectItem value="RENEW">Perpanjangan</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </ResponsiveToolbar>

                <TabsContent value="logs" className="m-0 border-none">
                    <AdaptiveTable 
                        data={filteredLogs}
                        keyExtractor={(l) => l.id}
                        columns={[
                            { header: "Waktu", cell: (l) => <span className="text-[10px] font-bold text-muted-foreground uppercase">{l.timestamp ? format(l.timestamp.toDate(), "d MMM, HH:mm") : 'N/A'}</span> },
                            { header: "Perusahaan", cell: (l) => <div className="flex items-center gap-2"><Building size={14} className="text-muted-foreground" /><span className="font-bold text-slate-900">{l.companyName}</span></div> },
                            { header: "Aksi", cell: (l) => <Badge variant="outline" className="text-[9px] font-black uppercase border-none bg-primary/5">{l.action.replace('_', ' ')}</Badge> },
                            { header: "Paket", accessorKey: "planName", className: "font-semibold" },
                            { header: "Nilai (Rp)", className: "text-right font-mono font-bold", cell: (l) => l.amount.toLocaleString('id-ID') },
                            { header: "Petugas", accessorKey: "performedBy", className: "text-muted-foreground text-xs" }
                        ]}
                        renderMobileCard={(l) => (
                            <Card className="border-border/40 shadow-sm">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0">
                                            <h4 className="font-black text-sm uppercase truncate text-slate-800">{l.companyName}</h4>
                                            <p className="text-[9px] font-bold text-muted-foreground">{l.timestamp ? format(l.timestamp.toDate(), "d MMM yyyy, HH:mm") : 'N/A'}</p>
                                        </div>
                                        <Badge variant="secondary" className="text-[8px] font-black uppercase">{l.action}</Badge>
                                    </div>
                                    <div className="flex justify-between items-end pt-2 border-t border-dashed">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase">Nilai Transaksi</p>
                                        <p className="font-mono text-sm font-black text-primary">Rp {l.amount.toLocaleString('id-ID')}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    />
                </TabsContent>

                <TabsContent value="status" className="m-0 border-none">
                    <AdaptiveTable 
                        data={companyStatuses}
                        keyExtractor={(c) => c.id}
                        columns={[
                            { header: "Nama Perusahaan", cell: (c) => <div className="flex flex-col"><div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">{c.name} {c.isHolding && <GitMerge className="size-3 text-primary" />}</div><div className="text-[9px] text-muted-foreground font-black uppercase">{c.businessField}</div></div> },
                            { header: "Paket", cell: (c) => <Badge variant="secondary" className="font-black text-[9px] tracking-widest">{c.planName}</Badge> },
                            { header: "Status", cell: (c) => <Badge variant={c.statusBadge.variant} className="text-[9px] uppercase font-bold border-none">{c.statusBadge.label}</Badge> },
                            { header: "Sisa Waktu", cell: (c) => <div className="flex flex-col items-center gap-0.5"><span className="text-xs font-bold text-primary">{c.remainingText}</span><Clock size={10} className="opacity-20" /></div> },
                            { header: "Utilisasi", className: "text-right", cell: (c) => <div className="text-[9px] font-bold uppercase space-y-0.5"><div>Staff: <span className="text-primary">{c.usage.userCount}</span></div><div>Admin: <span className="text-primary">{c.usage.mgmtCount}</span></div></div> }
                        ]}
                        renderMobileCard={(c) => (
                            <Card className="border-border/40 shadow-sm overflow-hidden">
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="min-w-0">
                                            <h3 className="font-black text-sm uppercase truncate">{c.name}</h3>
                                            <Badge variant="secondary" className="text-[8px] h-4 mt-1">{c.planName}</Badge>
                                        </div>
                                        <Badge variant={c.statusBadge.variant} className="text-[8px] font-black h-5">{c.statusBadge.label}</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                                        <div className="p-2 rounded-lg bg-muted/30 text-center">
                                            <p className="text-[8px] font-black text-muted-foreground uppercase">Sisa Waktu</p>
                                            <p className="text-xs font-black text-primary">{c.remainingText}</p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-muted/30 text-center">
                                            <p className="text-[8px] font-black text-muted-foreground uppercase">Total Staff</p>
                                            <p className="text-xs font-black text-primary">{c.usage.userCount}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    />
                </TabsContent>
            </Tabs>
        </ResponsivePage>
    );
}
