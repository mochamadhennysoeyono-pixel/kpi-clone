
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
        
        // 1. Visibilitas dasar (Implementasi God View)
        if (userRole === 'superadmin') {
            // Superadmin can see all spaces within the filter
            if (selectedCompanyId !== 'all') {
                const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
                spaces = spaces.filter(s => s.company === companyName);
            }
        } else if (userRole === 'manajemen') {
            // "God View" for Management role
            if (isHoldingAdmin) {
                if (selectedCompanyId !== 'all') {
                    const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
                    spaces = spaces.filter(s => s.company === companyName);
                } else {
                    // Holding admin sees ALL spaces in their managed group companies
                    const manageableNames = manageableCompanies.map(c => c.name);
                    spaces = spaces.filter(s => manageableNames.includes(s.company));
                }
            } else {
                // Regular company admin sees ALL spaces in their company
                spaces = spaces.filter(s => s.company === currentUser.company);
            }
        } else {
            // Regular user only sees where they are an explicit member
            spaces = spaces.filter(s => s.memberIds.includes(currentUser.id));
        }
        
        // 2. Filter Status: Hanya tampilkan yang AKTIF di halaman ini
        spaces = spaces.filter(s => s.status === 'active');
        
        // 3. Filter Pencarian
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
        <div className="space-y-6">
            <Card className="shadow-lg border-t-4 border-primary">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <LayoutGrid className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="font-headline text-2xl">CollabSpace</CardTitle>
                                <CardDescription>
                                    Pusat koordinasi dan eksekusi project tim Anda.
                                </CardDescription>
                            </div>
                        </div>
                        {canCreate && (
                            <Button onClick={() => { setSelectedSpace(undefined); setIsFormOpen(true); }} className="shadow-md">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Buat Ruangan Baru
                            </Button>
                        )}
                    </div>
                </CardHeader>
            </Card>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Cari ruangan..." 
                        className="pl-9 bg-background shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                {showAdminFilters && (
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
                        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger className="w-full md:w-[240px] bg-background shadow-sm">
                                <SelectValue placeholder="Filter Perusahaan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Ruangan Saya</SelectItem>
                                {manageableCompanies.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {mySpaces.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {mySpaces.map(space => {
                        const style = colorStyles[space.color] || colorStyles['blue-500'];
                        const isCreator = space.creatorId === currentUser?.id || userRole === 'superadmin';

                        return (
                            <Card key={space.id} className={cn("hover:shadow-md transition-all group overflow-hidden border-t-4 flex flex-col", style.border)}>
                                <CardHeader className={cn("pb-4 shrink-0", style.bg)}>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1 min-w-0">
                                            <CardTitle className="text-lg group-hover:text-primary transition-colors truncate">{space.name}</CardTitle>
                                            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground">
                                                <Building className="h-3 w-3" />
                                                <span className="truncate">{space.company}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel className="text-[10px] uppercase font-black opacity-60">Opsi Ruangan</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleEdit(space)}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Ubah Rincian
                                                    </DropdownMenuItem>
                                                    
                                                    {isCreator && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleToggleStatus(space)}>
                                                                {space.status === 'active' ? (
                                                                    <><CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Tandai Selesai</>
                                                                ) : (
                                                                    <><RotateCcw className="mr-2 h-4 w-4 text-blue-600" /> Aktifkan Kembali</>
                                                                )}
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}

                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(space)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Hapus Ruangan
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <CardDescription className="line-clamp-2 pt-2 text-xs min-h-[40px]">
                                        {space.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4 flex-grow">
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-semibold">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5" />
                                            <span>{space.memberIds.length} Anggota Tim</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-muted/30 pt-4 mt-auto">
                                    <Button asChild className="w-full font-bold shadow-sm rounded-xl">
                                        <Link href={`/collab-space/${space.id}`}>
                                            Masuk Ruangan <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="border-dashed">
                    <CardContent className="p-16 text-center text-muted-foreground">
                        <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                            <LayoutGrid className="h-8 w-8 opacity-20" />
                        </div>
                        <p className="font-bold text-foreground/70">Tidak ada project aktif ditemukan.</p>
                        <p className="text-sm mt-1">Mulai buat ruangan koordinasi baru atau sesuaikan filter pencarian Anda.</p>
                    </CardContent>
                </Card>
            )}

            <CollabSpaceFormSheet 
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                space={selectedSpace}
            />

            <DeleteConfirmationDialog 
                isOpen={isDeleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteConfirm}
                itemName={spaceToDelete?.name || ''}
                itemType="ruangan project"
            />
        </div>
    );
}
