// src/app/(main)/master-data/company-objectives/page.tsx
"use client";

import * as React from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, Target, Trash2 } from "lucide-react";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import type { CompanyObjective, Company } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { ObjectiveFormSheet } from "@/components/master-data/company-objectives/objective-form-sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function CompanyObjectivesPage() {
  const { companyObjectives, addCompanyObjective, updateCompanyObjective, deleteCompanyObjectives, companies } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();

  const [isSheetOpen, setSheetOpen] = React.useState(false);
  const [selectedObjective, setSelectedObjective] = React.useState<CompanyObjective | undefined>(undefined);
  const [objectiveToDelete, setObjectiveToDelete] = React.useState<CompanyObjective | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
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
    let objectives = companyObjectives;
    if (selectedCompanyFilter !== 'all') {
        objectives = objectives.filter(obj => obj.company === selectedCompanyFilter);
    } else if (userRole !== 'superadmin') {
        const manageableCompanyNames = manageableCompanies.map(c => c.name);
        objectives = objectives.filter(obj => manageableCompanyNames.includes(obj.company));
    }
    return objectives;
  }, [companyObjectives, selectedCompanyFilter, userRole, manageableCompanies]);

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
    let errorCount = 0;

    for (const obj of objectives) {
      const objectiveData = {
        objectiveName: obj.objectiveName,
        bscPerspective: obj.bscPerspective,
        strategicFocus: obj.strategicFocus,
        company,
        period,
      };

      const isEditing = !!obj.id;

      try {
        if (isEditing) {
          await updateCompanyObjective(obj.id!, objectiveData);
        } else {
          await addCompanyObjective(objectiveData);
        }
        successCount++;
      } catch (e: any) {
        errorCount++;
        toast({ variant: "destructive", title: `Gagal Menyimpan "${obj.objectiveName}"`, description: e.message });
      }
    }

    if (successCount > 0) {
      toast({ title: `${successCount} Objective Berhasil Disimpan` });
    }
  };

  const showCompanyFilter = userRole === 'superadmin' || (userRole === 'manajemen' && !!companies.find(c => c.name === currentUser?.company)?.isHolding);

  return (
    <>
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <Target className="h-6 w-6"/>
                        Objective Perusahaan
                    </CardTitle>
                    <CardDescription>
                        Definisikan tujuan strategis utama sebagai landasan AI dalam merancang KPI.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                    {showCompanyFilter && (
                         <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="Filter Perusahaan"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Perusahaan</SelectItem>
                                {manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                         </Select>
                    )}
                    <Button onClick={handleAddItem}><PlusCircle className="mr-2 h-4 w-4"/> Tambah Objective</Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Objective</TableHead>
                <TableHead>Perspektif BSC</TableHead>
                <TableHead>Fokus Strategis</TableHead>
                {userRole === 'superadmin' && <TableHead>Perusahaan</TableHead>}
                <TableHead><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredObjectives.length > 0 ? (
                filteredObjectives.map((obj) => (
                  <TableRow key={obj.id}>
                    <TableCell className="font-medium max-w-sm">{obj.objectiveName}</TableCell>
                    <TableCell><Badge variant="outline">{obj.bscPerspective}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{obj.strategicFocus}</Badge></TableCell>
                    {userRole === 'superadmin' && <TableCell>{obj.company}</TableCell>}
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Aksi</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditItem(obj)}>Ubah</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(obj)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={userRole === 'superadmin' ? 5 : 4} className="h-24 text-center">
                        Belum ada objective yang ditetapkan.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
    </>
  );
}
