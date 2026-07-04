
// src/app/(main)/master-data/positions/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  PlusCircle,
  MoreHorizontal,
  Briefcase,
  Trash2,
  Search,
  Building,
  Filter,
  Pencil,
  Network,
} from "lucide-react";
import type { Position, Company, Department } from "@/types";
import { PositionFormDialog } from "@/components/master-data/positions/position-form-dialog";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useMasterData } from "@/contexts/master-data-context";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { 
    ResponsivePage, 
    ResponsiveToolbar 
} from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export default function PositionsPage() {
  const { positions, addPosition, updatePosition, deletePositions, companies, departments } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();
  
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState<Position | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    const userCompany = companies.find(c => c.name === currentUser?.company);
    if (!userCompany) return [];
    if (userCompany.isHolding) {
      const getChildren = (id: string): Company[] => {
        const childs = companies.filter(c => c.parentId === id);
        return [...childs, ...childs.flatMap(c => getChildren(c.id))];
      };
      return [userCompany, ...getChildren(userCompany.id)].filter(c => c.status === 'Aktif');
    }
    return [userCompany];
  }, [userRole, companies, currentUser]);

  const filteredPositions = useMemo(() => {
    const manageableNames = new Set(manageableCompanies.map(c => c.name));
    return positions.filter(p => 
        manageableNames.has(p.company) &&
        (selectedCompanyFilter === 'all' || p.company === selectedCompanyFilter) &&
        (p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a,b) => a.name.localeCompare(b.name));
  }, [positions, manageableCompanies, selectedCompanyFilter, searchTerm]);

  const handleSaveItem = async (data: Omit<Position, 'id'>) => {
    if (selectedPosition) {
      await updatePosition(selectedPosition.id, data);
    } else {
      await addPosition(data);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (positionToDelete) {
      await deletePositions([positionToDelete.id]);
      setPositionToDelete(null);
    }
  };

  return (
    <ResponsivePage>
      <PageHeader 
        title="Daftar Jabatan"
        description="Kelola seluruh tingkat jabatan dan penempatan departemen di seluruh unit bisnis."
        icon={Briefcase}
        actions={
          <Button onClick={() => { setSelectedPosition(undefined); setDialogOpen(true); }} className="font-bold shadow-lg h-9 sm:h-10">
            <PlusCircle className="size-4" />
            Tambah Jabatan
          </Button>
        }
      />

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Cari jabatan..." 
            className="pl-9 h-10 border-none shadow-none bg-background/50 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background border-none">
                    <Building className="size-4 mr-2 text-primary" />
                    <SelectValue placeholder="Perusahaan" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Perusahaan</SelectItem>
                    {manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </ResponsiveToolbar>

      <AdaptiveTable 
        data={filteredPositions}
        keyExtractor={(p) => p.id}
        columns={[
          {
            header: "Jabatan",
            cell: (p) => (
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                  <Briefcase className="size-5" />
                </div>
                <span className="font-bold text-slate-900">{p.name}</span>
              </div>
            )
          },
          {
             header: "Departemen",
             cell: (p) => (
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <Network size={14} className="opacity-50" />
                    {p.department}
                </div>
             )
          },
          {
             header: "Perusahaan",
             accessorKey: "company",
             className: "text-slate-500 text-xs",
          },
          {
            header: "",
            className: "text-right",
            cell: (p) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setSelectedPosition(p); setDialogOpen(true); }}>
                    <Pencil className="size-3.5 mr-2" /> Ubah Detail
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive font-bold" onClick={() => { setPositionToDelete(p); setDeleteDialogOpen(true); }}>
                    <Trash2 className="size-3.5 mr-2" /> Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
        ]}
        renderMobileCard={(p) => (
          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                            <Briefcase size={20} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-sm uppercase truncate">{p.name}</h3>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                                <Network size={10} /> {p.department}
                            </p>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedPosition(p); setDialogOpen(true); }}>Ubah</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive font-bold" onClick={() => { setPositionToDelete(p); setDeleteDialogOpen(true); }}>Hapus</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="pt-2 border-t">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Perusahaan</p>
                    <p className="text-xs font-bold text-foreground/80">{p.company}</p>
                </div>
            </CardContent>
          </Card>
        )}
      />

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
        itemName={positionToDelete?.name || ''}
        itemType="jabatan"
      />
    </ResponsivePage>
  );
}
