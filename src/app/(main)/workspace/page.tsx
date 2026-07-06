
// src/app/(main)/workspace/page.tsx
"use client";

import { useMemo, useState, useEffect, Suspense, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
    LayoutGrid, 
    ArrowRight, 
    Building, 
    User as LucideUser, 
    Mail, 
    ShieldCheck,
    GraduationCap,
    ClipboardCheck,
    Lock,
    Zap,
    Users,
    GitMerge,
    ChevronRight,
    Settings,
    Database,
    Loader2,
    Crown,
    Shield,
    Plus,
    Minus,
    Info,
    ShoppingCart,
    Briefcase,
    Network,
    Layers,
    FileText,
    Bot,
    X,
    UserPlus,
    History,
    CheckCircle2,
    Activity,
    Sparkles,
    TrendingUp,
    Timer,
    MoreHorizontal,
    ShieldAlert,
    CheckCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Card, 
    CardHeader, 
    CardTitle, 
    CardDescription, 
    CardContent, 
    CardFooter 
} from '@/components/ui/card';
import { format, addDays, isSameDay, subDays, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { ModuleId, ModuleSubscription, Company, SubscriptionLog, Employee } from '@/types';
import { ModuleSubscriptionDialog } from '@/components/portal/module-subscription-dialog';
import { GroupManagementDialog } from '@/components/holding/group-management-dialog';
import CompanyAdminManagementPage from '@/app/(main)/company-admin-management/page';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { serverTimestamp } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { ResponsivePage } from '@/components/ui/adaptive-layout';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- Static Meta for Modules ---
const MODULE_CATALOG = [
    {
        id: 'appraisal' as ModuleId,
        name: 'Appraisal',
        description: 'Manajemen Kinerja terintegrasi (KPI, KBO, & OKR) untuk pertumbuhan tim.',
        icon: ClipboardCheck,
        color: 'text-primary',
        route: '/appraisal-dashboard',
    },
    {
        id: 'lms' as ModuleId,
        name: 'Akademi LMS',
        description: 'Portal pembelajaran mandiri dan program pengembangan kompetensi.',
        icon: GraduationCap,
        color: 'text-primary',
        route: '/lms/user/my-learnings',
    },
    {
        id: 'collabspace' as ModuleId,
        name: 'CollabSpace',
        description: 'Pusat koordinasi tugas harian dan kolaborasi project tim.',
        icon: LayoutGrid,
        color: 'text-primary',
        route: '/collab-space',
    }
];

// --- Sub-components ---

function GlassCard({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "bg-white/85 backdrop-blur-xl border border-white/50 shadow-sm hover:shadow-[0_0_20px_2px_rgba(37,99,235,0.08)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl",
                onClick && "cursor-pointer",
                className
            )}
        >
            {children}
        </div>
    );
}

function SectionLabel({ icon: Icon, label, color = "text-slate-500" }: { icon: any, label: string, color?: string }) {
    return (
        <div className={cn("flex items-center gap-2 mb-3", color)}>
            <Icon size={14} className="opacity-80" strokeWidth={3} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
        </div>
    );
}

function WorkspaceModuleCard({ 
    config, 
    subscription, 
    isManagement,
    onActivateRequest,
    onAddQuotaRequest
}: { 
    config: typeof MODULE_CATALOG[0], 
    subscription?: ModuleSubscription, 
    isManagement: boolean,
    onActivateRequest: (m: any) => void,
    onAddQuotaRequest: (m: any) => void
}) {
    const isActive = subscription?.status === 'active';
    const isExpired = subscription?.status === 'expired';
    const isTrial = subscription?.type === 'trial';
    const Icon = config.icon;
    
    return (
        <GlassCard className="p-5 flex flex-col h-full">
            <div className="flex justify-between items-start mb-5">
                <div className="size-11 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                    <Icon size={22} strokeWidth={2} />
                </div>
                {isActive && (
                    <Badge className={cn(
                        "font-black text-[8px] uppercase border-none h-5 px-2",
                        isTrial ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                        {isTrial ? 'Trial' : 'Aktif'}
                    </Badge>
                )}
            </div>

            <div className="space-y-1 mb-5">
                <h3 className="text-base font-black text-slate-900 tracking-tight">{config.name}</h3>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed line-clamp-2 min-h-[32px]">
                    {config.description}
                </p>
            </div>

            {isManagement && isActive && (
                <div className="mt-auto grid grid-cols-2 border-t border-slate-100 pt-4 mb-5">
                    <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Kapasitas</p>
                        <p className="text-xs font-black text-slate-800">{subscription.quota === -1 ? 'Unlimited' : `${subscription.quota} Staff`}</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sisa Masa</p>
                        <p className={cn("text-xs font-black", isExpired ? "text-rose-600" : "text-slate-800")}>
                            {subscription.expiryDate ? format(new Date(subscription.expiryDate), 'd MMM yy') : 'N/A'}
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {isActive ? (
                    <>
                        <Button asChild className="w-full h-10 font-black text-[10px] uppercase tracking-widest bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20">
                            <Link href={config.route}>
                                MASUK MODUL <ArrowRight size={14} className="ml-1.5" strokeWidth={3} />
                            </Link>
                        </Button>
                        {isManagement && (
                            <Button 
                                onClick={() => isTrial ? onActivateRequest(config) : onAddQuotaRequest(config)}
                                variant="outline" 
                                className="w-full h-9 font-black text-[9px] uppercase tracking-widest rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600"
                            >
                                {isTrial ? <ShoppingCart size={12} className="mr-1.5" /> : <UserPlus size={12} className="mr-1.5" />}
                                {isTrial ? 'UPGRADE KE PRO' : 'TAMBAH KUOTA'}
                            </Button>
                        )}
                    </>
                ) : (
                    isManagement && (
                        <Button 
                            onClick={() => onActivateRequest(config)}
                            className="w-full h-11 font-black text-[10px] uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 rounded-xl"
                        >
                            <Zap size={14} className="mr-1.5 text-amber-400 fill-amber-400" /> AKTIFKAN SEKARANG
                        </Button>
                    )
                )}
            </div>
        </GlassCard>
    );
}

function HistoryItem({ log }: { log: SubscriptionLog }) {
    const isFree = log.amount === 0;
    const isLife = log.planName?.toLowerCase().includes('lifetime');

    return (
        <div className="p-3 rounded-xl hover:bg-white/60 transition-all group border border-transparent hover:border-slate-100">
            <div className="flex justify-between items-start mb-1">
                <p className="text-[11px] font-black text-slate-800 truncate pr-2 uppercase tracking-tight">{log.planName || 'Modul'}</p>
                <p className={cn(
                    "text-[10px] font-black shrink-0",
                    isFree ? "text-emerald-600" : "text-primary"
                )}>
                    {isFree ? 'FREE' : `Rp ${(log.amount / 1000).toFixed(0)}k`}
                </p>
            </div>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[8px] font-black h-3.5 px-1 bg-primary/10 text-primary border-none">{log.action}</Badge>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{format(log.timestamp?.toDate ? log.timestamp.toDate() : new Date(), "d MMM yyyy")}</span>
                </div>
                {isLife && <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">LIFE</span>}
            </div>
        </div>
    );
}

// --- Main Workspace Component ---

export function WorkspaceContent() {
    const { currentUser, userRole, logout, setIsLoading } = useAuth();
    const { companies, updateCompany, addSubscriptionLog, fetchData, companyAdmins, addonPricing, subscriptionLogs, employees, departments, positions } = useMasterData();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'activate' | 'add-quota'>('activate');
    const [selectedModule, setSelectedModule] = useState<any>(null);
    const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
    const [isMgmtDialogOpen, setIsMgmtDialogOpen] = useState(false);
    const [isMgmtConfigOpen, setIsMgmtConfigOpen] = useState(false);
    const [mgmtAddQuota, setMgmtAddQuota] = useState(1);

    const company = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isManagement = userRole === 'manajemen';

    // Role Label Mapping
    const accountTypeLabel = useMemo(() => {
        switch (userRole) {
            case 'superadmin': return 'SUPER ADMIN SYSTEM';
            case 'manajemen': return 'ADMIN PERUSAHAAN';
            default: return 'AKUN KARYAWAN';
        }
    }, [userRole]);

    // Step to get child companies for the dialog
    const childCompanies = useMemo(() => {
        if (!company || !company.isHolding) return [];
        return companies.filter(c => c.parentId === company.id);
    }, [company, companies]);

    // --- GENERIC READINESS CHECKLIST LOGIC ---
    const readinessChecklist = useMemo(() => {
        if (!company) return [];
        
        const hasFullAddress = company.address && company.address !== 'N/A' && company.address.length > 5;
        const hasDepartments = departments.filter(d => d.company === company.name).length > 0;
        const hasPositions = positions.filter(p => p.company === company.name).length > 0;
        const hasEmployees = employees.filter(e => e.company === company.name && e.role === 'user').length > 0;
        
        return [
            { id: 'profile', label: 'Profil Unit Bisnis', done: hasFullAddress, route: '/settings' },
            { id: 'dept', label: 'Definisi Departemen', done: hasDepartments, route: '/master-data/departments' },
            { id: 'pos', label: 'Definisi Jabatan', done: hasPositions, route: '/master-data/positions' },
            { id: 'staff', label: 'Sinkronisasi Anggota', done: hasEmployees, route: '/master-data/employees' },
        ];
    }, [company, departments, positions, employees]);

    const readinessPercent = useMemo(() => {
        if (readinessChecklist.length === 0) return 0;
        const doneCount = readinessChecklist.filter(c => c.done).length;
        return Math.round((doneCount / readinessChecklist.length) * 100);
    }, [readinessChecklist]);

    const myLogs = useMemo(() => {
        if (!company) return [];
        return subscriptionLogs
            .filter(log => log.companyId === company.id)
            .sort((a, b) => (b.timestamp?.toDate?.().getTime() || 0) - (a.timestamp?.toDate?.().getTime() || 0))
            .slice(0, 5);
    }, [subscriptionLogs, company]);

    useEffect(() => {
        const blockedModuleId = searchParams.get('blocked_module');
        if (blockedModuleId && isManagement) {
            const moduleConfig = MODULE_CATALOG.find(m => m.id === blockedModuleId);
            if (moduleConfig) {
                setSelectedModule(moduleConfig);
                setDialogMode('activate');
                setIsSubDialogOpen(true);
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
        }
    }, [searchParams, isManagement]);

    const mgmtAddonPricing = useMemo(() => addonPricing.find(p => p.id === 'mgmt_account'), [addonPricing]);
    const mgmtPricePerUser = mgmtAddonPricing?.pricePerUnit || 75000;

    const mgmtLimit = useMemo(() => company?.customManagementUserLimit || 1, [company]);
    const currentMgmtCount = useMemo(() => company ? companyAdmins.filter(a => a.company === company.name).length : 0, [companyAdmins, company]);

    const { activeModules, availableModules } = useMemo(() => {
        if (userRole === 'superadmin' || isManagement) {
            return {
                activeModules: MODULE_CATALOG.filter(m => company?.moduleSubscriptions?.[m.id]?.status === 'active'),
                availableModules: MODULE_CATALOG.filter(m => company?.moduleSubscriptions?.[m.id]?.status !== 'active')
            };
        } else {
            const userAccess = currentUser?.moduleAccess || {};
            const accessible = MODULE_CATALOG.filter(m => userAccess[m.id] === true && company?.moduleSubscriptions?.[m.id]?.status === 'active');
            return { activeModules: accessible, availableModules: [] };
        }
    }, [company, userRole, isManagement, currentUser?.moduleAccess]);

    const handleActivateModule = async (data: { type: 'trial' | 'paid', quota: number, mgmtQuota: number, duration: number, totalPrice: number }) => {
        if (!company || !selectedModule) return;
        try {
            const now = new Date();
            let expiryStr = dialogMode === 'add-quota' && company.moduleSubscriptions?.[selectedModule.id]
                ? company.moduleSubscriptions[selectedModule.id].expiryDate
                : addDays(now, data.duration).toISOString();

            const currentSub = company.moduleSubscriptions?.[selectedModule.id];
            const finalQuota = dialogMode === 'add-quota' ? (currentSub?.quota || 0) + data.quota : data.quota;
            
            const newSubscription: any = { status: 'active', type: data.type, quota: finalQuota, expiryDate: expiryStr, activatedAt: now.toISOString() };
            const updatedModuleSubscriptions = { ...(company.moduleSubscriptions || {}), [selectedModule.id]: newSubscription };
            const updatedUsedTrials = [...(company.usedTrials || [])];
            if (data.type === 'trial' && !updatedUsedTrials.includes(selectedModule.id)) updatedUsedTrials.push(selectedModule.id);

            const updatePayload: Partial<Company> = { moduleSubscriptions: updatedModuleSubscriptions, usedTrials: updatedUsedTrials };
            if (data.type === 'paid') updatePayload.customUserLimit = finalQuota;

            await updateCompany(company.id, updatePayload);
            await addSubscriptionLog({
                companyId: company.id, companyName: company.name, company: company.name, moduleId: selectedModule.id,
                planName: dialogMode === 'add-quota' ? `+${data.quota} User - ${selectedModule.name}` : `Modul ${selectedModule.name}`,
                action: data.type === 'trial' ? 'TRIAL' : 'UPGRADE',
                amount: data.totalPrice, startDate: now.toISOString(), endDate: expiryStr, performedBy: currentUser?.name || 'System', timestamp: serverTimestamp()
            });
            toast({ title: "Berhasil!", description: "Status modul telah diperbarui." });
            await fetchData(true);
        } catch (error: any) { toast({ variant: 'destructive', title: "Gagal", description: error.message }); }
    };

    const handleBuyMgmtAddon = async () => {
        if (!company || mgmtAddQuota <= 0) return;
        setIsLoading(true);
        try {
            const currentLimit = company.customManagementUserLimit || 1;
            const newLimit = currentLimit + mgmtAddQuota;
            const totalPrice = mgmtAddQuota * mgmtPricePerUser;
            await updateCompany(company.id, { customManagementUserLimit: newLimit });
            await addSubscriptionLog({
                companyId: company.id, companyName: company.name, company: company.name, planName: `Add-on: +${mgmtAddQuota} Admin (Lifetime)`,
                action: 'UPGRADE', amount: totalPrice, startDate: new Date().toISOString(), endDate: addDays(new Date(), 36500).toISOString(),
                performedBy: currentUser!.name, timestamp: serverTimestamp()
            });
            toast({ title: "Berhasil!", description: `Kuota manajemen Anda telah ditambah.` });
            setIsMgmtConfigOpen(false);
            await fetchData(true);
        } catch (error: any) { toast({ variant: 'destructive', title: "Gagal", description: error.message }); } finally { setIsLoading(false); }
    };

    return (
        <>
            <ResponsivePage className="bg-[#f8f9ff] min-h-screen">
                {/* Header / Hero Section */}
                <section className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-slate-900 mb-2">Halo, {currentUser.name.split(' ')[0]}!</h1>
                            <p className="text-slate-500 font-medium text-sm sm:text-base max-w-lg">
                                Selamat datang kembali. Pintu masuk ke ekosistem produktivitas tim Anda yang terintegrasi.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 bg-primary/5 px-4 py-2 rounded-full border border-primary/10 self-start md:self-auto">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{accountTypeLabel}</span>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Operations (8 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Company Identity Card */}
                        <div className="bg-[#131b2e] text-white p-6 sm:p-8 rounded-2xl relative overflow-hidden shadow-2xl">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="size-16 rounded-xl bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                                        <Building size={32} strokeWidth={1.5} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate max-w-[200px] sm:max-w-md uppercase">{company?.name || 'N/A'}</h2>
                                        <p className="text-[10px] opacity-40 font-black tracking-[0.3em] uppercase">{company?.businessField}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2.5">
                                    <div className="flex items-center gap-2.5 opacity-60">
                                        <LucideUser size={14} strokeWidth={3} />
                                        <span className="text-xs font-bold">{currentUser.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 opacity-60">
                                        <Mail size={14} strokeWidth={3} />
                                        <span className="text-xs font-medium">{currentUser.email}</span>
                                    </div>
                                </div>
                                <Button onClick={logout} variant="ghost" className="px-6 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl border border-white/10">
                                    KELUAR AKUN
                                </Button>
                            </div>
                            <div className="absolute -right-10 -bottom-10 size-40 bg-primary/20 rounded-full blur-3xl opacity-50"></div>
                        </div>

                        {/* Data Foundation Section */}
                        {isManagement && (
                            <div className="space-y-4">
                                <SectionLabel icon={Database} label="PONDASI DATA" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Link href="/master-data/employees">
                                        <GlassCard className="p-5 flex items-center gap-5 group">
                                            <div className="size-12 rounded-xl bg-[#131b2e] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                <Settings size={22} strokeWidth={2} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Konfigurasi Master</h4>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">KARYAWAN, STRUKTUR, & DEPARTEMEN</p>
                                            </div>
                                        </GlassCard>
                                    </Link>
                                    <div className="cursor-pointer" onClick={() => setIsGroupDialogOpen(true)}>
                                        <GlassCard className="p-5 flex items-center gap-5 group">
                                            <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-lg shadow-primary/20">
                                                <GitMerge size={22} strokeWidth={2} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Manajemen Grup</h4>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">KELOLA HOLDING & ANAK PERUSAHAAN</p>
                                            </div>
                                        </GlassCard>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Active Modules Section */}
                        <div className="space-y-4">
                            <SectionLabel icon={ShieldCheck} label="MODUL AKTIF" color="text-primary" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {activeModules.map(m => (
                                    <WorkspaceModuleCard 
                                        key={m.id} config={m} 
                                        subscription={company?.moduleSubscriptions?.[m.id]} 
                                        isManagement={isManagement} 
                                        onActivateRequest={(mod) => { setDialogMode('activate'); setSelectedModule(mod); setIsSubDialogOpen(true); }}
                                        onAddQuotaRequest={(mod) => { setDialogMode('add-quota'); setSelectedModule(mod); setIsSubDialogOpen(true); }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Management Add-on Section */}
                        {isManagement && (
                            <div className="space-y-4">
                                <SectionLabel icon={Layers} label="LAYANAN TAMBAHAN" />
                                <GlassCard className="p-6 flex flex-col md:flex-row items-center gap-6 border-l-[6px] border-l-primary shadow-lg">
                                    <div className="size-16 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-primary border border-primary/10">
                                        <Shield size={28} strokeWidth={2} />
                                    </div>
                                    <div className="flex-1 text-center md:text-left space-y-1">
                                        <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">Tim Manajemen</h4>
                                        <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-md">Tambahkan kapasitas personil Admin untuk membantu pengelolaan dashboard.</p>
                                        <div className="pt-2">
                                            <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-bold text-[9px] px-3 h-5 rounded-full">{mgmtLimit} Akun (Aktif: {currentMgmtCount})</Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                                        <Button onClick={() => setIsMgmtDialogOpen(true)} className="flex-1 md:flex-none h-11 px-8 bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20">
                                            KELOLA TIM
                                        </Button>
                                        <Button onClick={() => setIsMgmtConfigOpen(true)} variant="outline" size="icon" className="size-11 rounded-xl border-2 border-slate-100 hover:bg-slate-50 transition-colors shrink-0">
                                            <UserPlus size={20} className="text-slate-400" strokeWidth={2} />
                                        </Button>
                                    </div>
                                </GlassCard>
                            </div>
                        )}

                        {/* Available Modules Section */}
                        {isManagement && availableModules.length > 0 && (
                            <div className="space-y-4">
                                <SectionLabel icon={Sparkles} label="MODUL TERSEDIA" />
                                {availableModules.map(m => {
                                    const Icon = m.icon;
                                    return (
                                        <GlassCard key={m.id} className="p-6 flex flex-col md:flex-row items-center gap-6 border border-dashed border-primary/30 bg-primary/[0.02]">
                                            <div className="size-16 rounded-xl bg-white flex items-center justify-center shrink-0 border shadow-sm">
                                                <Icon size={28} className="text-slate-400" strokeWidth={1.5} />
                                            </div>
                                            <div className="flex-1 text-center md:text-left">
                                                <h4 className="text-base font-black text-slate-900 uppercase tracking-tight mb-1">{m.name}</h4>
                                                <p className="text-xs font-medium text-slate-500">{m.description}</p>
                                            </div>
                                            <Button 
                                                onClick={() => { setSelectedModule(m); setDialogMode('activate'); setIsSubDialogOpen(true); }}
                                                variant="outline" 
                                                className="w-full md:w-auto h-11 px-6 border-2 border-primary text-primary hover:bg-primary hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
                                            >
                                                <Zap size={14} className="fill-current" /> AKTIFKAN SEKARANG
                                            </Button>
                                        </GlassCard>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Sidebar (4 cols) */}
                    <div className="lg:col-span-4 space-y-6 flex flex-col h-full">
                        {/* Account Summary Stats - Readiness Checklist */}
                        <div className="bg-[#131b2e] text-white p-7 rounded-2xl relative overflow-hidden shadow-2xl">
                            <div className="relative z-10 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">KESIAPAN PLATFORM</h3>
                                    <Badge variant="outline" className="bg-white/5 border-white/10 text-white font-black text-[9px] h-5">{readinessPercent}%</Badge>
                                </div>

                                <div className="space-y-6">
                                    {/* Overall Readiness Bar */}
                                    <div className="space-y-2">
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary transition-all duration-1000 ease-out" 
                                                style={{ width: `${readinessPercent}%` }}
                                            />
                                        </div>
                                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em] text-center">Status integrasi unit bisnis</p>
                                    </div>

                                    {/* Checklist Items */}
                                    <div className="space-y-2.5">
                                        {readinessChecklist.map((item) => (
                                            <Link key={item.id} href={item.route}>
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all active:scale-95 group/item",
                                                    item.done 
                                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                                        : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/20"
                                                )}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "size-6 rounded-full flex items-center justify-center border",
                                                            item.done ? "bg-emerald-500 text-white border-emerald-500" : "bg-transparent border-current opacity-30"
                                                        )}>
                                                            {item.done ? <CheckCircle size={14} strokeWidth={3} /> : <div className="size-1 rounded-full bg-white" />}
                                                        </div>
                                                        <span className="text-[11px] font-bold uppercase tracking-tight">{item.label}</span>
                                                    </div>
                                                    {!item.done && <ArrowRight size={14} className="opacity-0 group-hover/item:opacity-100 transition-opacity" />}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>

                                    {/* Account Verification Info */}
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                <ShieldCheck size={16} strokeWidth={2.5} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-tight">Status Verifikasi</p>
                                                <p className="text-[9px] text-white/40 font-medium">Identitas & Bisnis Terverifikasi</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                <Lock size={16} strokeWidth={2.5} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-tight">Enkripsi Data</p>
                                                <p className="text-[9px] text-white/40 font-medium">AES-256 Industri Standar</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -right-24 -top-24 size-48 bg-primary/10 rounded-full blur-[80px]"></div>
                        </div>

                        {/* Proactive Help Area */}
                        <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-4 group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Bot size={80} /></div>
                            <div className="space-y-1 relative z-10">
                                <h4 className="text-xs font-black text-amber-900 uppercase tracking-tight">Butuh bantuan KIPI?</h4>
                                <p className="text-[10px] text-amber-700 font-medium leading-relaxed">Gunakan asisten AI di pojok kanan bawah untuk panduan integrasi sistem.</p>
                            </div>
                            <Button variant="ghost" className="p-0 h-auto text-[9px] font-black text-amber-600 hover:text-amber-800 hover:bg-transparent tracking-[0.2em] uppercase relative z-10">
                                HUBUNGI SUPPORT <ChevronRight size={10} strokeWidth={4} />
                            </Button>
                        </div>

                        {/* Purchase History: Always at the bottom of the right column */}
                        <div className="mt-auto pt-4 flex-grow flex flex-col justify-end">
                            <SectionLabel icon={History} label="HISTORI PEMBELIAN & AKTIVITAS" />
                            <GlassCard className="p-2">
                                <div className="space-y-1">
                                    {myLogs.length > 0 ? (
                                        myLogs.map(log => <HistoryItem key={log.id} log={log} />)
                                    ) : (
                                        <div className="py-12 text-center opacity-30 flex flex-col items-center gap-2">
                                            <Activity size={24} />
                                            <p className="text-[10px] font-black uppercase">Belum ada aktivitas tercatat</p>
                                        </div>
                                    )}
                                </div>
                                <Link 
                                    href="/subscription-status" 
                                    className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase text-primary hover:gap-3 transition-all tracking-widest py-3 border-t border-slate-50"
                                >
                                    LIHAT STATUS LENGKAP
                                    <ArrowRight size={14} strokeWidth={3} />
                                </Link>
                            </GlassCard>
                        </div>
                    </div>
                </div>

                {/* --- Modals & Dialogs --- */}
                <ModuleSubscriptionDialog 
                    isOpen={isSubDialogOpen} 
                    onOpenChange={setIsSubDialogOpen} 
                    module={selectedModule} 
                    company={company || null} 
                    mode={dialogMode} 
                    onConfirm={handleActivateModule} 
                />
                
                {company && (
                    <GroupManagementDialog 
                        isOpen={isGroupDialogOpen} 
                        onOpenChange={setIsGroupDialogOpen} 
                        holdingCompany={company} 
                        childCompanies={childCompanies} 
                    />
                )}
                
                <Dialog open={isMgmtDialogOpen} onOpenChange={setIsMgmtDialogOpen}>
                    <DialogContent className="max-w-5xl h-[90vh] md:h-[85vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl bg-white z-[200]">
                        <DialogHeader className="p-4 pb-2 shrink-0 bg-muted/20 border-b flex flex-col space-y-0.5">
                            <DialogTitle className="font-black text-lg tracking-tighter uppercase text-slate-900">Manajemen Tim Admin</DialogTitle>
                            <DialogDescription className="text-[9px] font-bold text-primary uppercase tracking-widest">Kapasitas Maksimal: {mgmtLimit} Akun Admin</DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto no-scrollbar min-w-0 bg-[#fafafa] p-4">
                            <CompanyAdminManagementPage onQuotaFull={() => setIsMgmtConfigOpen(true)} />
                        </div>
                    </DialogContent>
                </Dialog>
                
                <Dialog open={isMgmtConfigOpen} onOpenChange={setIsMgmtConfigOpen}>
                    <DialogContent className="sm:max-w-md border-none shadow-2xl overflow-hidden z-[300] flex flex-col h-full max-h-[85vh] p-0">
                        <DialogHeader className="p-4 pb-2 bg-muted/20 border-b shrink-0 flex flex-col space-y-0.5 text-left">
                            <DialogTitle className="font-black text-slate-900 text-lg tracking-tighter uppercase flex items-center gap-3">
                                <Shield size={20} className="text-primary" strokeWidth={2.5} /> Tambah Kuota Admin
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em]">Investasi Add-on Lifetime</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="flex-1 min-h-0 bg-background">
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="space-y-0.5 min-w-0">
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Jumlah Akun</h4>
                                        <p className="text-[9px] text-slate-400 font-medium uppercase">Admin tambahan untuk dashboard</p>
                                    </div>
                                    <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200 overflow-hidden h-11 shadow-sm shrink-0">
                                        <button type="button" onClick={() => setMgmtAddQuota(Math.max(1, mgmtAddQuota - 1))} className="px-3 hover:bg-white text-slate-900 transition-colors"><Minus size={14} strokeWidth={3} /></button>
                                        <input type="number" value={mgmtAddQuota} onChange={(e) => setMgmtAddQuota(Math.max(1, parseInt(e.target.value) || 1))} className="w-10 text-center border-none focus-visible:ring-0 text-xs font-black bg-transparent" />
                                        <button type="button" onClick={() => setMgmtAddQuota(mgmtAddQuota + 1)} className="px-3 hover:bg-white text-slate-900 transition-colors"><Plus size={14} strokeWidth={3} /></button>
                                    </div>
                                </div>
                                <div className="p-5 rounded-xl bg-[#090e1a] text-white shadow-xl space-y-1.5">
                                    <div className="flex justify-between items-center opacity-40"><span className="text-[9px] font-black uppercase tracking-[0.2em]">Total Investasi</span><ShoppingCart size={12} /></div>
                                    <p className="text-2xl font-black tracking-tighter">Rp {(mgmtAddQuota * mgmtPricePerUser).toLocaleString('id-ID')}</p>
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <DialogClose asChild><Button variant="outline" className="flex-1 font-black text-[9px] uppercase h-11">Batal</Button></DialogClose>
                                    <Button className="flex-1 font-black uppercase tracking-widest text-[9px] h-11 shadow-lg" onClick={handleBuyMgmtAddon}>Beli Sekarang</Button>
                                </div>
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </ResponsivePage>
        </>
    );
}

export default function WorkspacePage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="animate-spin text-primary size-10" /></div>}>
            <WorkspaceContent />
        </Suspense>
    );
}
