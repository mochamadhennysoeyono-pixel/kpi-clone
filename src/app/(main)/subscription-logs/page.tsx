
// src/app/(main)/subscription-logs/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    History, 
    Search, 
    Building, 
    Filter, 
    Download, 
    ShieldCheck, 
    Clock, 
    AlertCircle, 
    Users, 
    Crown,
    GitMerge,
    LayoutGrid
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNowStrict, isAfter, isBefore } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';

export default function SubscriptionLogsPage() {
    const { subscriptionLogs, companies, subscriptionPlans, employees } = useMasterData();
    const { userRole } = useAuth();
    
    // UI State
    const [searchTerm, setSearchTerm] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("logs");

    // --- Logic for Activity Logs ---
    const filteredLogs = useMemo(() => {
        let logs = [...subscriptionLogs].sort((a, b) => {
            const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
            const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        if (searchTerm && activeTab === 'logs') {
            const lowerSearch = searchTerm.toLowerCase();
            logs = logs.filter(l => 
                l.companyName.toLowerCase().includes(lowerSearch) || 
                l.planName.toLowerCase().includes(lowerSearch) ||
                l.performedBy.toLowerCase().includes(lowerSearch)
            );
        }

        if (actionFilter !== "all" && activeTab === 'logs') {
            logs = logs.filter(l => l.action === actionFilter);
        }

        return logs;
    }, [subscriptionLogs, searchTerm, actionFilter, activeTab]);

    // --- Logic for Company Subscription Status ---
    const companyStatuses = useMemo(() => {
        const result = companies.map(company => {
            const plan = subscriptionPlans.find(p => p.id === company.subscriptionPlanId);
            
            // Calc Remaining
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

            // Calc Usage
            const companyEmployees = employees.filter(e => e.company === company.name);
            const userCount = companyEmployees.filter(e => e.role === 'user').length;
            const mgmtCount = companyEmployees.filter(e => e.role === 'manajemen').length;

            return {
                ...company,
                planName: plan?.name || (company.subscriptionPlanId === 'default-trial' ? 'TRIAL' : 'N/A'),
                statusBadge,
                remainingText,
                usage: { userCount, mgmtCount }
            };
        });

        if (searchTerm && activeTab === 'status') {
            return result.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return result.sort((a, b) => a.name.localeCompare(b.name));
    }, [companies, subscriptionPlans, employees, searchTerm, activeTab]);

    const handleExport = () => {
        if (activeTab === 'logs') {
            const dataToExport = filteredLogs.map(log => ({
                'Waktu': log.timestamp?.toDate ? format(log.timestamp.toDate(), "yyyy-MM-dd HH:mm") : 'N/A',
                'Perusahaan': log.companyName,
                'Aksi': log.action,
                'Paket': log.planName,
                'Nilai (Rp)': log.amount,
                'Mulai': log.startDate ? format(new Date(log.startDate), "yyyy-MM-dd") : '-',
                'Selesai': log.endDate ? format(new Date(log.endDate), "yyyy-MM-dd") : '-',
                'Petugas': log.performedBy
            }));
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Log Aktivitas");
            XLSX.writeFile(wb, `Log_Aktivitas_Global_${format(new Date(), "yyyyMMdd")}.xlsx`);
        } else {
            const dataToExport = companyStatuses.map(c => ({
                'Perusahaan': c.name,
                'Paket': c.planName,
                'Status': c.statusBadge.label,
                'Aktif Sejak': c.subscriptionActivationDate ? format(new Date(c.subscriptionActivationDate), "yyyy-MM-dd") : '-',
                'Berakhir': c.subscriptionExpiryDate ? format(new Date(c.subscriptionExpiryDate), "yyyy-MM-dd") : '-',
                'Sisa Hari': c.remainingText,
                'Staff': c.usage.userCount,
                'Admin': c.usage.mgmtCount
            }));
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Status Berlangganan");
            XLSX.writeFile(wb, `Status_Berlangganan_Global_${format(new Date(), "yyyyMMdd")}.xlsx`);
        }
    };

    if (userRole !== 'superadmin') {
        return <div className="p-10 text-center">Akses Ditolak.</div>;
    }

    return (
        <div className="space-y-6">
            <Card className="shadow-lg border-t-4 border-primary">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <History className="size-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="font-headline text-2xl">Pusat Log & Status Langganan</CardTitle>
                                <CardDescription>Monitoring aktivitas transaksi dan status paket seluruh klien.</CardDescription>
                            </div>
                        </div>
                        <Button onClick={handleExport} variant="outline" className="font-bold">
                            <Download className="mr-2 size-4" />
                            Ekspor Excel
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-2">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="logs" className="font-bold">Log Aktivitas</TabsTrigger>
                            <TabsTrigger value="status" className="font-bold">Status Semua Perusahaan</TabsTrigger>
                        </TabsList>

                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input 
                                    placeholder={activeTab === 'logs' ? "Cari perusahaan, paket, atau petugas..." : "Cari nama perusahaan..."} 
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {activeTab === 'logs' && (
                                <div className="flex items-center gap-2">
                                    <Filter className="size-4 text-muted-foreground hidden sm:block" />
                                    <Select value={actionFilter} onValueChange={setActionFilter}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Semua Aksi" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Aksi</SelectItem>
                                            <SelectItem value="TRIAL">Trial</SelectItem>
                                            <SelectItem value="UPGRADE">Upgrade</SelectItem>
                                            <SelectItem value="RENEW">Perpanjangan</SelectItem>
                                            <SelectItem value="MANUAL_CHANGE">Perubahan Manual</SelectItem>
                                            <SelectItem value="EXPIRED">Kedaluwarsa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <TabsContent value="logs" className="m-0 border rounded-xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-bold text-[10px] uppercase">Waktu</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase">Perusahaan</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase">Aksi</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase">Paket</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase text-right">Nilai (Rp)</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase text-right">Petugas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.length > 0 ? (
                                        filteredLogs.map((log) => (
                                            <TableRow key={log.id} className="hover:bg-muted/5">
                                                <TableCell className="text-xs py-4 font-medium">
                                                    {log.timestamp ? format(log.timestamp.toDate(), "d MMM yyyy, HH:mm") : 'N/A'}
                                                </TableCell>
                                                <TableCell className="font-bold text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Building className="size-3 text-muted-foreground" />
                                                        {log.companyName}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn(
                                                        "text-[9px] font-black uppercase border-none",
                                                        log.action === 'TRIAL' ? "bg-amber-100 text-amber-700" :
                                                        log.action === 'UPGRADE' ? "bg-green-100 text-green-700" :
                                                        "bg-blue-100 text-blue-700"
                                                    )}>
                                                        {log.action.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm font-semibold">{log.planName}</TableCell>
                                                <TableCell className="text-xs font-mono text-right font-bold">
                                                    {log.amount.toLocaleString('id-ID')}
                                                </TableCell>
                                                <TableCell className="text-xs font-semibold text-muted-foreground text-right">{log.performedBy}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic text-xs">
                                                Tidak ada data log yang ditemukan.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>

                        <TabsContent value="status" className="m-0 border rounded-xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-bold text-[10px] uppercase">Nama Perusahaan</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase text-center">Paket</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase text-center">Status</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase text-center">Berakhir Pada</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase text-center">Sisa Waktu</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase text-right">Karyawan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {companyStatuses.length > 0 ? (
                                        companyStatuses.map((company) => (
                                            <TableRow key={company.id} className="hover:bg-muted/5 group">
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-sm">{company.name}</div>
                                                        {company.isHolding && <GitMerge className="size-3 text-primary" />}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground uppercase font-bold">{company.businessField}</div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="secondary" className="font-black text-[10px] tracking-widest">{company.planName}</Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={company.statusBadge.variant} className="text-[9px] uppercase font-bold border-none">
                                                        {company.statusBadge.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center text-xs font-medium">
                                                    {company.subscriptionExpiryDate ? format(new Date(company.subscriptionExpiryDate), "d MMM yyyy") : '-'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-xs font-bold text-primary">{company.remainingText}</span>
                                                        {company.statusBadge.label === 'Aktif' && (
                                                            <Clock className="size-3 text-muted-foreground opacity-40" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                                            <Users size={10} className="text-muted-foreground" />
                                                            <span>Staff: {company.usage.userCount}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                                            <Crown size={10} className="text-primary" />
                                                            <span>Admin: {company.usage.mgmtCount}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic text-xs">
                                                Tidak ada data perusahaan untuk ditampilkan.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
