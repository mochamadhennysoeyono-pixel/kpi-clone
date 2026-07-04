// src/app/(main)/master-data/positions/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, Briefcase, ChevronDown, Trash2 } from "lucide-react";
import type { Position, Company, Department } from "@/types";
import { PositionFormDialog } from "@/components/master-data/positions/position-form-dialog";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useMasterData } from "@/contexts/master-data-context";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PositionsPage() {
  const { positions, addPosition, updatePosition, deletePositions, companies, departments } = useMasterData();
  const { currentUser, userRole } = useAuth();
  
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [positionsToDelete, setPositionsToDelete] = useState<Position[] | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const { toast } = useToast();
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');

  const userCompany = useMemo(() => {
    return companies.find(c => c.name === currentUser?.company);
  }, [companies, currentUser]);

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') {
      return companies;
    }
    if (!userCompany) return [];
    
    if (userCompany.isHolding) {
      const getChildCompanies = (parentId: string): Company[] => {
        const children = companies.filter(c => c.parentId === parentId);
        return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
      };
      return [userCompany, ...getChildCompanies(userCompany.id)];
    }
    return [userCompany];
  }, [userRole, companies, userCompany]);
  
  const manageableCompanyNames = useMemo(() => manageableCompanies.map(c => c.name), [manageableCompanies]);

  const filteredPositions = useMemo(() => {
    let pos = positions.filter(p => manageableCompanyNames.includes(p.company));
    
    if (selectedCompanyFilter !== 'all') {
      pos = pos.filter(p => p.company === selectedCompanyFilter);
    }
    
    return pos;
  }, [positions, manageableCompanyNames, selectedCompanyFilter]);

  useEffect(() => {
    if (userRole !== 'superadmin' && manageableCompanies.length > 1) {
      setSelectedCompanyFilter('all');
    } else if (userRole !== 'superadmin' && manageableCompanies.length === 1) {
      setSelectedCompanyFilter(manageableCompanies[0].name);
    }
  }, [userRole, manageableCompanies]);

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedRowIds(filteredPositions.map(p => p.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleRowSelect = (rowId: string) => {
    setSelectedRowIds(prev =>
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  };

  const openBulkDeleteDialog = () => {
    const itemsToDelete = positions.filter(p => selectedRowIds.includes(p.id));
    setPositionsToDelete(itemsToDelete);
    setDeleteDialogOpen(true);
  };

  const handleAddItem = () => {
    setSelectedPosition(undefined);
    setDialogOpen(true);
  };

  const handleEditItem = (item: Position) => {
    setSelectedPosition(item);
    setDialogOpen(true);
  };

  const handleSaveItem = async (data: Omit<Position, 'id'>) => {
     if (!data.company || !data.department) {
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Perusahaan dan departemen harus dipilih." });
        return;
    }

    if (selectedPosition) {
      await updatePosition(selectedPosition.id, data);
    } else {
      await addPosition(data);
    }
  };

  const openDeleteDialog = (item: Position) => {
    setPositionsToDelete([item]);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (positionsToDelete && positionsToDelete.length > 0) {
      const idsToDelete = positionsToDelete.map(p => p.id);
      await deletePositions(idsToDelete);
      toast({ title: "Data Dihapus", description: `${idsToDelete.length} data jabatan telah berhasil dihapus.` });
      setPositionsToDelete(null);
      setSelectedRowIds([]);
    }
  };

  const canShowCompanyFilter = manageableCompanies.length > 1;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg mb-6 overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground dark:bg-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="font-headline text-lg sm:text-xl">Data Jabatan</CardTitle>
              <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground text-xs sm:text-sm">
                Kelola daftar jabatan di perusahaan Anda. Menampilkan {filteredPositions.length} data.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
                {selectedRowIds.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1 bg-background/20 text-primary-foreground hover:bg-background/30 dark:bg-muted dark:text-foreground dark:hover:bg-muted/80">
                                Aksi Massal ({selectedRowIds.length})
                                <ChevronDown className="ml-1 h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Pilih Aksi</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive font-bold" onClick={openBulkDeleteDialog}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus Pilihan
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                <Button size="sm" className="h-9 gap-1 font-bold shadow-md" onClick={handleAddItem}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Tambah Jabatan
                  </span>
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {canShowCompanyFilter && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/30 max-w-xs">
              <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter Perusahaan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Perusahaan</SelectItem>
                  {manageableCompanies.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead padding="checkbox" className="w-[40px]">
                    <Checkbox
                        checked={selectedRowIds.length > 0 && filteredPositions.length > 0 && selectedRowIds.length === filteredPositions.length}
                        onCheckedChange={(checked) => handleSelectAll(checked)}
                        aria-label="Pilih semua"
                    />
                </TableHead>
                <TableHead>Nama Jabatan</TableHead>
                <TableHead>Departemen</TableHead>
                {canShowCompanyFilter && <TableHead>Perusahaan</TableHead>}
                <TableHead>
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPositions.map((position) => (
                <TableRow key={position.id} data-state={selectedRowIds.includes(position.id) && "selected"}>
                  <TableCell padding="checkbox">
                        <Checkbox
                            checked={selectedRowIds.includes(position.id)}
                            onCheckedChange={() => handleRowSelect(position.id)}
                            aria-label={`Pilih ${position.name}`}
                        />
                  </TableCell>
                  <TableCell className="font-medium py-4">
                     <div className="flex items-center gap-3">
                      <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-xl bg-primary/5 text-primary border border-primary/10">
                        <Briefcase className="h-5 w-5" />
                      </div>
                       <span className="text-slate-900 font-bold">{position.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{position.department}</TableCell>
                   {canShowCompanyFilter && <TableCell className="text-sm text-slate-600">{position.company}</TableCell>}
                  <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost" className="rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Buka menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase opacity-60">Opsi Jabatan</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditItem(position)}>Ubah Detail</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(position)}>Hapus Jabatan</DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PositionFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveItem}
        position={selectedPosition}
        companies={manageableCompanies}
        departments={departments}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={positionsToDelete?.length === 1 ? positionsToDelete[0].name : `${positionsToDelete?.length} item`}
        itemType="jabatan"
      />
    </div>
  );
}
