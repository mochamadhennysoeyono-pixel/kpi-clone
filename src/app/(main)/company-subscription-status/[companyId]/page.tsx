
// src/app/(main)/company-subscription-status/[companyId]/page.tsx
"use client";

import { useMemo, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMasterData } from '@/contexts/master-data-context';
import { 
    Crown, 
    Building, 
    ChevronLeft, 
    History, 
    ClipboardCheck,
    GraduationCap,
    LayoutGrid,
    Zap,
    Loader2,
    MoreHorizontal,
    RefreshCw,
    ShieldAlert,
    ShoppingCart,
    Timer,
    PlusCircle,
    X,
    Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNowStrict, format, parseISO, isValid, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from '@/lib/utils';
import type { SubscriptionPlan, Company, ModuleId, ModuleSubscription } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

// --- Internal Components ---

function ModuleStatusCard({ 
    id, 
    name, 
    icon: Icon, 
    sub,
    onReset,
    onActivate,
    onUpgrade
}: { 
    id: ModuleId, 
    name: string, 
    icon: any, 
    sub?: ModuleSubscription,
    onReset: (id: ModuleId) => void,
    onActivate: (id: ModuleId) => void,
    onUpgrade: (id: ModuleId) => void
}) {
    const isActive = sub?.status === 'active';
    const isExpired = sub?.status === 'expired';
    const isTrial = sub?.type === 'trial';

    const getRemainingDays = () => {
        if (!sub?.expiryDate) return null;
        try {
            const expiry = parseISO(sub.expiryDate);
            const now = new Date();
            if (now > expiry) return 'EXPIRED';
            return formatDistanceToNowStrict(expiry, { unit: 'day', locale: localeId });
        } catch (e) {
            return 'N/A';
        }
    };

    const daysLeft = getRemainingDays();

    return (
        <Card className={cn(
            "border-border/60 shadow-sm overflow-hidden transition-all duration-300 group",
            isActive ? "bg-background" : "bg-muted/10 grayscale opacity-60"
        )}>
            <div className={cn("h-1.5 w-full", isActive ? "bg-primary" : "bg-slate-300")} />
            <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                    <div className={cn(
                        "p-2 rounded-xl",
                        isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        <Icon size={20} />
                    </div>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal size={14} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[350]">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase opacity-60">Kontrol Modul</DropdownMenuLabel>
                            {isActive ? (
                                <>
                                    <DropdownMenuItem onClick={() => onUpgrade(id)}>
                                        <ShoppingCart size={14} className="mr-2 text-primary" /> Upgrade / Tambah Kuota
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-amber-600 font-bold" onClick={() => onReset(id)}>
                                        <RefreshCw size={14} className="mr-2" /> Reset Langganan (Test)
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <DropdownMenuItem onClick={() => onActivate(id)}>
                                    <Zap size={14} className="mr-2 text-amber-500 fill-amber-500" /> Aktifkan Manual
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="space-y-0.5">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{name}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {isActive ? (isTrial ? 'Akses Terbatas' : 'Lisensi Penuh') : 'Modul Inaktif'}
                    </p>
                </div>

                {isActive && (
                    <div className="pt-2 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                            <span className="text-muted-foreground opacity-60">Staff Quota</span>
                            <span className="text-slate-900 font-bold">{sub.quota === -1 ? '∞' : sub.quota} Akun</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                            <span className="text-muted-foreground opacity-60">Masa Aktif</span>
                            <span className={cn("font-bold", isExpired ? "text-rose-600" : "text-primary")}>
                                {daysLeft}
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ManualActivationDialog({ 
    isOpen, 
    onOpenChange, 
    moduleName, 
    onConfirm,
    isLoading 
}: { 
    isOpen: boolean, 
    onOpenChange: (o: boolean) => void, 
    moduleName: string, 
    onConfirm: (data: any) => void,
    isLoading: boolean
}) {
    const [config, setConfig] = useState({
        type: 'paid' as 'trial' | 'paid',
        quota: 10,
        expiryDate: format(addDays(new Date(), 365), 'yyyy-MM-dd')
    });

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tighter">Aktivasi Manual</DialogTitle>
                    <DialogDescription className="text-xs font-bold text-primary uppercase">MODUL: {moduleName}</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase opacity-60">Jenis Akses</Label>
                        <RadioGroup 
                            value={config.type} 
                            onValueChange={(v: any) => setConfig(prev => ({ ...prev, type: v, quota: v === 'trial' ? 10 : prev.quota, expiryDate: v === 'trial' ? format(addDays(new Date(), 14), 'yyyy-MM-dd') : prev.expiryDate }))}
                            className="grid grid-cols-2 gap-3"
                        >
                            <div className="relative">
                                <RadioGroupItem value="paid" id="paid" className="peer sr-only" />
                                <Label htmlFor="paid" className="flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 text-xs font-bold uppercase transition-all">PAID</Label>
                            </div>
                            <div className="relative">
                                <RadioGroupItem value="trial" id="trial" className="peer sr-only" />
                                <Label htmlFor="trial" className="flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-50 text-xs font-bold uppercase transition-all">TRIAL</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase opacity-60">Kuota Staff</Label>
                            <Input type="number" value={config.quota} onChange={(e) => setConfig(prev => ({ ...prev, quota: parseInt(e.target.value) || 0 }))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase opacity-60">Tanggal Kadaluarsa</Label>
                            <Input type="date" value={config.expiryDate} onChange={(e) => setConfig(prev => ({ ...prev, expiryDate: e.target.value }))} />
                        </div>
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <DialogClose asChild><Button variant="ghost" className="font-bold">Batal</Button></DialogClose>
                    <Button onClick={() => onConfirm(config)} disabled={isLoading} className="font-black px-8">
                        {isLoading ? <Loader2 className="animate-spin size-4" /> : "AKTIFKAN MODUL"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Internal Local Components for Layout
function Card({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-sm", className)}>
      {children}
    </div>
  );
}

function CardHeader({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>;
}

function CardTitle({ children, className }: { children: React.ReactNode, className?: string }) {
  return <h3 className={cn("text-lg font-bold tracking-tight text-foreground", className)}>{children}</h3>;
}

function CardDescription({ children, className }: { children: React.ReactNode, className?: string }) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
}

function CardContent({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("p-6 pt-0", className)}>{children}</div>;
}

export default function CompanySubscriptionStatusPage() {
    const { companyId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { companies, employees, resetModuleSubscription, activateModuleManually, subscriptionLogs, companyAdmins } = useMasterData();
    
    const [isActivating, setIsActivating] = useState(false);
    const [selectedModuleId, setSelectedModuleId] = useState<ModuleId | null>(null);
    const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);

    const company = useMemo(() => companies.find(c => c.id === companyId), [companyId, companies]);

    const companyHistory = useMemo(() => {
        if (!company) return [];
        return subscriptionLogs
            .filter(log => log.companyId === company.id)
            .sort((a, b) => {
                const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
                const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
    }, [company, subscriptionLogs]);

    const activeModulesCount = useMemo(() => {
        if (!company?.moduleSubscriptions) return 0;
        return Object.values(company.moduleSubscriptions).filter(s => s.status === 'active').length;
    }, [company]);

    const moduleCatalog = [
        { id: 'appraisal' as ModuleId, name: 'Appraisal & KPI', icon: ClipboardCheck },
        { id: 'lms' as ModuleId, name: 'Akademi LMS', icon: GraduationCap },
        { id: 'collabspace' as ModuleId, name: 'CollabSpace', icon: LayoutGrid },
    ];

    const handleResetRequest = async (moduleId: ModuleId) => {
        if (!company) return;
        if (confirm(`PENTING: Hapus data langganan modul ${moduleId} untuk ${company.name}? Data operasional mungkin tidak bisa diakses sampai diaktifkan kembali.`)) {
            await resetModuleSubscription(company.id, moduleId);
        }
    };

    const handleOpenManualActivation = (moduleId: ModuleId) => {
        setSelectedModuleId(moduleId);
        setIsManualDialogOpen(true);
    };

    const handleConfirmManualActivation = async (config: any) => {
        if (!company || !selectedModuleId) return;
        setIsActivating(true);
        try {
            await activateModuleManually(company.id, selectedModuleId, config);
            setIsManualDialogOpen(false);
        } finally {
            setIsActivating(false);
        }
    };

    if (!company) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="animate-spin text-primary size-10" />
            </div>
        );
    }

    const mgmtLimit = company.customManagementUserLimit || 1;
    const currentMgmtCount = companyAdmins.filter(a => a.company === company.name).length;

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-24 px-4 sm:px-0 animate-fade-in">
             <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()} className="-ml-4 hover:bg-muted font-bold text-[10px] uppercase tracking-widest text-muted-foreground px-4">
                    <ChevronLeft className="mr-2 h-4 w-4" /> KEMBALI KE DATA KLIEN
                </Button>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[10px] uppercase h-6 px-3">{company.status}</Badge>
                </div>
            </div>

            <Card className="shadow-lg overflow-hidden border-none bg-[#131b2e] text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Crown size={120} />
                </div>
                <CardHeader className="p-8 sm:p-10">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">BILLING & MODULAR OVERSIGHT</p>
                        <CardTitle className="font-headline text-3xl sm:text-4xl tracking-tighter uppercase">{company.name}</CardTitle>
                        <CardDescription className="text-slate-400 text-sm sm:text-base font-medium max-w-2xl">
                            Kelola status operasional setiap modul secara independen dan pantau utilisasi lisensi di seluruh ekosistem bisnis klien.
                        </CardDescription>
                    </div>
                </CardHeader>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 bg-black/20 border-t border-white/5 backdrop-blur-md">
                    <div className="p-6 border-r border-white/5">
                        <p className="text-[9px] font-black uppercase opacity-40 tracking-widest mb-1">Modul Aktif</p>
                        <p className="text-xl font-black">{activeModulesCount} / 3</p>
                    </div>
                    <div className="p-6 border-r border-white/5">
                        <p className="text-[9px] font-black uppercase opacity-40 tracking-widest mb-1">Admin Aktif</p>
                        <p className="text-xl font-black">{currentMgmtCount} / {mgmtLimit}</p>
                    </div>
                    <div className="p-6 border-r border-white/5">
                        <p className="text-[9px] font-black uppercase opacity-40 tracking-widest mb-1">ID Klien</p>
                        <p className="text-xs font-mono opacity-60 uppercase">{company.id.substring(0, 12)}...</p>
                    </div>
                    <div className="p-6">
                        <p className="text-[9px] font-black uppercase opacity-40 tracking-widest mb-1">Status Klien</p>
                        <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Normal</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Modular Inventory Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                    <Zap size={14} className="text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">INVENTORI MODUL TERPASANG</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {moduleCatalog.map(m => (
                        <ModuleStatusCard 
                            key={m.id} 
                            id={m.id} 
                            name={m.name} 
                            icon={m.icon} 
                            sub={company.moduleSubscriptions?.[m.id]}
                            onReset={handleResetRequest}
                            onActivate={handleOpenManualActivation}
                            onUpgrade={(id) => router.push(`/subscription-plans?companyId=${company.id}&moduleId=${id}`)}
                        />
                    ))}
                </div>
            </div>

            <Separator className="opacity-40" />

            {/* History Table */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                    <History size={14} className="text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">LOG HISTORI TRANSAKSI KLIEN</h3>
                </div>
                <Card className="shadow-md border-border/40 overflow-hidden bg-background">
                    <CardHeader className="bg-muted/30 border-b p-5">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Arsip Aktivasi & Pembayaran</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="w-full">
                            <Table>
                                <TableHeader className="bg-muted/10 border-none">
                                    <TableRow className="border-none">
                                        <TableHead className="text-[10px] font-black uppercase py-4 px-6">Timestamp</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase">Aksi / Event</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase">Item Paket</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-right">Nilai (IDR)</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-right pr-6">Petugas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {companyHistory.length > 0 ? (
                                        companyHistory.map((log) => (
                                            <TableRow key={log.id} className="border-border/40 hover:bg-muted/5 group transition-colors">
                                                <TableCell className="py-5 px-6">
                                                    <div className="font-mono text-[10px] font-bold text-slate-400">
                                                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), "HH:mm:ss") : "--:--:--"}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-900 mt-0.5">
                                                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), "dd MMM yyyy") : "-"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn(
                                                        "text-[9px] font-black uppercase border-none px-1.5 h-4 shadow-sm",
                                                        log.action === 'TRIAL' ? "bg-amber-50 text-amber-700" : 
                                                        log.action === 'UPGRADE' ? "bg-emerald-50 text-emerald-700" : 
                                                        "bg-blue-50 text-blue-700"
                                                    )}>
                                                        {log.action.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                                                    {log.planName}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className="font-mono text-xs font-black text-primary tnum">
                                                        {log.amount > 0 ? `+${log.amount.toLocaleString('id-ID')}` : 'FREE'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase">{log.performedBy}</p>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-40 text-center text-xs text-muted-foreground italic font-medium">
                                                Belum ada riwayat transaksi tercatat untuk unit bisnis ini.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            <ManualActivationDialog 
                isOpen={isManualDialogOpen}
                onOpenChange={setIsManualDialogOpen}
                moduleName={moduleCatalog.find(m => m.id === selectedModuleId)?.name || ''}
                isLoading={isActivating}
                onConfirm={handleConfirmManualActivation}
            />
        </div>
    );
}
