
// src/app/(main)/workspace/page.tsx
"use client";

import { useMemo, useState, useEffect, Suspense } from 'react';
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
    CheckCircle2
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
import { format, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { ModuleId, ModuleSubscription, Company } from '@/types';
import { ModuleSubscriptionDialog } from '@/components/portal/module-subscription-dialog';
import { GroupManagementDialog } from '@/components/holding/group-management-dialog';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { serverTimestamp } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import CompanyAdminManagementPage from '@/app/(main)/company-admin-management/page';
import { ResponsivePage } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AdaptiveCardGrid, AdaptiveInsightCard } from '@/components/ui/adaptive-card';
import { IconTokens } from '@/lib/icon-tokens';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- Static Meta for Modules ---
const MODULE_CATALOG = [
    {
        id: 'appraisal' as ModuleId,
        name: 'Appraisal',
        description: 'Manajemen Kinerja terintegrasi (KPI, KBO, & OKR) untuk pertumbuhan tim.',
        icon: ClipboardCheck,
        color: 'text-primary',
        route: '/action-center',
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

function ModuleCard({ 
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
    
    return (
        <div className={cn(
            "flex flex-col h-full rounded-2xl border-2 transition-all group overflow-hidden bg-background",
            isActive ? "border-primary/10 shadow-sm" : "border-slate-100 hover:border-slate-200"
        )}>
            <div className="p-6 sm:p-8 flex-1">
                <div className={cn(
                    "size-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-105",
                    isActive ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                )}>
                    <config.icon size={24} strokeWidth={IconTokens.strokeWidth} />
                </div>
                
                <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xl font-black tracking-tighter text-slate-900">{config.name}</h3>
                        {isActive && (
                            <Badge className={cn(
                                "font-black text-[9px] uppercase border-none h-5 px-2",
                                isTrial ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                            )}>
                                {isTrial ? 'Trial' : 'Aktif'}
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed line-clamp-2">
                        {config.description}
                    </p>
                </div>

                {isManagement && isActive && (
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Kapasitas</p>
                            <p className="text-11px font-bold text-slate-700 truncate">{subscription.quota === -1 ? 'Unlimited' : `${subscription.quota} Staff`}</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sisa Masa</p>
                            <p className={cn("text-[11px] font-bold truncate", isExpired ? "text-rose-600" : "text-primary")}>
                                {subscription.expiryDate ? format(new Date(subscription.expiryDate), 'd MMM yy') : 'N/A'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="px-6 pb-6 mt-auto">
                {isActive ? (
                    <div className="flex flex-col gap-2">
                        <Button asChild className="w-full h-11 font-black text-[10px] uppercase tracking-widest shadow-lg rounded-xl">
                            <Link href={config.route}>
                                Masuk Modul <ArrowRight size={14} className="ml-1.5" strokeWidth={3} />
                            </Link>
                        </Button>
                        {isManagement && (
                            isTrial ? (
                                <Button 
                                    onClick={() => onActivateRequest(config)}
                                    variant="outline" 
                                    className="w-full h-9 font-black text-[9px] uppercase tracking-widest rounded-lg border-2 border-slate-100 hover:bg-slate-50 text-primary"
                                >
                                    <ShoppingCart size={12} className="mr-1.5" strokeWidth={3} /> Upgrade ke Pro
                                </Button>
                            ) : (
                                <Button 
                                    onClick={() => onAddQuotaRequest(config)}
                                    variant="outline" 
                                    className="w-full h-9 font-black text-[9px] uppercase tracking-widest rounded-lg border-2 border-slate-100 hover:bg-slate-50 text-primary"
                                >
                                    <UserPlus size={12} className="mr-1.5" strokeWidth={3} /> Tambah Kuota
                                </Button>
                            )
                        )}
                    </div>
                ) : (
                    isManagement && (
                        <Button 
                            onClick={() => onActivateRequest(config)}
                            variant="outline" 
                            className="w-full h-11 font-black text-[10px] uppercase tracking-widest rounded-xl border-2 border-slate-200 hover:bg-slate-50"
                        >
                             <Zap size={14} className="mr-1.5 text-primary" strokeWidth={3} /> Aktifkan Sekarang
                        </Button>
                    )
                )}
            </div>
        </div>
    );
}

function AdminLinkCard({ label, description, icon: Icon, href, color, onClick }: { label: string, description: string, icon: any, href?: string, color: string, onClick?: () => void }) {
    const content = (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-300 hover:shadow-stripe transition-all duration-300 active:scale-95 group">
            <div className={cn("p-3 rounded-xl shrink-0 transition-transform group-hover:scale-110", color)}>
                <Icon size={20} className="text-white" strokeWidth={IconTokens.strokeWidth} />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate tracking-tight">{label}</h4>
                <p className="text-[10px] font-medium text-slate-400 truncate uppercase tracking-tighter">{description}</p>
            </div>
            <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={14} className="text-slate-400" strokeWidth={3} />
            </div>
        </div>
    );

    if (onClick) {
        return <button onClick={onClick} className="block w-full text-left">{content}</button>;
    }

    return (
        <Link href={href || '#'} className="block w-full">
            {content}
        </Link>
    );
}

function WorkspaceContent() {
    const { currentUser, userRole, logout, setIsLoading } = useAuth();
    const { companies, updateCompany, addSubscriptionLog, fetchData, companyAdmins, addonPricing, subscriptionLogs } = useMasterData();
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
    const [isUpgrading, setIsUpgrading] = useState(false);

    const company = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isManagement = userRole === 'manajemen';

    const myLogs = useMemo(() => {
        if (!company) return [];
        return subscriptionLogs
            .filter(log => log.companyId === company.id)
            .sort((a, b) => {
                const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : (a.timestamp ? new Date(a.timestamp) : new Date(0));
                const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : (b.timestamp ? new Date(b.timestamp) : new Date(0));
                return dateB.getTime() - dateA.getTime();
            })
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

    const childCompanies = useMemo(() => {
        if (!company) return [];
        return companies.filter(c => c.parentId === company.id);
    }, [company, companies]);

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
            const accessible = MODULE_CATALOG.filter(m => 
                userAccess[m.id] === true && 
                company?.moduleSubscriptions?.[m.id]?.status === 'active'
            );
            return {
                activeModules: accessible,
                availableModules: [] 
            };
        }
    }, [company, userRole, isManagement, currentUser?.moduleAccess]);

    const handleUpgradeToHolding = async () => {
        if (!company) return;
        setIsUpgrading(true);
        try {
            await updateCompany(company.id, { isHolding: true });
            toast({ title: "Upgrade Berhasil!", description: "Mode Holding Company kini aktif." });
            await fetchData(true);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Gagal Upgrade", description: error.message });
        } finally {
            setIsUpgrading(false);
        }
    };

    const handleActivateModule = async (data: { type: 'trial' | 'paid', quota: number, mgmtQuota: number, duration: number, totalPrice: number }) => {
        if (!company || !selectedModule) return;

        try {
            const now = new Date();
            let expiryStr: string;
            
            if (dialogMode === 'add-quota' && company.moduleSubscriptions?.[selectedModule.id]) {
                expiryStr = company.moduleSubscriptions[selectedModule.id].expiryDate;
            } else {
                expiryStr = addDays(now, data.duration).toISOString();
            }

            const currentSub = company.moduleSubscriptions?.[selectedModule.id];
            const finalQuota = dialogMode === 'add-quota' ? (currentSub?.quota || 0) + data.quota : data.quota;
            
            const newSubscription: any = {
                status: 'active',
                type: data.type,
                quota: finalQuota,
                expiryDate: expiryStr,
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

            const updatePayload: Partial<Company> = {
                moduleSubscriptions: updatedModuleSubscriptions,
                usedTrials: updatedUsedTrials
            };

            if (data.type === 'paid') {
                updatePayload.customUserLimit = finalQuota;
            }

            await updateCompany(company.id, updatePayload);

            await addSubscriptionLog({
                companyId: company.id,
                companyName: company.name,
                company: company.name,
                moduleId: selectedModule.id,
                planName: dialogMode === 'add-quota' ? `Tambah ${data.quota} User - ${selectedModule.name}` : `Modul ${selectedModule.name}`,
                action: data.type === 'trial' ? 'TRIAL' : 'UPGRADE',
                amount: data.totalPrice,
                startDate: now.toISOString(),
                endDate: expiryStr,
                performedBy: currentUser?.name || 'System',
                timestamp: serverTimestamp()
            });

            toast({ title: "Berhasil!", description: dialogMode === 'add-quota' ? "Kuota berhasil ditambahkan." : (data.type === 'trial' ? `Masa trial Modul ${selectedModule.name} aktif.` : `Modul ${selectedModule.name} berhasil dibeli.`) });
            await fetchData(true);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Gagal", description: error.message });
        }
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
                companyId: company.id,
                companyName: company.name,
                company: company.name,
                planName: `Add-on: +${mgmtAddQuota} Admin (Lifetime)`,
                action: 'UPGRADE',
                amount: totalPrice,
                startDate: new Date().toISOString(),
                endDate: addDays(new Date(), 36500).toISOString(), 
                performedBy: currentUser!.name,
                timestamp: serverTimestamp()
            });

            toast({ title: "Berhasil!", description: `Kuota manajemen Anda telah ditambah menjadi ${newLimit}.` });
            setIsMgmtConfigOpen(false);
            await fetchData(true);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Gagal", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ResponsivePage className="bg-[#fafafa]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Profile & Foundation Pillar (Left) */}
                <div className="lg:col-span-4 space-y-8">
                    <Card className="shadow-stripe border-none overflow-hidden bg-[#090e1a] text-white relative rounded-3xl">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Building size={200} /></div>
                        <div className="relative z-10 p-8 sm:p-10">
                            <div className="flex items-center gap-5 mb-8">
                                <div className="size-16 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center shrink-0">
                                    <Building className="size-8 text-white" strokeWidth={1.5} />
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <h2 className="text-xl font-black tracking-tight truncate">{company?.name || 'N/A'}</h2>
                                    <p className="text-[9px] font-black uppercase text-white/40 tracking-[0.2em]">{company?.businessField}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-5">
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0"><LucideUser size={14} className="text-white/40" /></div>
                                    <div className="min-w-0"><p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Login Sebagai</p><p className="text-sm font-bold truncate">{currentUser.name}</p></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0"><Mail size={14} className="text-white/40" /></div>
                                    <div className="min-w-0"><p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Email Terdaftar</p><p className="text-sm font-medium opacity-70 truncate">{currentUser.email}</p></div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/5 p-4"><Button variant="ghost" className="w-full text-white/40 hover:text-white hover:bg-white/5 font-black text-[10px] uppercase tracking-widest h-10" onClick={logout}>Keluar Akun</Button></div>
                    </Card>

                    {isManagement && (
                        <div className="space-y-4">
                             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 ml-1"><Database size={12} className="text-primary" /> Pondasi Data</h3>
                             <div className="grid grid-cols-1 gap-3">
                                <AdminLinkCard label="Konfigurasi Master" description="Karyawan, Struktur, & Departemen" icon={Settings} href="/master-data/employees" color="bg-slate-800" />
                                {company?.isHolding ? (
                                    <AdminLinkCard label="Manajemen Grup" description="Kelola Holding & Anak Perusahaan" icon={GitMerge} onClick={() => setIsGroupDialogOpen(true)} color="bg-primary" />
                                ) : (
                                    company?.canBecomeHolding && (
                                        <div className="p-6 rounded-2xl bg-white border-2 border-dashed border-slate-200 text-center space-y-4">
                                            <div className="size-12 rounded-xl bg-primary/5 flex items-center justify-center mx-auto text-primary"><GitMerge size={24} strokeWidth={1.5} /></div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-black uppercase tracking-tight">Upgrade ke Holding</p>
                                                <p className="text-[10px] font-medium text-slate-500 leading-relaxed">Kelola jaring-jaring anak perusahaan dalam satu pintu.</p>
                                            </div>
                                            <Button onClick={handleUpgradeToHolding} disabled={isUpgrading} variant="outline" className="w-full text-[10px] font-black uppercase h-9 border-2 border-primary text-primary hover:bg-primary/5">
                                                {isUpgrading ? <Loader2 className="size-3 animate-spin mr-2" /> : null}Upgrade Sekarang
                                            </Button>
                                        </div>
                                    )
                                )}
                             </div>
                        </div>
                    )}
                </div>

                {/* Modules Section (Right) */}
                <div className="lg:col-span-8 space-y-10">
                    <div className="space-y-2">
                        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-slate-900">Halo, {currentUser.name.split(' ')[0]}!</h1>
                        <p className="text-slate-500 text-base sm:text-xl font-medium tracking-tight">Pintu masuk ke ekosistem produktivitas tim Anda.</p>
                    </div>

                    {activeModules.length > 0 && (
                        <div className="space-y-5">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2 ml-1">
                                <ShieldCheck size={14} className="stroke-[2.5px]" /> Modul Aktif
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                {activeModules.map(m => (
                                    <ModuleCard 
                                        key={m.id} 
                                        config={m} 
                                        subscription={company?.moduleSubscriptions?.[m.id]} 
                                        isManagement={isManagement} 
                                        onActivateRequest={(mod) => { setDialogMode('activate'); setSelectedModule(mod); setIsSubDialogOpen(true); }}
                                        onAddQuotaRequest={(mod) => { setDialogMode('add-quota'); setSelectedModule(mod); setIsSubDialogOpen(true); }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {isManagement && (
                        <div className="space-y-5">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 ml-1">
                                <Plus size={14} strokeWidth={3} /> Layanan Tambahan
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 sm:p-8 flex flex-col group hover:border-slate-300 transition-all shadow-sm">
                                    <div className="size-12 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform"><Shield size={24} strokeWidth={1.5} /></div>
                                    <div className="mb-8 flex-1">
                                        <h3 className="text-xl font-black tracking-tight text-slate-900 mb-2">Tim Manajemen</h3>
                                        <p className="text-xs font-medium text-slate-500 leading-relaxed">
                                            Tambah kapasitas personil Admin untuk membantu pengelolaan dashboard operasional.
                                        </p>
                                    </div>
                                    <div className="bg-[#fcfcfc] p-4 rounded-xl border border-slate-50 mb-6 flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kapasitas</span>
                                        <span className="text-xs font-black text-primary">{mgmtLimit} Akun (Aktif: {currentMgmtCount})</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button className="flex-1 font-black text-[10px] uppercase h-11 rounded-xl shadow-lg" onClick={() => setIsMgmtDialogOpen(true)}>Kelola Tim</Button>
                                        <Button variant="outline" size="icon" className="size-11 rounded-xl border-2 border-slate-200 text-slate-500 hover:text-primary hover:border-primary/20 shrink-0" onClick={() => setIsMgmtConfigOpen(true)}><Users size={18}/></Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {availableModules.length > 0 && isManagement && (
                        <div className="space-y-5">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 ml-1"><Layers size={14} /> Modul Tersedia</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {availableModules.map(m => (
                                    <ModuleCard 
                                        key={m.id} 
                                        config={m} 
                                        subscription={company?.moduleSubscriptions?.[m.id]} 
                                        isManagement={isManagement} 
                                        onActivateRequest={(mod) => { setDialogMode('activate'); setSelectedModule(mod); setIsSubDialogOpen(true); }}
                                        onAddQuotaRequest={(mod) => { setDialogMode('add-quota'); setSelectedModule(mod); setIsSubDialogOpen(true); }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {isManagement && myLogs.length > 0 && (
                        <div className="space-y-5">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 ml-1">
                                <History size={14} strokeWidth={3} /> Histori Pembelian & Aktivitas
                            </h3>
                            <Card className="border-none shadow-sm overflow-hidden bg-white rounded-2xl">
                                <div className="divide-y divide-slate-50">
                                    {myLogs.map(log => (
                                        <div key={log.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                            <div className="min-w-0 flex-1 pr-4">
                                                <p className="text-xs font-bold text-slate-900 truncate tracking-tight">{log.planName}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[7px] font-black uppercase h-3.5 px-1 border-none bg-muted/50">{log.action}</Badge>
                                                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">
                                                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'd MMM yyyy, HH:mm') : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-primary tnum">
                                                    {log.amount > 0 ? `Rp ${log.amount.toLocaleString('id-ID')}` : 'Gratis/Trial'}
                                                </p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Nilai Transaksi</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 bg-slate-50/50 border-t border-slate-50 text-center">
                                    <Button variant="ghost" size="sm" asChild className="text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 h-8">
                                        <Link href="/subscription-status">LIHAT STATUS LENGKAP <ArrowRight size={10} className="ml-1.5" strokeWidth={3} /></Link>
                                    </Button>
                                </div>
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
                mode={dialogMode}
                onConfirm={handleActivateModule} 
            />

            {company && <GroupManagementDialog isOpen={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen} holdingCompany={company} childCompanies={childCompanies} />}

            <Dialog open={isMgmtDialogOpen} onOpenChange={setIsMgmtDialogOpen}>
                <DialogContent className="max-w-5xl h-[90vh] md:h-[85vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl bg-white z-[200]">
                    <DialogHeader className="p-6 pb-2 shrink-0 bg-muted/20 border-b flex flex-col space-y-0.5">
                        <DialogTitle className="font-black text-xl tracking-tighter uppercase text-slate-900">Manajemen Tim Admin</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold text-primary uppercase tracking-widest">Kapasitas Maksimal: {mgmtLimit} Akun Admin</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto no-scrollbar min-w-0 bg-[#fafafa]">
                         <div className="p-4 w-full min-w-0">
                            <CompanyAdminManagementPage onQuotaFull={() => { setIsMgmtConfigOpen(true); }} />
                         </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isMgmtConfigOpen} onOpenChange={setIsMgmtConfigOpen}>
                <DialogContent className="sm:max-w-md border-none shadow-2xl overflow-hidden z-[300] flex flex-col h-full max-h-[85vh] p-0">
                    <DialogHeader className="p-6 pb-2 bg-muted/20 border-b shrink-0 flex flex-col space-y-0.5 text-left">
                        <DialogTitle className="font-black text-slate-900 text-xl tracking-tighter uppercase flex items-center gap-3">
                            <Shield size={24} className="text-primary" strokeWidth={2.5} /> Tambah Kuota Admin
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">Investasi Add-on Lifetime</DialogDescription>
                    </DialogHeader>
                    
                    <ScrollArea className="flex-1 min-h-0 bg-background">
                        <div className="p-8 space-y-8">
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1 min-w-0">
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Jumlah Akun</h4>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase">Admin tambahan untuk dashboard</p>
                                </div>
                                <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200 overflow-hidden h-11 shadow-sm shrink-0">
                                    <button type="button" onClick={() => setMgmtAddQuota(Math.max(1, mgmtAddQuota - 1))} className="px-4 hover:bg-white text-slate-900 transition-colors"><Minus size={16} strokeWidth={3} /></button>
                                    <input type="number" value={mgmtAddQuota} onChange={(e) => setMgmtAddQuota(Math.max(1, parseInt(e.target.value) || 1))} className="w-12 text-center border-none focus-visible:ring-0 text-sm font-black bg-transparent" />
                                    <button type="button" onClick={() => setMgmtAddQuota(mgmtAddQuota + 1)} className="px-4 hover:bg-white text-slate-900 transition-colors"><Plus size={16} strokeWidth={3} /></button>
                                </div>
                            </div>
                            <div className="p-6 rounded-2xl bg-[#090e1a] text-white shadow-xl space-y-2">
                                <div className="flex justify-between items-center opacity-40"><span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Investasi</span><ShoppingCart size={14} /></div>
                                <p className="text-3xl font-black tracking-tighter">Rp {(mgmtAddQuota * mgmtPricePerUser).toLocaleString('id-ID')}</p>
                            </div>
                            <Alert className="bg-blue-50 border-blue-100 border-none">
                                <Info className="size-4 text-primary" strokeWidth={2.5} />
                                <AlertDescription className="text-[10px] text-blue-900 font-bold uppercase tracking-tight leading-relaxed">
                                    Sekali Bayar. Berlaku selamanya tanpa biaya perpanjangan tahunan.
                                </AlertDescription>
                            </Alert>

                            <div className="flex gap-3 pt-6">
                                <DialogClose asChild><Button variant="ghost" className="flex-1 font-black text-[10px] uppercase">Batal</Button></DialogClose>
                                <Button className="flex-1 font-black uppercase tracking-widest text-[10px] h-12 shadow-lg" onClick={handleBuyMgmtAddon}>Beli Sekarang</Button>
                            </div>
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </ResponsivePage>
    );
}

export default function WorkspacePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary size-10" /></div>}>
            <WorkspaceContent />
        </Suspense>
    );
}
