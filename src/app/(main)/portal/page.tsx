
// src/app/(main)/portal/page.tsx
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
    ShoppingCart,
    Users,
    Network,
    Briefcase,
    GitMerge,
    ChevronRight,
    Settings,
    Database
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
    const isTrial = subscription?.type === 'trial';
    
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
                        {isTrial ? 'Trial' : 'Aktif'}
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
                            <Badge variant={isTrial ? "secondary" : "default"} className={cn("h-5 px-1.5 font-bold uppercase text-[9px]", !isTrial && "bg-blue-600")}>
                                {subscription.type}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground uppercase tracking-tight">Kuota User</span>
                            <span className="font-bold">{subscription.quota === -1 ? 'Unlimited' : subscription.quota} User</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground uppercase tracking-tight">Masa Berlaku</span>
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

            <CardFooter className="pt-4 border-t bg-muted/5 mt-auto p-4">
                <div className="flex items-center gap-2 w-full">
                    {isActive ? (
                        <>
                            <Button asChild className="flex-1 font-bold shadow-md rounded-xl h-11 transition-all active:scale-95">
                                <Link href={config.route}>
                                    Masuk Modul <ArrowRight className="ml-2 size-4" />
                                </Link>
                            </Button>
                            {isTrial && isManagement && (
                                <Button 
                                    variant="outline" 
                                    size="icon"
                                    className="size-11 rounded-xl border-2 border-primary text-primary hover:bg-primary/5 shrink-0"
                                    onClick={() => onActivateRequest(config)}
                                    title="Upgrade ke Paket Berbayar"
                                >
                                    <ShoppingCart size={18} />
                                </Button>
                            )}
                        </>
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
                </div>
            </CardFooter>
        </Card>
    );
}

function AdminDataCard({ label, description, icon: Icon, href, color }: { label: string, description: string, icon: any, href: string, color: string }) {
    return (
        <Link href={href} className="block group">
            <Card className="h-full border-none shadow-sm hover:shadow-md transition-all bg-background">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn("p-3 rounded-2xl shrink-0 transition-transform group-hover:scale-110", color)}>
                        <Icon size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate">{label}</h4>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{description}</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </CardContent>
            </Card>
        </Link>
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
            if (data.type === 'trial' && !updatedUsedTrials.includes(selectedModule.id)) {
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

            toast({ title: "Berhasil!", description: data.type === 'trial' ? `Masa trial Modul ${selectedModule.name} kini aktif.` : `Paket Modul ${selectedModule.name} berhasil dibeli.` });
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

                    {/* --- ADMIN TOOLS (ONLY FOR MANAGEMENT) --- */}
                    {isManagement && (
                        <div className="space-y-4">
                             <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
                                <Database size={12} /> Pondasi Data & Organisasi
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                <AdminDataCard 
                                    label="Data Karyawan" 
                                    description="Kelola akun dan profil personil" 
                                    icon={Users} 
                                    href="/master-data/employees"
                                    color="bg-indigo-500"
                                />
                                <AdminDataCard 
                                    label="Departemen & Jabatan" 
                                    description="Atur struktur dan unit kerja" 
                                    icon={Network} 
                                    href="/master-data/departments"
                                    color="bg-sky-500"
                                />
                                <AdminDataCard 
                                    label="Struktur Organisasi" 
                                    description="Visualisasi hierarki jabatan" 
                                    icon={GitMerge} 
                                    href="/master-data/hierarchy"
                                    color="bg-teal-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* --- HOLDING TOOLS --- */}
                    {isManagement && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
                                <Building size={12} /> Manajemen Grup
                            </h3>
                            {company?.isHolding ? (
                                <AdminDataCard 
                                    label="Anak Perusahaan" 
                                    description="Kelola cabang dan sister company" 
                                    icon={Building} 
                                    href="/holding-group-management"
                                    color="bg-rose-500"
                                />
                            ) : (
                                <Card className="border-dashed bg-primary/5">
                                    <CardContent className="p-6 text-center space-y-4">
                                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                                            <GitMerge size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold">Aktifkan Mode Holding</p>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                Punya lebih dari 1 cabang? Kelola semuanya dalam satu pintu PERFOM.
                                            </p>
                                        </div>
                                        <Button asChild variant="outline" size="sm" className="w-full text-[10px] font-black uppercase border-primary/20 h-9">
                                            <Link href="/holding-management">Upgrade Ke Holding</Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>

                {/* --- MODULAR SECTION --- */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900">Halo, {currentUser.name.split(' ')[0]} 👋</h1>
                        <p className="text-slate-500 text-lg">Pilih modul operasional yang ingin Anda gunakan.</p>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    
                    {/* --- SYSTEM LOGS (Only for Management) --- */}
                    {isManagement && (
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <History className="size-4" /> Riwayat Aktivitas & Billing
                                </h3>
                                <Link href="/subscription-status" className="text-[10px] font-black uppercase text-primary hover:underline">
                                    Lihat Semua Detail
                                </Link>
                            </div>
                            <Card className="border-none shadow-sm overflow-hidden rounded-2xl">
                                <Table>
                                    <TableBody>
                                        {logs.slice(0, 5).map(log => (
                                            <TableRow key={log.id} className="hover:bg-muted/5 border-border/40">
                                                <TableCell className="py-4 pl-6">
                                                    <p className="text-xs font-bold uppercase">{log.planName}</p>
                                                    <p className="text-[10px] text-muted-foreground">{log.timestamp?.toDate ? format(log.timestamp.toDate(), 'd MMM yyyy') : 'Baru saja'}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn(
                                                        "text-[8px] font-bold px-1.5 h-4 border-none",
                                                        log.action === 'UPGRADE' ? "bg-green-100 text-green-700" : 
                                                        log.action === 'TRIAL' ? "bg-amber-100 text-amber-700" :
                                                        "bg-blue-100 text-blue-700"
                                                    )}>
                                                        {log.action}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6 font-bold text-xs">
                                                    {log.amount > 0 ? `Rp ${log.amount.toLocaleString('id-ID')}` : 'FREE'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {logs.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center text-[10px] text-muted-foreground uppercase font-bold opacity-30 italic">
                                                    Belum ada catatan aktivitas.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

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
