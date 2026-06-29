// src/app/(main)/lms/admin/quizzes/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, FileQuestion, MoreHorizontal, Copy, Trash2, ChevronDown } from "lucide-react";
import type { Company, LmsQuiz } from "@/types";
import { QuizFormSheet } from "@/components/lms/quiz-form-sheet";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";


export default function LmsAdminQuizzesPage() {
  const { quizzes, addQuiz, updateQuiz, deleteQuiz, companies } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<LmsQuiz | undefined>(undefined);
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quizzesToDelete, setQuizzesToDelete] = useState<LmsQuiz[] | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');


  const userCompany = useMemo(() => {
    return companies.find(c => c.name === currentUser?.company)
  }, [currentUser, companies])

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    if (userRole === 'manajemen' && userCompany?.isHolding) {
      const getChildCompanies = (parentId: string): Company[] => {
        const children = companies.filter(c => c.parentId === parentId);
        return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
      };
      return [userCompany, ...getChildCompanies(userCompany.id)];
    }
    if (userCompany) return [userCompany];
    return [];
  }, [userRole, userCompany, companies]);

  const showCompanyFilter = userRole === 'superadmin' || (userRole === 'manajemen' && !!userCompany?.isHolding);

  const companyQuizzes = useMemo(() => {
    if (!quizzes) return [];
    
    let filteredQuizzes = quizzes;
    
    if (selectedCompanyFilter !== 'all') {
      filteredQuizzes = filteredQuizzes.filter(q => q.company === selectedCompanyFilter);
    } 
    else if (userRole !== 'superadmin' && currentUser) {
      const manageableCompanyNames = manageableCompanies.map(c => c.name);
      filteredQuizzes = filteredQuizzes.filter(q => manageableCompanyNames.includes(q.company));
    }
    
    return filteredQuizzes;
  }, [quizzes, userRole, currentUser, manageableCompanies, selectedCompanyFilter]);
  
  const handleSelectAll = (checked: boolean | "indeterminate") => {
    setSelectedRowIds(checked ? companyQuizzes.map(q => q.id) : []);
  };

  const handleRowSelect = (id: string) => {
    setSelectedRowIds(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };


  const handleAddQuiz = () => {
    setSelectedQuiz(undefined);
    setIsCloning(false);
    setIsSheetOpen(true);
  };
  
  const handleEditQuiz = (quiz: LmsQuiz) => {
    setSelectedQuiz(quiz);
    setIsCloning(false);
    setIsSheetOpen(true);
  };

  const handleDuplicateQuiz = (quiz: LmsQuiz) => {
    setSelectedQuiz(quiz);
    setIsCloning(true);
    setIsSheetOpen(true);
  };

  const handleSaveQuiz = async (data: Omit<LmsQuiz, 'id'> & { id?: string }) => {
    if (data.id && !isCloning) {
      await updateQuiz(data.id, data);
    } else {
      const { id, ...quizData } = data; // remove id if cloning
      await addQuiz(quizData);
    }
  };

  const openDeleteDialog = (quizzes: LmsQuiz[]) => {
    setQuizzesToDelete(quizzes);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (quizzesToDelete && quizzesToDelete.length > 0) {
      const deletePromises = quizzesToDelete.map(q => deleteQuiz(q.id));
      await Promise.all(deletePromises);
      toast({
        title: "Hapus Berhasil",
        description: `${quizzesToDelete.length} kuis telah berhasil dihapus.`,
      });
      setQuizzesToDelete(null);
      setSelectedRowIds([]);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <FileQuestion />
                Bank Soal (Kuis)
              </CardTitle>
              <CardDescription>
                Buat dan kelola semua kuis yang dapat digunakan kembali di berbagai kursus.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              {showCompanyFilter && (
                  <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Filter Perusahaan" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">Semua Perusahaan</SelectItem>
                          {manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
              )}
               {selectedRowIds.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            Aksi ({selectedRowIds.length})
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => openDeleteDialog(quizzes.filter(q => selectedRowIds.includes(q.id)))} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus Pilihan
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
               )}
               <Button onClick={handleAddQuiz}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Buat Kuis Baru
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedRowIds.length > 0 && selectedRowIds.length === companyQuizzes.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Pilih semua"
                    />
                  </TableHead>
                  <TableHead>Judul Kuis</TableHead>
                  {showCompanyFilter && <TableHead>Perusahaan</TableHead>}
                  <TableHead>Jumlah Pertanyaan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyQuizzes.length > 0 ? (
                  companyQuizzes.map(quiz => (
                    <TableRow key={quiz.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRowIds.includes(quiz.id)}
                            onCheckedChange={() => handleRowSelect(quiz.id)}
                            aria-label={`Pilih ${quiz.title}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{quiz.title}</TableCell>
                        {showCompanyFilter && <TableCell>{quiz.company}</TableCell>}
                        <TableCell>{quiz.questions.length}</TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent>
                               <DropdownMenuItem onClick={() => handleEditQuiz(quiz)}>Ubah</DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleDuplicateQuiz(quiz)}><Copy className="mr-2 h-4 w-4" />Duplikat</DropdownMenuItem>
                               <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog([quiz])}>Hapus</DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                        </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={showCompanyFilter ? 5 : 4} className="h-24 text-center">
                      Belum ada kuis yang dibuat. Klik "Buat Kuis Baru" untuk memulai.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      <QuizFormSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onSave={handleSaveQuiz}
        quiz={selectedQuiz}
        isCloning={isCloning}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={quizzesToDelete?.length === 1 ? quizzesToDelete[0].title : `${quizzesToDelete?.length} kuis`}
        itemType="kuis"
      />
    </>
  );
}
