// src/app/(main)/master-data/company-objectives/page.tsx
"use client";

import * as React from "react";
import {
  PlusCircle,
  MoreHorizontal,
  Target,
  Trash2,
  Search,
  Filter,
  Building,
  Pencil,
} from "lucide-react";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import type { CompanyObjective, Company } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { ObjectiveFormSheet } from "@/components/master-data/company-objectives/objective-form-sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function CompanyObjectivesPage() {
  const { companyObjectives, addCompanyObjective, updateCompanyObjective, deleteCompanyObjectives, companies } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();

  const [isSheetOpen, setSheetOpen] = React.useState(false);
  const [selectedObjective, setSelectedObjective] = React.useState<CompanyObjective | undefined>(undefined);
  const [objectiveToDelete, setObjectiveToDelete] = React.useState<CompanyObjective | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = React.useState<string>("all");

  const manageableCompanies = React.useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    if (currentUser?.company) {
      const userCompany = companies.find(c => c.name === currentUser.company);
      if (!userCompany) return [];
      if (userCompany.isHolding) {
        const getChildCompanies = (parentId: string): Company[] => {
          const children = companies.filter(c => c.parentId === parentId);
          return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
        };
        return [userCompany, ...getChildCompanies(userCompany.id)];
      }
      return [userCompany];
    }
    return [];
  }, [companies, currentUser, userRole]);

  React.useEffect(() => {
    if (userRole !== 'superadmin' && manageableCompanies.length === 1) {
        setSelectedCompanyFilter(manageableCompanies[0].name);
    }
  }, [userRole, manageableCompanies]);

  const filteredObjectives = React.useMemo(() => {
    if (!companyObjectives) return [];
    let result = companyObjectives;
    
    if (selectedCompanyFilter !== 'all') {
        result = result.filter(obj => obj.company === selectedCompanyFilter);
    } else if (userRole !== 'superadmin') {
        const manageableCompanyNames = manageableCompanies.map(c => c.name);
        result = result.filter(obj => manageableCompanyNames.includes(obj.company));
    }

    if (searchTerm) {
        result = result.filter(obj => obj.objectiveName.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return result;
  }, [companyObjectives, selectedCompanyFilter, userRole, manageableCompanies, searchTerm]);

  const handleAddItem = () => {
    setSelectedObjective(undefined);
    setSheetOpen(true);
  };

  const handleEditItem = (objective: CompanyObjective) => {
    setSelectedObjective(objective);
    setSheetOpen(true);
  };

  const openDeleteDialog = (objective: CompanyObjective) => {
    setObjectiveToDelete(objective);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!objectiveToDelete) return;
    await deleteCompanyObjectives([objectiveToDelete.id]);
    toast({ title: "Objective Dihapus" });
    setObjectiveToDelete(null);
  };

  const handleSave = async (data: { company: string; period: string; objectives: (Omit<CompanyObjective, 'id' | 'company' | 'period'> & {id?: string})[] }) => {
    const { company, period, objectives } = data;
    let successCount = 0;

    for (const obj of objectives) {
      const objectiveData = {
        objectiveName: obj.objectiveName,
        bscPerspective: obj.bscPerspective,
        strategicFocus: obj.strategicFocus,
        company,
        period,
      };

      try {
        if (obj.id) {
          await updateCompanyObjective(obj.id, objectiveData);
        } else {
          await addCompanyObjective(objectiveData);
        }
        successCount++;
      } catch (e: any) {
        toast({ variant: "destructive", title: `Gagal Menyimpan "${obj.objectiveName}"`, description: e.message });
      }
    }

    if (successCount > 0) {
      toast({ title: `${successCount} Objective Berhasil Disimpan` });
    }
  };

  const showCompanyFilter = userRole === 'superadmin' || (userRole === 'manajemen' && !!companies.find(c => c.name === currentUser?.company)?.isHolding);

  return (
    <ResponsivePage>
      <PageHeader 
        title="Objective Perusahaan"
        description="Definisikan tujuan strategis utama sebagai landasan AI dalam merancang KPI."
        icon={Target}
        actions={
          <Button onClick={handleAddItem} className="font-bold shadow-lg h-9 sm:h-10">
            <PlusCircle className="size-4" />
            Tambah Objective
          </Button>
        }
      />

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Cari objective..." 
            className="pl-9 h-10 border-none shadow-none bg-background/50 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {showCompanyFilter && (
            <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                <SelectTrigger className="w-full sm:w-[220px] h-10 bg-background border-none">
                    <Building className="size-4 mr-2 text-primary" />
                    <SelectValue placeholder="Pilih Perusahaan" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Perusahaan</SelectItem>
                    {manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
        )}
      </ResponsiveToolbar>

      <AdaptiveTable 
        data={filteredObjectives}
        keyExtractor={(o) => o.id}
        columns={[
          {
            header: "Objective",
            cell: (o) => (
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0 mt-0.5">
                  <Target className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 leading-tight mb-1">{o.objectiveName}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[9px] font-black uppercase h-5 border-none bg-muted/50">{o.period}</Badge>
                    {userRole === 'superadmin' && <Badge variant="secondary" className="text-[9px] font-black uppercase h-5">{o.company}</Badge>}
                  </div>
                </div>
              </div>
            )
          },
          {
            header: "Perspektif BSC",
            cell: (o) => <Badge variant="outline" className="text-[10px] font-bold uppercase">{o.bscPerspective}</Badge>
          },
          {
            header: "Fokus Strategis",
            cell: (o) => <Badge variant="secondary" className="text-[10px] font-black uppercase">{o.strategicFocus}</Badge>
          },
          {
            header: "",
            className: "text-right",
            cell: (o) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditItem(o)}><Pencil className="size-3.5 mr-2" />Ubah</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(o)}><Trash2 className="size-3.5 mr-2" />Hapus</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
        ]}
        renderMobileCard={(o) => (
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-start gap-3">
                    <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                        <Target size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-foreground leading-snug">{o.objectiveName}</h3>
                        <p className="text-[9px] text-muted-foreground font-black uppercase mt-1">Periode: {o.period}</p>
                    </div>
                    <Badge variant="outline" className="text-[8px] h-4 font-black uppercase bg-muted/30 border-none shrink-0">{o.strategicFocus}</Badge>
                </div>
                <div className="pt-3 border-t">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Perspektif BSC</p>
                    <Badge variant="secondary" className="text-[9px] font-black h-5 w-full justify-center">{o.bscPerspective}</Badge>
                </div>
                <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 font-bold text-[10px] h-8" onClick={() => handleEditItem(o)}>UBAH</Button>
                    <Button variant="ghost" size="sm" className="flex-1 font-bold text-[10px] h-8 text-destructive" onClick={() => openDeleteDialog(o)}>HAPUS</Button>
                </div>
            </CardContent>
          </Card>
        )}
      />

      <ObjectiveFormSheet 
        isOpen={isSheetOpen}
        onOpenChange={setSheetOpen}
        objective={selectedObjective}
        onSave={handleSave}
       />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={objectiveToDelete?.objectiveName || ''}
        itemType="objective perusahaan"
      />
    </ResponsivePage>
  );
}
