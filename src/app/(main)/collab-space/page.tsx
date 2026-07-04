// src/app/(main)/collab-space/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutGrid, PlusCircle, Users, ArrowRight, Building, Search, MoreHorizontal, Pencil, Trash2, CheckCircle2, RotateCcw, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { CollabSpaceFormSheet } from '@/components/collab/collab-space-form-sheet';
import { DeleteConfirmationDialog } from '@/components/master-data/delete-confirmation-dialog';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { ResponsivePage, ResponsiveToolbar } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AdaptiveCardGrid } from '@/components/ui/adaptive-card';
import { useBreakpoint } from '@/hooks/use-breakpoint';

// Static mapping for border and background classes to prevent purging
const colorStyles: Record<string, { border: string, bg: string }> = {
    'blue-500': { border: 'border-t-blue-400', bg: 'bg-blue-50' },
    'emerald-500': { border: 'border-t-emerald-400', bg: 'bg-emerald-50' },
    'rose-500': { border: 'border-t-rose-400', bg: 'bg-rose-50' },
    'amber-500': { border: 'border-t-amber-400', bg: 'bg-amber-50' },
    'violet-500': { border: 'border-t-violet-400', bg: 'bg-violet-50' },
    'sky-500': { border: 'border-t-sky-400', bg: 'bg-sky-50' },
};

export default function CollabSpaceListingPage() {
    const { collabSpaces, employees, companies, deleteCollabSpace, updateCollabSpace } = useMasterData();
    const { currentUser, userRole } = useAuth();
    const { toast } = useToast();
    const { isMobile } = useBreakpoint();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedSpace, setSelectedSpace] = useState<any>(undefined);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [spaceToDelete, setSpaceToDelete] = useState<any>(null);

    // --- Logic for Admin/Holding visibility ---
    const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
    const showAdminFilters = userRole === 'superadmin' || isHoldingAdmin;

    const manageableCompanies = useMemo(() => {
        if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
        if (isHoldingAdmin && userCompany) {
            const getDescendantCompanies = (parentId: string): any[] => {
                const children = companies.filter(c => c.parentId === parentId);
                return children.flatMap(c => [c, ...getDescendantCompanies(c.id)]);
            };
            return [userCompany, ...getDescendantCompanies(userCompany.id)];
        }
        return [];
    }, [userRole, isHoldingAdmin, userCompany, companies]);

    const mySpaces = useMemo(() => {
        if (!currentUser) return [];
        let spaces = collabSpaces;
        
        if (userRole === 'superadmin') {
            if (selectedCompanyId !== 'all') {
                const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
                spaces = spaces.filter(s => s.company === companyName);
            }
        } else if (userRole === 'manajemen') {
            if (isHoldingAdmin) {
                if (selectedCompanyId !== 'all') {
                    const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
                    spaces = spaces.filter(s => s.company === companyName);
                } else {
                    const manageableNames = manageableCompanies.map(c => c.name);
                    spaces = spaces.filter(s => manageableNames.includes(s.company));
                }
            } else {
                spaces = spaces.filter(s => s.company === currentUser.company);
            }
        } else {
            spaces = spaces.filter(s => s.memberIds.includes(currentUser.id));
        }
        
        spaces = spaces.filter(s => s.status === 'active');
        
        if (searchTerm) {
            spaces = spaces.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        
        return spaces.sort((a,b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });
    }, [collabSpaces, currentUser, userRole, searchTerm, selectedCompanyId, companies, isHoldingAdmin, manageableCompanies]);

    const canCreate = userRole === 'superadmin' || userRole === 'manajemen' || employees.some(e => e.reportsTo === currentUser?.id);

    const handleEdit = (space: any) => {
        setSelectedSpace(space);
        setIsFormOpen(true);
    };

    const handleToggleStatus = async (space: any) => {
        const nextStatus = space.status === 'active' ? 'archived' : 'active';
        try {
            await updateCollabSpace(space.id, { status: nextStatus });
            toast({ 
                title: nextStatus === 'archived' ? "Project Selesai" : "Project Diaktifkan", 
                description: `Status ruangan "${space.name}" telah diperbarui.` 
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal Mengubah Status", description: e.message });
        }
    };

    const openDeleteDialog = (space: any) => {
        setSpaceToDelete(space);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!spaceToDelete) return;
        try {
            await deleteCollabSpace(spaceToDelete.id);
            toast({ title: "Ruangan Dihapus", description: `Ruangan "${spaceToDelete.name}" telah dihapus secara permanen.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal Menghapus", description: e.message });
        } finally {
            setSpaceToDelete(null);
            setDeleteDialogOpen(false);
        }
    };

    return (
        <ResponsivePage>
            <PageHeader 
                title="CollabSpace"
                description="Pusat koordinasi dan eksekusi project tim Anda. Kelola tugas harian dan kolaborasi proyek dalam satu wadah."
                icon={LayoutGrid}
                actions={canCreate && (
                    <Button onClick={() => { setSelectedSpace(undefined); setIsFormOpen(true); }} className="font-bold shadow-lg h-9 sm:h-10">
                        <PlusCircle className="mr-2 size-4" />
                        Buat Ruangan Baru
                    </Button>
                )}
            />

            <ResponsiveToolbar>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                        placeholder="Cari ruangan..." 
                        className="pl-9 h-10 border-none bg-background shadow-none focus-visible:ring-primary/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                {showAdminFilters && (
                    <div className="flex items-center gap-2">
                        <Filter className="size-4 text-muted-foreground hidden sm:block shrink-0" />
                        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger className="w-full md:w-[240px] bg-background border-none h-10">
                                <Building className="size-3.5 mr-2 text-primary" />
                                <SelectValue placeholder="Semua Perusahaan" />
                            </SelectTrigger>
                            <SelectContent className="z-[350]">
                                <SelectItem value="all">Semua Ruangan Saya</SelectItem>
                                {manageableCompanies.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </ResponsiveToolbar>

            {mySpaces.length > 0 ? (
                <AdaptiveCardGrid complexity="medium">
                    {mySpaces.map(space => {
                        const style = colorStyles[space.color] || colorStyles['blue-500'];
                        const isCreator = space.creatorId === currentUser?.id || userRole === 'superadmin';

                        return (
                            <Card key={space.id} className={cn("hover:shadow-md transition-all group overflow-hidden border-t-4 flex flex-col bg-background", style.border)}>
                                <CardHeader className={cn("pb-4 shrink-0", style.bg, isMobile ? "p-4" : "p-6")}>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1 min-w-0">
                                            <CardTitle className="text-base sm:text-lg group-hover:text-primary transition-colors truncate font-bold leading-tight">{space.name}</CardTitle>
                                            <div className="flex items-center gap-2 text-[8px] sm:text-[9px] uppercase font-black text-muted-foreground tracking-widest">
                                                <Building className="size-2.5 sm:size-3" />
                                                <span className="truncate">{space.company}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="size-8 rounded-full hover:bg-background/50">
                                                        <MoreHorizontal className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="z-[350]">
                                                    <DropdownMenuLabel className="text-[10px] uppercase font-black opacity-60">Opsi Ruangan</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleEdit(space)}><Pencil className="mr-2 h-4 w-4" /> Ubah Rincian</DropdownMenuItem>
                                                    {isCreator && (
                                                        <DropdownMenuItem onClick={() => handleToggleStatus(space)}>
                                                            {space.status === 'active' ? <><CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Tandai Selesai</> : <><RotateCcw className="mr-2 h-4 w-4 text-blue-600" /> Aktifkan Kembali</>}
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(space)}><Trash2 className="mr-2 h-4 w-4" /> Hapus Ruangan</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <CardDescription className="line-clamp-2 pt-2 text-[10px] sm:text-xs min-h-[35px] sm:min-h-[40px] leading-relaxed">
                                        {space.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className={cn("flex-grow", isMobile ? "p-4" : "p-6")}>
                                    <div className="flex items-center gap-4 text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-tight">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="size-3.5" />
                                            <span>{space.memberIds.length} Anggota</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-muted/5 pt-4 mt-auto border-t p-4">
                                    <Button asChild className="w-full font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-sm rounded-xl h-10 sm:h-11">
                                        <Link href={`/collab-space/${space.id}`}>
                                            Masuk Ruangan <ArrowRight className="ml-2 size-4" />
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </AdaptiveCardGrid>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-muted/10">
                    <div className="p-4 bg-muted rounded-2xl mb-4 opacity-20"><LayoutGrid size={48} /></div>
                    <p className="text-slate-900 font-black uppercase text-[10px] tracking-[0.2em]">Ruangan Kosong</p>
                    <p className="text-xs text-muted-foreground mt-2 max-w-[250px] text-center font-medium">Mulai buat ruangan koordinasi baru untuk tim Anda.</p>
                </div>
            )}

            <CollabSpaceFormSheet isOpen={isFormOpen} onOpenChange={setIsFormOpen} space={selectedSpace} />
            <DeleteConfirmationDialog isOpen={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleDeleteConfirm} itemName={spaceToDelete?.name || ''} itemType="ruangan project" />
        </ResponsivePage>
    );
}
