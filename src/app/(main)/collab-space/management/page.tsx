// src/app/(main)/collab-space/management/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Eye, Pencil, Trash2, LayoutGrid, Search, CheckCircle2, RotateCcw, Filter, Building } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuTrigger,
    DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/master-data/delete-confirmation-dialog';
import { CollabSpaceFormSheet } from '@/components/collab/collab-space-form-sheet';
import Link from 'next/link';
import type { Company } from '@/types';
import { cn } from '@/lib/utils';

export default function CollabSpaceManagementPage() {
    const { collabSpaces, companies, deleteCollabSpace, updateCollabSpace, fetchData } = useMasterData();
    const { currentUser, userRole } = useAuth();
    const { toast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedSpace, setSelectedSpace] = useState<any>(undefined);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [spaceToDelete, setSpaceToDelete] = useState<any>(null);

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

    const filteredSpaces = useMemo(() => {
        let spaces = collabSpaces;
        
        // 1. Scoping by User Role/Holding
        if (userRole === 'manajemen') {
            if (isHoldingAdmin) {
                const managedCompanyNames = manageableCompanies.map(c => c.name);
                spaces = spaces.filter(s => managedCompanyNames.includes(s.company));
            } else {
                spaces = spaces.filter(s => s.company === currentUser?.company);
            }
        } else if (userRole !== 'superadmin') {
            // Non-admin can't manage
            return [];
        }

        // 2. Filter by selected company (if admin/holding)
        if (showAdminFilters && selectedCompanyId !== 'all') {
            const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
            spaces = spaces.filter(s => s.company === companyName);
        }

        // 3. Filter by Search
        if (searchTerm) {
            spaces = spaces.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return spaces.sort((a,b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });
    }, [collabSpaces, userRole, isHoldingAdmin, manageableCompanies, currentUser, searchTerm, companies, selectedCompanyId, showAdminFilters]);

    if (userRole !== 'superadmin' && userRole !== 'manajemen') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Akses Ditolak</CardTitle>
                    <CardDescription>Halaman ini hanya untuk Administrator dan Manajemen.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

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
            toast({ variant: 'destructive', title: "Gagal", description: e.message });
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
            toast({ title: "Berhasil", description: "Ruangan telah dihapus." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal", description: e.message });
        } finally {
            setSpaceToDelete(null);
            setDeleteDialogOpen(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-lg border-t-4 border-primary">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <LayoutGrid className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="font-headline text-2xl">Manajemen Ruangan CollabSpace</CardTitle>
                            <CardDescription>Kelola status dan akses seluruh project ruangan tim Anda.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Cari ruangan..." 
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        {showAdminFilters && (
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
                                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                                    <SelectTrigger className="w-full md:w-[240px] bg-background">
                                        <SelectValue placeholder="Filter Perusahaan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Perusahaan</SelectItem>
                                        {manageableCompanies.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Nama Ruangan</TableHead>
                                    <TableHead>Perusahaan</TableHead>
                                    <TableHead>Pembuat (Creator)</TableHead>
                                    <TableHead>Anggota</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSpaces.length > 0 ? (
                                    filteredSpaces.map(space => (
                                        <TableRow key={space.id}>
                                            <TableCell className="font-bold text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("size-2 rounded-full", space.status === 'active' ? 'bg-green-500' : 'bg-slate-400')} />
                                                    {space.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <Building className="size-3 text-muted-foreground" />
                                                    {space.company}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">{space.creatorName}</TableCell>
                                            <TableCell className="text-xs font-semibold">{space.memberIds.length} Personil</TableCell>
                                            <TableCell>
                                                <Badge variant={space.status === 'active' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                                                    {space.status === 'active' ? 'Aktif' : 'Selesai'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel className="text-[10px] uppercase opacity-60 font-black">Aksi Cepat</DropdownMenuLabel>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/collab-space/${space.id}`} className="flex items-center w-full cursor-pointer">
                                                                <Eye className="mr-2 h-4 w-4" /> Masuk Ruangan
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(space)}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Ubah Rincian
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleToggleStatus(space)}>
                                                            {space.status === 'active' ? <><CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Selesaikan Project</> : <><RotateCcw className="mr-2 h-4 w-4 text-blue-600" /> Aktifkan Kembali</>}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(space)}>
                                                            <Trash2 className="mr-2 h-4 w-4" /> Hapus Ruangan
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            Tidak ada ruangan yang ditemukan.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

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
