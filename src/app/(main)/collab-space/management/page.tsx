// src/app/(main)/collab-space/management/page.tsx
"use client";

import { useState, useMemo } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Eye, Pencil, Trash2, LayoutGrid, Search, CheckCircle2, RotateCcw, Filter, Building, User } from 'lucide-react';
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
import { ResponsivePage, ResponsiveToolbar } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AdaptiveTable } from '@/components/ui/adaptive-table';

export default function CollabSpaceManagementPage() {
    const { collabSpaces, companies, deleteCollabSpace, updateCollabSpace } = useMasterData();
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
        if (userRole === 'manajemen') {
            if (isHoldingAdmin) {
                const managedCompanyNames = manageableCompanies.map(c => c.name);
                spaces = spaces.filter(s => managedCompanyNames.includes(s.company));
            } else {
                spaces = spaces.filter(s => s.company === currentUser?.company);
            }
        } else if (userRole !== 'superadmin') return [];

        if (showAdminFilters && selectedCompanyId !== 'all') {
            const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
            spaces = spaces.filter(s => s.company === companyName);
        }

        if (searchTerm) {
            spaces = spaces.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return spaces.sort((a,b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
    }, [collabSpaces, userRole, isHoldingAdmin, manageableCompanies, currentUser, searchTerm, companies, selectedCompanyId, showAdminFilters]);

    const handleEdit = (space: any) => {
        setSelectedSpace(space);
        setIsFormOpen(true);
    };

    const handleToggleStatus = async (space: any) => {
        const nextStatus = space.status === 'active' ? 'archived' : 'active';
        try {
            await updateCollabSpace(space.id, { status: nextStatus });
            toast({ title: nextStatus === 'archived' ? "Project Selesai" : "Project Diaktifkan", description: `Status "${space.name}" telah diperbarui.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal", description: e.message });
        }
    };

    if (userRole !== 'superadmin' && userRole !== 'manajemen') return <div className="p-20 text-center font-bold">Akses Ditolak.</div>;

    return (
        <ResponsivePage>
            <PageHeader 
                title="Manajemen Ruangan"
                description="Kelola status operasional, akses anggota, dan pengarsipan seluruh project CollabSpace."
                icon={LayoutGrid}
            />

            <ResponsiveToolbar>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="Cari ruangan..." className="pl-9 h-10 border-none bg-background shadow-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                {showAdminFilters && (
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger className="w-full md:w-[240px] bg-background border-none h-10">
                            <Building className="size-4 mr-2 text-primary" />
                            <SelectValue placeholder="Semua Perusahaan" />
                        </SelectTrigger>
                        <SelectContent className="z-[350]">
                            <SelectItem value="all">Semua Unit Bisnis</SelectItem>
                            {manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
            </ResponsiveToolbar>

            <AdaptiveTable 
                data={filteredSpaces}
                keyExtractor={(s) => s.id}
                columns={[
                    { header: "Nama Ruangan", cell: (s) => (
                        <div className="flex items-center gap-3">
                            <div className={cn("size-2 rounded-full shrink-0", s.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-400')} />
                            <span className="font-bold text-slate-900">{s.name}</span>
                        </div>
                    )},
                    { header: "Perusahaan", cell: (s) => <div className="flex items-center gap-2 text-xs font-medium text-slate-600"><Building size={14} className="opacity-40" />{s.company}</div> },
                    { header: "Kreator", cell: (s) => <div className="flex items-center gap-2 text-xs text-slate-600"><User size={14} className="opacity-40" />{s.creatorName}</div> },
                    { header: "Status", cell: (s) => <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="text-[9px] font-black uppercase h-5">{s.status === 'active' ? 'Aktif' : 'Selesai'}</Badge> },
                    { header: "", className: "text-right", cell: (s) => (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal size={18}/></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-[350]">
                                <DropdownMenuItem asChild><Link href={`/collab-space/${s.id}`} className="cursor-pointer"><Eye className="mr-2 h-4 w-4" /> Masuk Ruangan</Link></DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(s)}><Pencil className="mr-2 h-4 w-4" /> Ubah Detail</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(s)}>{s.status === 'active' ? <><CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Selesaikan</> : <><RotateCcw className="mr-2 h-4 w-4 text-blue-600" /> Aktifkan</>}</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive font-bold" onClick={() => { setSpaceToDelete(s); setDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" /> Hapus</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                ]}
                renderMobileCard={(s) => (
                    <Card className="border-border/40 shadow-sm overflow-hidden">
                        <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0">
                                    <h3 className="font-black text-sm uppercase truncate text-slate-900">{s.name}</h3>
                                    <p className="text-[10px] text-muted-foreground font-bold">{s.company}</p>
                                </div>
                                <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="text-[8px] h-5 font-black uppercase">{s.status}</Badge>
                            </div>
                            <div className="flex items-center gap-2 pt-3 border-t text-[10px] font-bold text-muted-foreground">
                                <User size={12} /> Kreator: <span className="text-foreground">{s.creatorName}</span>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <Button asChild variant="outline" size="sm" className="flex-1 font-bold text-[10px] h-9"><Link href={`/collab-space/${s.id}`}>MASUK</Link></Button>
                                <Button variant="ghost" size="sm" className="flex-1 font-bold text-[10px] h-9" onClick={() => handleEdit(s)}>UBAH</Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => { setSpaceToDelete(s); setDeleteDialogOpen(true); }}><Trash2 size={16}/></Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            />

            <CollabSpaceFormSheet isOpen={isFormOpen} onOpenChange={setIsFormOpen} space={selectedSpace} />
            <DeleteConfirmationDialog isOpen={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={async () => { await deleteCollabSpace(spaceToDelete.id); setSpaceToDelete(null); }} itemName={spaceToDelete?.name || ''} itemType="ruangan project" />
        </ResponsivePage>
    );
}
