// src/app/(main)/okr/page.tsx
"use client";

import { useState, useMemo } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Target, ListChecks, Calendar, MoreHorizontal, Edit, Trash2, Building, Search, ArrowRight, User } from 'lucide-react';
import type { OKR, Company } from '@/types';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DeleteConfirmationDialog } from '@/components/master-data/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ResponsivePage, ResponsiveToolbar } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AdaptiveCardGrid } from '@/components/ui/adaptive-card';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/utils';
import { DashboardNavigator } from '@/components/layout/dashboard-navigator';

const OkrCard = ({ okr, onEdit, onDelete }: { okr: OKR, onEdit: (okr: OKR) => void, onDelete: (okr: OKR) => void }) => {
    const { isMobile } = useBreakpoint();
    const getStatusVariant = (status: OKR['status']) => {
        switch (status) {
            case 'Active': return 'default';
            case 'Completed': return 'secondary';
            case 'Overdue': return 'destructive';
            default: return 'outline';
        }
    };

    const formatDate = (date: any): Date | null => {
        if (!date) return null;
        if (date && typeof date.toDate === 'function') return date.toDate();
        try { const parsedDate = new Date(date); return isNaN(parsedDate.getTime()) ? null : parsedDate; } catch (e) { return null; }
    };

    const endDate = formatDate(okr.endDate);
    const progressValue = okr.progress ?? 0;

    return (
        <Card className="hover:shadow-md transition-all h-full flex flex-col border-l-4 border-primary group bg-background overflow-hidden shadow-sm">
            <CardHeader className={isMobile ? "p-4 pb-2" : "p-6 pb-3"}>
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-1.5 min-w-0">
                        <Link href={`/okr/${okr.id}`} className="hover:underline block truncate">
                            <CardTitle className={cn(
                                "font-black uppercase tracking-tight text-slate-900",
                                isMobile ? "text-xs" : "text-sm"
                            )}>{okr.objective}</CardTitle>
                        </Link>
                        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
                            <User size={10} className="opacity-40" />
                            <span className="truncate">{okr.ownerName}</span>
                        </div>
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted shrink-0">
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[350]">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase opacity-60">Pilihan OKR</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onEdit(okr)} className="text-xs"><Edit className="mr-2 h-3.5 w-3.5"/> Ubah Setup</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDelete(okr)} className="text-destructive font-bold text-xs"><Trash2 className="mr-2 h-3.5 w-3.5"/> Hapus Project</DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                </div>
            </CardHeader>
            <Link href={`/okr/${okr.id}`} className="flex-grow flex flex-col">
                 <CardContent className={cn("flex-grow", isMobile ? "p-4 pt-0" : "p-6 pt-0")}>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase">
                            <span className="text-muted-foreground tracking-widest">Capaian Progres</span>
                            <span className="text-primary text-sm font-black tnum">{(progressValue ?? 0).toFixed(1)}%</span>
                        </div>
                        <Progress value={progressValue} className="h-1.5" />
                        <div className="flex items-center gap-2">
                             <div className="flex items-center gap-1.5 text-[9px] font-black uppercase bg-muted/60 text-slate-600 px-2 py-1 rounded-md border border-border/50">
                                <ListChecks size={10} className="text-primary" /> {okr.keyResults.length} KR
                             </div>
                             <Badge variant={getStatusVariant(okr.status)} className="text-[8px] h-5 font-black uppercase px-2 border-none">
                                {okr.status}
                             </Badge>
                        </div>
                     </div>
                </CardContent>
                <CardFooter className={cn(
                    "text-[9px] font-black uppercase text-muted-foreground border-t bg-muted/5 mt-auto transition-colors group-hover:bg-muted/10",
                    isMobile ? "p-3 px-4" : "p-4 px-6"
                )}>
                    <div className="flex items-center justify-between w-full">
                         <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="opacity-40" />
                            <span className="tracking-tighter">{endDate ? format(endDate, "d MMM yyyy") : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 group-hover:text-primary transition-colors">
                            <span>DETAIL</span>
                            <ArrowRight size={10} />
                        </div>
                    </div>
                </CardFooter>
            </Link>
        </Card>
    );
};

export default function OkrListPage() {
  const { currentUser, userRole } = useAuth();
  const { okrs, companies, employees, deleteOkr } = useMasterData();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [okrToDelete, setOkrToDelete] = useState<OKR | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
  const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    if (isHoldingAdmin && userCompany) {
      const getChildCompanies = (parentId: string): Company[] => {
        const children = companies.filter(c => c.parentId === parentId);
        return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
      };
      return [userCompany, ...getChildCompanies(userCompany.id)];
    }
    if (userCompany) return [userCompany]; return [];
  }, [userRole, isHoldingAdmin, userCompany, companies]);

  const filteredOkrs = useMemo(() => {
    if (!currentUser || !okrs) return [];
    let result = okrs;

    if (showCompanyFilter && selectedCompany !== 'all') {
        const companyName = companies.find(c => c.id === selectedCompany)?.name;
        result = result.filter(o => o.company === companyName);
    } else if (!showCompanyFilter) {
        result = result.filter(o => o.company === currentUser.company);
    }

    if (activeTab !== 'all') result = result.filter(o => o.status === activeTab);
    if (searchTerm) result = result.filter(o => o.objective.toLowerCase().includes(searchTerm.toLowerCase()));

    return result.sort((a,b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB - dateA;
    });
  }, [okrs, currentUser, showCompanyFilter, selectedCompany, activeTab, searchTerm, companies]);

  return (
    <ResponsivePage>
        <PageHeader 
            title="Workspace OKR" 
            description="Lacak sasaran strategis dan hasil utama yang terukur dalam alur kerja project yang dinamis." 
            icon={Target} 
            actions={
                <Button asChild className="font-bold shadow-lg h-9 sm:h-10 active:scale-95 transition-all">
                    <Link href="/okr/new">
                        <PlusCircle className="mr-2 size-4"/>
                        Buat OKR Baru
                    </Link>
                </Button>
            } 
        />
        
        <DashboardNavigator />

        <ResponsiveToolbar>
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                    placeholder="Cari objective..." 
                    className="pl-9 h-10 border-none bg-background/50 shadow-none focus-visible:ring-primary/20" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
            </div>
            {showCompanyFilter && (
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger className="w-full sm:w-[240px] h-10 bg-background border-none shadow-sm text-[11px] font-black uppercase">
                        <Building className="size-3.5 mr-2 text-primary" />
                        <SelectValue placeholder="Semua Unit Bisnis" />
                    </SelectTrigger>
                    <SelectContent className="z-[350]">
                        <SelectItem value="all">Seluruh Ekosistem</SelectItem>
                        {manageableCompanies.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </ResponsiveToolbar>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="w-full overflow-x-auto pb-2">
                <TabsList className="flex w-max sm:grid sm:w-full sm:grid-cols-5 max-w-[700px] bg-muted/30 p-1 rounded-xl mb-8">
                    <TabsTrigger value="all" className="text-[10px] font-bold uppercase rounded-lg px-6">Semua</TabsTrigger>
                    <TabsTrigger value="Active" className="text-[10px] font-bold uppercase rounded-lg px-6">Aktif</TabsTrigger>
                    <TabsTrigger value="Draft" className="text-[10px] font-bold uppercase rounded-lg px-6">Draf</TabsTrigger>
                    <TabsTrigger value="Completed" className="text-[10px] font-bold uppercase rounded-lg px-6">Selesai</TabsTrigger>
                    <TabsTrigger value="Overdue" className="text-[10px] font-bold uppercase rounded-lg px-6">Telat</TabsTrigger>
                </TabsList>
            </div>

            {filteredOkrs.length > 0 ? (
                <AdaptiveCardGrid complexity="medium">
                    {filteredOkrs.map(okr => (
                        <OkrCard 
                            key={okr.id} 
                            okr={okr} 
                            onEdit={(o) => router.push(`/okr/${o.id}?edit=true`)} 
                            onDelete={(o) => { setOkrToDelete(o); setIsDeleteDialogOpen(true); }} 
                        />
                    ))}
                </AdaptiveCardGrid>
            ) : (
                <div className="py-32 text-center border-2 border-dashed rounded-3xl bg-muted/5 opacity-40">
                    <Target size={48} className="mx-auto mb-4 text-slate-400" />
                    <p className="font-black uppercase text-[10px] tracking-[0.2em]">Data Project Kosong</p>
                    <p className="text-xs text-muted-foreground mt-2">Belum ada project OKR yang sesuai dengan filter saat ini.</p>
                </div>
            )}
        </Tabs>

        <DeleteConfirmationDialog 
            isOpen={isDeleteDialogOpen} 
            onOpenChange={setIsDeleteDialogOpen} 
            onConfirm={async () => { if(okrToDelete) await deleteOkr(okrToDelete.id); setOkrToDelete(null); }} 
            itemName={okrToDelete?.objective || ''} 
            itemType="Project OKR" 
        />
    </ResponsivePage>
  );
}
