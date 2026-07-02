"use client";

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    LayoutGrid, 
    ArrowRight, 
    Building, 
    User, 
    Mail, 
    Phone, 
    History,
    ShieldCheck,
    GraduationCap,
    ClipboardCheck,
    Lock,
    Zap,
    Crown,
    CheckCircle2,
    XCircle,
    Info,
    ArrowUpRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { ModuleId, ModuleSubscription, SubscriptionLog } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ModuleSubscriptionDialog } from '@/components/portal/module-subscription-dialog';
import { useToast } from '@/hooks/use-toast';
import { serverTimestamp } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';

// --- Static Data for Modules ---
const MODULE_CATALOG = [
    {
        id: 'appraisal' as ModuleId,
        name: 'Modul Appraisal',
        description: 'Manajemen Kinerja terintegrasi (KPI, KBO, & OKR) untuk pertumbuhan tim.',
        icon: ClipboardCheck,
        color: 'text-blue-600',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        route: '/action-center',
    },
    {
        id: 'lms' as ModuleId,
        name: 'Modul LMS',
        description: 'Portal pembelajaran mandiri dan program pengembangan kompetensi.',
        icon: GraduationCap,
        color: 'text-amber-600',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        route: '/lms/user/my-learnings',
    },
    {
        id: 'collabspace' as ModuleId,
        name: 'Modul CollabSpace',
        description: 'Pusat koordinasi tugas harian dan kolaborasi project tim.',
        icon: LayoutGrid,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        route: '/collab-space',
    }
];

function ModuleCard({ 
    config, 
    subscription, 
    isManagement,
    onActivateRequest
}: { 
    config: typeof MODULE_CATALOG[0], 
    subscription?: ModuleSubscription, 
    isManagement: boolean,
    onActivateRequest: (m: any) => void
}) {
    const isActive = subscription?.status === 'active';
    const isExpired = subscription?.status === 'expired';
    
    return (
        <Card className={cn(
            "flex flex-col h-full border-2 transition-all group overflow-hidden",
            isActive ? "border-primary shadow-lg scale-[1.01]" : "border-transparent hover:border-muted-foreground/20 hover:shadow-md"
        )}>
            <CardHeader className="pb-4 relative">
                <div className={cn("p-2.5 rounded-xl w-fit mb-4 transition-transform group-hover:scale-110", config.bg, config.color)}>
                    <config.icon size={24} />
                </div>
                {isActive && (
                    <Badge className="absolute top-6 right-6 bg-green-500 hover:bg-green-600 font-bold border-none text-[10px] uppercase">
                        Aktif
                    </Badge>
                )}
                <CardTitle className="text-xl font-headline font-bold">{config.name}</CardTitle>
                <CardDescription className="text-xs leading-relaxed min-h-[40px]">
                    {config.description}
                </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-grow pt-0">
                {isActive ? (
                    <div className="space-y-3 bg-muted/30 p-3 rounded-xl border border-dashed text-[11px] font-medium">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground uppercase tracking-tight">Tipe Paket</span>
                            <Badge variant="outline" className="h-5 px-1.5 font-bold uppercase text-[9px]">{subscription.type}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground uppercase tracking-tight">Kuota User</span>
                            <span className="font-bold">{subscription.quota === -1 ? 'Unlimited' : subscription.quota} User</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground uppercase tracking-tight">Sisa Masa Aktif</span>
                            <span className={cn("font-bold", isExpired ? "text-destructive" : "text-primary")}>
                                {subscription.expiryDate ? format(new Date(subscription.expiryDate), 'd MMM yyyy') : 'N/A'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="py-4 text-center">
                        {isManagement ? (
                            <div className="flex flex-col items-center gap-2 opacity-40">
                                <Lock size={20} className="text-muted-foreground" />
                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Belum Berlangganan</p>
                            </div>
                        ) : (
                            <p className="text-[11px] text-muted-foreground italic">Hubungi Admin untuk akses modul ini.</p>
                        )}
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-4 border-t bg-muted/5 mt-auto">
                {isActive ? (
                    <Button asChild className="w-full font-bold shadow-md rounded-xl h-11 transition-all active:scale-95">
                        <Link href={config.route}>
                            Masuk Modul <ArrowRight className="ml-2 size-4" />
                        </Link>
                    </Button>
                ) : (
                    isManagement && (
                        <Button 
                            onClick={() => onActivateRequest(config)}
                            variant="outline" 
                            className="w-full font-bold border-primary text-primary hover:bg-primary/5 rounded-xl h-11 border-2"
                        >
                             <Zap className="mr-2 size-4" /> Mulai Berlangganan
                        </Button>
                    )
                )}
            </CardFooter>
        </Card>
    );
}

export default function PortalPage() {
    const { currentUser, userRole, logout } = useAuth();
    const { companies, subscriptionLogs, updateCompany, addSubscriptionLog, fetchData } = useMasterData();
    const { toast } = useToast();

    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
    const [selectedModule, setSelectedModule] = useState<any>(null);

    const company = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isManagement = userRole === 'manajemen';

    const activeModules = useMemo(() => {
        return MODULE_CATALOG.filter(m => company?.moduleSubscriptions?.[m.id]?.status === 'active');
    }, [company]);

    const inactiveModules = useMemo(() => {
        return MODULE_CATALOG.filter(m => company?.moduleSubscriptions?.[m.id]?.status !== 'active');
    }, [company]);

    const logs = useMemo(() => {
        if (!company) return [];
        return subscriptionLogs
            .filter(l => l.companyId === company.id)
            .sort((a, b) => {
                const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
                const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
    }, [subscriptionLogs, company]);

    const handleActivateModule = async (data: { type: 'trial' | 'paid', quota: number, duration: number, totalPrice: number }) => {
        if (!company || !selectedModule) return;

        try {
            const now = new Date();
            const expiry = addDays(now, data.duration);
            
            const newSubscription: ModuleSubscription = {
                status: 'active',
                type: data.type,
                quota: data.quota,
                expiryDate: expiry.toISOString(),
                activatedAt: now.toISOString()
            };

            const updatedModuleSubscriptions = {
                ...(company.moduleSubscriptions || {}),
                [selectedModule.id]: newSubscription
            };

            const updatedUsedTrials = [...(company.usedTrials || [])];
            if (data.type === 'trial') {
                updatedUsedTrials.push(selectedModule.id);
            }

            await updateCompany(company.id, {
                moduleSubscriptions: updatedModuleSubscriptions,
                usedTrials: updatedUsedTrials
            });

            // Log activity
            await addSubscriptionLog({
                companyId: company.id,
                companyName: company.name,
                company: company.name,
                moduleId: selectedModule.id,
                planName: `Modul ${selectedModule.name}`,
                action: data.type === 'trial' ? 'TRIAL' : 'UPGRADE',
                amount: data.totalPrice,
                startDate: now.toISOString(),
                endDate: expiry.toISOString(),
                performedBy: currentUser?.name || 'System',
                timestamp: serverTimestamp()
            });

            toast({ title: "Berhasil!", description: `Modul ${selectedModule.name} kini aktif.` });
            await fetchData(true);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Gagal", description: error.message });
        }
    };

    if (!currentUser) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
            {/* --- TOP SECTION: Welcome & Info --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-4 space-y-6">
                    <Card className="shadow-2xl border-none overflow-hidden bg-slate-900 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Building size={150} />
                        </div>
                        <CardHeader className="relative z-10 p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="size-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                                    <Building size={32} className="text-white" />
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <h2 className="text-xl font-black truncate">{company?.name || 'N/A'}</h2>
                                    <Badge variant="outline" className="text-white/60 border-white/20 text-[9px] font-black uppercase tracking-widest">
                                        {company?.businessField}
                                    </Badge>
                                </div>
                            </div>
                            <Separator className="bg-white/10 mb-6" />
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm">
                                    <User className="size-4 text-white/50" />
                                    <span className="font-bold opacity-90">{currentUser.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="size-4 text-white/50" />
                                    <span className="opacity-70 truncate">{currentUser.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="size-4 text-white/50" />
                                    <span className="opacity-70">{currentUser.phone || '-'}</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardFooter className="bg-black/20 p-4">
                            <Button variant="ghost" className="w-full text-white/60 hover:text-white hover:bg-white/10 font-bold text-xs" onClick={logout}>
                                Keluar Akun
                            </Button>
                        </CardFooter>
                    </Card>

                    <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 border-dashed space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <Info size={16} />
                            <h4 className="text-xs font-black uppercase tracking-widest">Pusat Bantuan</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Butuh bantuan konfigurasi modular? Hubungi Customer Success KIPIAI kami untuk panduan integrasi sistem di perusahaan Anda.
                        </p>
                        <Button variant="outline" className="w-full text-[10px] font-black uppercase h-9 border-primary/20 hover:bg-primary/5">
                            Hubungi Admin KIPIAI
                        </Button>
                    </div>
                </div>

                {/* --- MODULAR SECTION --- */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter">Halo, {currentUser.name.split(' ')[0]} 👋</h1>
                        <p className="text-muted-foreground text-lg">Pilih modul yang ingin Anda gunakan hari ini.</p>
                    </div>

                    {activeModules.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <ShieldCheck className="size-4" /> Modul Aktif
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {activeModules.map(m => (
                                    <ModuleCard 
                                        key={m.id} 
                                        config={m} 
                                        subscription={company?.moduleSubscriptions?.[m.id]} 
                                        isManagement={isManagement} 
                                        onActivateRequest={(mod) => { setSelectedModule(mod); setIsSubDialogOpen(true); }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {inactiveModules.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <LayoutGrid className="size-4" /> Modul Tersedia
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                                {inactiveModules.map(m => (
                                    <ModuleCard 
                                        key={m.id} 
                                        config={m} 
                                        isManagement={isManagement} 
                                        onActivateRequest={(mod) => { setSelectedModule(mod); setIsSubDialogOpen(true); }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- BILLING & LOGS SECTION (Only for Management) --- */}
            {isManagement && (
                <Card className="border-none shadow-xl rounded-3xl overflow-hidden mt-10">
                    <CardHeader className="bg-muted/30 p-8 border-b">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-primary mb-2">
                                    <History size={20} className="stroke-[3px]" />
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em]">Billing & Activation Logs</h4>
                                </div>
                                <CardTitle className="text-2xl font-bold font-headline">Riwayat Aktivitas Paket</CardTitle>
                                <CardDescription>Monitoring transparansi biaya dan pembaruan kuota modul.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/10">
                                <TableRow className="border-none">
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-5 pl-8">Tanggal</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Modul / Aksi</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Nilai Transaksi</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right pr-8">Petugas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.length > 0 ? logs.map(log => (
                                    <TableRow key={log.id} className="hover:bg-muted/5 transition-colors border-border/40">
                                        <TableCell className="py-5 pl-8 font-medium text-xs">
                                            {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'dd MMM yyyy, HH:mm') : 'Baru saja'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-black text-xs uppercase tracking-tight">{log.planName}</span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className={cn(
                                                        "text-[9px] font-bold px-1.5 h-4 border-none",
                                                        log.action === 'UPGRADE' ? "bg-green-100 text-green-700" : 
                                                        log.action === 'TRIAL' ? "bg-amber-100 text-amber-700" :
                                                        "bg-blue-100 text-blue-700"
                                                    )}>
                                                        {log.action}
                                                    </Badge>
                                                    {log.moduleId && <span className="text-[10px] text-muted-foreground italic font-medium">({log.moduleId})</span>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-black font-mono text-sm">
                                            {log.amount > 0 ? `Rp ${log.amount.toLocaleString('id-ID')}` : 'FREE'}
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex items-center justify-end gap-2 text-xs font-bold text-muted-foreground">
                                                <User size={12} className="opacity-40" />
                                                {log.performedBy}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                                            Belum ada catatan transaksi modul ditemukan.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <ModuleSubscriptionDialog 
                isOpen={isSubDialogOpen}
                onOpenChange={setIsSubDialogOpen}
                module={selectedModule}
                company={company || null}
                onConfirm={handleActivateModule}
            />
        </div>
    );
}