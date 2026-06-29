// src/app/(main)/okr/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Target, ListChecks, Calendar, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
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


const OkrCard = ({ okr, onEdit, onDelete }: { okr: OKR, onEdit: (okr: OKR) => void, onDelete: (okr: OKR) => void }) => {
    const getStatusVariant = (status: OKR['status']) => {
        switch (status) {
            case 'Active': return 'default';
            case 'Completed': return 'secondary';
            case 'Waiting for Approval': return 'outline';
            case 'Overdue': return 'destructive';
            default: return 'outline';
        }
    };

    const formatDate = (date: any): Date | null => {
        if (!date) return null;
        if (date && typeof date.toDate === 'function') {
            return date.toDate();
        }
        try {
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) return null;
            return parsedDate;
        } catch (e) {
            return null;
        }
    };

    const startDate = formatDate(okr.startDate);
    const endDate = formatDate(okr.endDate);
    const progressValue = okr.progress ?? 0;

    return (
        <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 space-y-1">
                        <Link href={`/okr/${okr.id}`} className="hover:underline">
                            <CardTitle className="text-base font-semibold">{okr.objective}</CardTitle>
                        </Link>
                        <CardDescription className="text-xs !mt-2">
                            {okr.ownerName}
                        </CardDescription>
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Aksi</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(okr)}>
                                <Edit className="mr-2 h-4 w-4"/> Ubah
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(okr)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4"/> Hapus
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                </div>
            </CardHeader>
            <Link href={`/okr/${okr.id}`} className="flex-grow flex flex-col">
                 <CardContent className="flex-grow">
                     <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Progres</span>
                            <span className="font-bold text-primary">{progressValue.toFixed(0)}%</span>
                        </div>
                        <Progress value={progressValue} />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ListChecks className="h-4 w-4" />
                            <span>{okr.keyResults.length} Key Results</span>
                        </div>
                     </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground border-t pt-3 mt-auto">
                    <div className="flex items-center justify-between w-full">
                         <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                                {endDate ? format(endDate, "d MMM yyyy", { locale: localeId }) : 'N/A'}
                            </span>
                        </div>
                        <Badge variant={getStatusVariant(okr.status)}>{okr.status}</Badge>
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
  const [okrToDelete, setOkrToDelete] = useState<OKR | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
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
    if (userCompany) return [userCompany];
    return [];
  }, [userRole, isHoldingAdmin, userCompany, companies]);

  useEffect(() => {
    if (showCompanyFilter && manageableCompanies.length > 0) {
    } else if (!showCompanyFilter && currentUser?.company) {
      setSelectedCompany(currentUser.company);
    }
  }, [showCompanyFilter, manageableCompanies, currentUser]);

  const myOkrs = useMemo(() => {
    if (!currentUser || !okrs || !employees) return [];
  
    let companyFilteredOkrs = okrs;
    if (showCompanyFilter) {
      if (selectedCompany !== 'all') {
        companyFilteredOkrs = okrs.filter(okr => okr.company === selectedCompany);
      } else {
        const manageableCompanyNames = manageableCompanies.map(c => c.name);
        companyFilteredOkrs = okrs.filter(okr => manageableCompanyNames.includes(okr.company));
      }
    } else {
      companyFilteredOkrs = okrs.filter(okr => okr.company === currentUser.company);
    }
  
    if (userRole === 'superadmin' || userRole === 'manajemen') {
        return companyFilteredOkrs;
    }
  
    if (userRole === 'user') {
      const isManager = employees.some(e => e.reportsTo === currentUser.id);

      if (isManager) {
        const getSubordinateIdsRecursive = (managerId: string): string[] => {
            const directReports = employees.filter(e => e.reportsTo === managerId).map(e => e.id);
            if (directReports.length === 0) return [];
            return [...directReports, ...directReports.flatMap(id => getSubordinateIdsRecursive(id))];
        };
        const teamIds = [currentUser.id, ...getSubordinateIdsRecursive(currentUser.id)];
        return companyFilteredOkrs.filter(okr => teamIds.includes(okr.ownerId));
      } else {
         return companyFilteredOkrs.filter(okr => okr.ownerId === currentUser.id);
      }
    }
  
    return [];
  }, [okrs, currentUser, userRole, employees, selectedCompany, showCompanyFilter, manageableCompanies]);

  
  const filteredOkrs = useMemo(() => {
    if (activeTab === 'all') return myOkrs;
    return myOkrs.filter(okr => okr.status === activeTab);
  }, [myOkrs, activeTab]);

  const handleEdit = (okr: OKR) => {
    router.push(`/okr/${okr.id}?edit=true`);
  };

  const openDeleteDialog = (okr: OKR) => {
    setOkrToDelete(okr);
    setDeleteDialogOpen(true);
  };
  
  const handleDelete = async () => {
    if (okrToDelete) {
        await deleteOkr(okrToDelete.id);
        toast({ title: "Objective Dihapus", description: `Objective "${okrToDelete.objective}" telah dihapus.` });
        setOkrToDelete(null);
    }
  };

  return (
    <>
        <div className="space-y-6">
        <Card className="shadow-lg border-t-4 border-primary">
            <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="font-headline text-2xl">Workspace OKR</CardTitle>
                        <CardDescription>
                            Tinjau dan kelola semua Objectives and Key Results (OKR) Anda dan tim Anda.
                        </CardDescription>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                    {showCompanyFilter && (
                        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter Perusahaan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Perusahaan</SelectItem>
                                {manageableCompanies.map(c => (
                                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Link href="/okr/new">
                        <Button className="shadow-md"><PlusCircle className="mr-2 h-4 w-4"/>Buat OKR Baru</Button>
                    </Link>
                </div>
            </CardHeader>
        </Card>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="Draft">Draf</TabsTrigger>
            <TabsTrigger value="Active">Aktif</TabsTrigger>
            <TabsTrigger value="Completed">Selesai</TabsTrigger>
            <TabsTrigger value="Overdue">Terlambat</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
                {filteredOkrs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredOkrs.map(okr => (
                            <OkrCard key={okr.id} okr={okr} onEdit={handleEdit} onDelete={openDeleteDialog} />
                        ))}
                    </div>
                ) : (
                    <Card className="col-span-full border-dashed">
                        <CardContent className="p-10 text-center text-muted-foreground">
                            Tidak ada OKR dengan status "{activeTab.toLowerCase()}" yang ditemukan.
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
        </Tabs>
        </div>
         <DeleteConfirmationDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={handleDelete}
            itemName={okrToDelete?.objective || ''}
            itemType="Objective"
        />
    </>
  );
}
