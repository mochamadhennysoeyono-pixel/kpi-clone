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
    ShoppingCart
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
                {(isActive && isManagement) && (
                    <Badge className={cn(
                        "absolute top-6 right-6 font-bold border-none text-[10px] uppercase",
                        isTrial ? "bg-slate-200 text-slate-600" : "bg-primary text-white"
                    )}>
                        {isTrial ? 'Trial' : 'Aktif'}
                    </Badge>
                )}
                <CardTitle className="text-xl font-headline font-bold">{config.name}</CardTitle>
                <CardDescription className="text-xs leading-relaxed min-h-[40px]">
                    {config.description}
                </CardDescription>
            </CardHeader>
            
            {isManagement && (
                <CardContent className="flex-grow pt-0">
                    {isActive ? (
                        <div className="space-y-3 bg-muted/30 p-3 rounded-xl border border-dashed text-[11px] font-medium">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground uppercase tracking-tight">Kapasitas Staff</span>
                                <span className="font-bold text-slate-700">{subscription.quota === -1 ? 'Unlimited' : subscription.quota} User</span>
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
                            <div className="flex flex-col items-center gap-2 opacity-40">
                                <Lock size={20} className="text-muted-foreground" />
                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Belum Berlangganan</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            )}

            <CardFooter className="pt-4 border-t bg-muted/5 mt-auto p-4">
                <div className="flex items-center gap-2 w-full">
                    {isActive ? (
                        <>
                            <Button asChild className="flex-1 font-bold shadow-md rounded-xl h-11 transition-all active:scale-95">
                                <Link href={config.route}>
                                    Masuk Modul <ArrowRight className="ml-2 size-4" />
                                </Link>
                            </Button>
                            {(isTrial && isManagement) && (
                                <Button 
                                    variant="outline" 
                                    size="icon"
                                    className="size-11 rounded-xl border-2 border-primary text-primary hover:bg-primary/5 shrink-0"
                                    onClick={() => onActivateRequest(config)}
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
                                 <Zap className="mr-2 size-4" /> Beli Modul
                            </Button>
                        )
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}

function AdminDataCard({ label, description, icon: Icon, href, color, onClick }: { label: string, description: string, icon: any, href?: string, color: string, onClick?: () => void }) {
    const content = (
        <Card className="h-full border-none shadow-sm hover:shadow-md transition-all bg-background cursor-pointer">
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
    );

    if (onClick) {
        return <div onClick={onClick} className="block group">{content}</div>;
    }

    return (
        <Link href={href || '#'} className="block group">
            {content}
        </Link>
    );
}

const MGMT_PRICE_PER_USER = 75000; // Harga investasi lifetime

export default function PortalPage() {
    const { currentUser, userRole, logout, setIsLoading } = useAuth();
    const { companies, subscriptionLogs, updateCompany, addSubscriptionLog, fetchData, companyAdmins } = useMasterData();
    const { toast } = useToast();

    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
    const [selectedModule, setSelectedModule] = useState<any>(null);
    const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
    const [isMgmtDialogOpen, setIsMgmtDialogOpen] = useState(false);
    const [isMgmtConfigOpen, setIsMgmtConfigOpen] = useState(false);
    const [mgmtAddQuota, setMgmtAddQuota] = useState(1);
    const [isUpgrading, setIsUpgrading] = useState(false);

    const company = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isManagement = userRole === 'manajemen';

    const childCompanies = useMemo(() => {
        if (!company) return [];
        return companies.filter(c => c.parentId === company.id);
    }, [company, companies]);

    // Management Quota Logic: Force 1 if undefined, strictly consistent with CompanyAdminManagementPage
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
            const expiry = addDays(now, data.duration);
            
            const newSubscription: any = {
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

            const updatePayload: Partial<Company> = {
                moduleSubscriptions: updatedModuleSubscriptions,
                usedTrials: updatedUsedTrials
            };

            if (data.type === 'paid') {
                updatePayload.customUserLimit = data.quota;
            }

            await updateCompany(company.id, updatePayload);

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

            toast({ title: "Berhasil!", description: data.type === 'trial' ? `Masa trial Modul ${selectedModule.name} aktif.` : `Modul ${selectedModule.name} berhasil dibeli.` });
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
            const totalPrice = mgmtAddQuota * MGMT_PRICE_PER_USER;

            await updateCompany(company.id, { customManagementUserLimit: newLimit });

            await addSubscriptionLog({
                companyId: company.id,
                companyName: company.name,
                company: company.name,
                planName: `Add-on: +${mgmtAddQuota} Akun Manajemen (Lifetime)`,
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

    if (!currentUser) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-4 space-y-6">
                    <Card className="shadow-2xl border-none overflow-hidden bg-slate-900 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Building size={150} /></div>
                        <CardHeader className="relative z-10 p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="size-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center"><Building size={32} className="text-white" /></div>
                                <div className="space-y-1 min-w-0">
                                    <h2 className="text-xl font-black truncate">{company?.name || 'N/A'}</h2>
                                    <Badge variant="outline" className="text-white/60 border-white/20 text-[9px] font-black uppercase tracking-widest">{company?.businessField}</Badge>
                                </div>
                            </div>
                            <Separator className="bg-white/10 mb-6" />
                            <div className="space-y-4 text-sm">
                                <div className="flex items-center gap-3"><LucideUser className="size-4 text-white/50" /><span className="font-bold opacity-90">{currentUser.name}</span></div>
                                <div className="flex items-center gap-3"><Mail className="size-4 text-white/50" /><span className="opacity-70 truncate">{currentUser.email}</span></div>
                            </div>
                        </CardHeader>
                        <CardFooter className="bg-black/20 p-4"><Button variant="ghost" className="w-full text-white/60 hover:text-white hover:bg-white/10 font-bold text-xs" onClick={logout}>Keluar Akun</Button></CardFooter>
                    </Card>

                    {isManagement && (
                        <div className="space-y-4">
                             <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1"><Database size={12} /> Pondasi Data</h3>
                             <AdminDataCard label="Setup Master Data" description="Kelola personil, departemen, dan hierarki" icon={Settings} href="/master-data/employees" color="bg-indigo-600" />
                        </div>
                    )}

                    {isManagement && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1"><GitMerge size={12} /> Manajemen Grup</h3>
                            {company?.isHolding ? (
                                <AdminDataCard label="Manajemen Grup" description="Kelola anak perusahaan dan unit bisnis" icon={Building} onClick={() => setIsGroupDialogOpen(true)} color="bg-rose-500" />
                            ) : (
                                company?.canBecomeHolding && (
                                    <Card className="border-dashed bg-primary/5">
                                        <CardContent className="p-6 text-center space-y-4">
                                            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary"><GitMerge size={24} /></div>
                                            <div className="space-y-1"><p className="text-xs font-bold uppercase">Upgrade ke Holding</p><p className="text-[10px] text-muted-foreground leading-relaxed">Kelola banyak cabang dalam satu pintu.</p></div>
                                            <Button onClick={handleUpgradeToHolding} disabled={isUpgrading} variant="outline" size="sm" className="w-full text-[10px] font-black uppercase border-primary/20 h-9">{isUpgrading ? <Loader2 className="size-3 animate-spin mr-2" /> : null}Upgrade Sekarang</Button>
                                        </CardContent>
                                    </Card>
                                )
                            )}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900">Halo, {currentUser.name.split(' ')[0]} 👋</h1>
                        <p className="text-slate-500 text-lg">Silakan pilih modul yang ingin Anda akses.</p>
                    </div>

                    {activeModules.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><ShieldCheck className="size-4" /> Modul Aktif</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {activeModules.map(m => (
                                    <ModuleCard key={m.id} config={m} subscription={company?.moduleSubscriptions?.[m.id]} isManagement={isManagement} onActivateRequest={(mod) => { setSelectedModule(mod); setIsSubDialogOpen(true); }} />
                                ))}
                            </div>
                        </div>
                    )}

                    {isManagement && (
                        <div className="space-y-4">
                             <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Plus size={14} /> Layanan Tambahan (Add-ons)</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="border-2 border-primary/10 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                                    <CardHeader>
                                        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 w-fit mb-4 group-hover:scale-110 transition-transform"><Shield size={24} /></div>
                                        <CardTitle className="text-xl font-bold font-headline">Tim Manajemen</CardTitle>
                                        <CardDescription className="text-xs">Kelola personil dengan hak akses Admin. Tambahkan lebih banyak slot jika diperlukan.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow pt-0">
                                        <div className="bg-muted/30 p-3 rounded-xl border border-dashed text-[11px] font-medium flex justify-between items-center">
                                            <span className="text-muted-foreground uppercase">Kapasitas Admin</span>
                                            <span className="font-bold text-primary">{mgmtLimit} Akun Aktif (Terpakai {currentMgmtCount})</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-4 bg-muted/5 border-t gap-2">
                                        <Button className="flex-1 font-bold rounded-xl h-11" onClick={() => setIsMgmtDialogOpen(true)}>Kelola Tim <ArrowRight className="ml-2 size-4" /></Button>
                                        <Button variant="outline" size="icon" className="size-11 rounded-xl border-primary/20 text-primary hover:bg-primary/5" onClick={() => setIsMgmtConfigOpen(true)} title="Tambah Kuota Admin"><Users size={18}/></Button>
                                    </CardFooter>
                                </Card>
                             </div>
                        </div>
                    )}

                    {availableModules.length > 0 && isManagement && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><LayoutGrid size={14} /> Modul Tersedia</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {availableModules.map(m => (
                                    <ModuleCard key={m.id} config={m} subscription={company?.moduleSubscriptions?.[m.id]} isManagement={isManagement} onActivateRequest={(mod) => { setSelectedModule(mod); setIsSubDialogOpen(true); }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ModuleSubscriptionDialog isOpen={isSubDialogOpen} onOpenChange={setIsSubDialogOpen} module={selectedModule} company={company || null} onConfirm={handleActivateModule} />

            {company && <GroupManagementDialog isOpen={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen} holdingCompany={company} childCompanies={childCompanies} />}

            <Dialog open={isMgmtDialogOpen} onOpenChange={setIsMgmtDialogOpen}>
                <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl bg-white z-[200]">
                    <DialogHeader className="p-6 pb-2 shrink-0 bg-background border-b sticky top-0 z-10">
                        <DialogTitle className="font-headline font-black text-xl uppercase tracking-tighter">Manajemen Tim Admin</DialogTitle>
                        <DialogDescription className="text-xs font-bold text-primary">Kapasitas Maksimal: {mgmtLimit} Akun Admin</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                         <div className="p-4">
                            <CompanyAdminManagementPage onQuotaFull={() => { setIsMgmtConfigOpen(true); }} />
                         </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isMgmtConfigOpen} onOpenChange={setIsMgmtConfigOpen}>
                <DialogContent className="sm:max-w-md border-none shadow-2xl overflow-hidden z-[300]">
                    <DialogHeader className="p-6 pb-2 bg-indigo-50 border-b">
                        <DialogTitle className="font-black text-indigo-900 flex items-center gap-2"><Shield className="size-5" /> Tambah Kuota Admin</DialogTitle>
                        <DialogDescription className="text-indigo-700/70 text-xs font-bold uppercase tracking-wider">Investasi Add-on Lifetime</DialogDescription>
                    </DialogHeader>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Jumlah Akun Baru</h4>
                                <p className="text-[10px] text-muted-foreground uppercase font-medium">Berapa banyak admin tambahan?</p>
                            </div>
                            <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden h-10 shadow-sm">
                                <button type="button" onClick={() => setMgmtAddQuota(Math.max(1, mgmtAddQuota - 1))} className="px-3 hover:bg-indigo-50 text-indigo-600"><Minus size={16} strokeWidth={3} /></button>
                                <input type="number" value={mgmtAddQuota} onChange={(e) => setMgmtAddQuota(Math.max(1, parseInt(e.target.value) || 1))} className="w-12 text-center border-none focus-visible:ring-0 text-sm font-black bg-transparent" />
                                <button type="button" onClick={() => setMgmtAddQuota(mgmtAddQuota + 1)} className="px-3 hover:bg-indigo-50 text-indigo-600"><Plus size={16} strokeWidth={3} /></button>
                            </div>
                        </div>
                        <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xl shadow-indigo-500/10 space-y-2">
                             <div className="flex justify-between items-center opacity-70"><span className="text-[10px] font-black uppercase tracking-widest">Total Investasi (Sekali Bayar)</span><ShoppingCart size={14} /></div>
                             <p className="text-2xl font-black tracking-tighter">Rp {(mgmtAddQuota * MGMT_PRICE_PER_USER).toLocaleString('id-ID')}</p>
                        </div>
                        <Alert className="bg-blue-50 border-blue-100">
                            <Info className="size-4 text-blue-600"/>
                            <AlertDescription className="text-[10px] text-blue-700 font-medium">
                                Penambahan kuota ini berlaku selamanya (Lifetime) dan tidak memerlukan biaya perpanjangan tahunan.
                            </AlertDescription>
                        </Alert>
                    </div>
                    <DialogFooter className="p-6 pt-0 flex gap-2">
                        <DialogClose asChild><Button variant="outline" className="flex-1 font-bold text-xs">Batal</Button></DialogClose>
                        <Button className="flex-1 font-black uppercase tracking-widest text-[10px] h-11 bg-indigo-600 hover:bg-indigo-700" onClick={handleBuyMgmtAddon}>Beli Sekarang</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
