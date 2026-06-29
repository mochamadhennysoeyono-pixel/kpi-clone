// src/app/(main)/lms/admin/programs/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import type { LearningProgram, Company, Employee } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Workflow, MoreHorizontal, Edit, Trash2, Users, Briefcase, GitFork, User, Eye, Calendar, EyeOff, CheckCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";

function TargetAudienceInfo({ target, employees }: { target: LearningProgram['targetAudience'], employees: Employee[] }) {
    if (!target || Object.values(target).every(v => !v || v.length === 0)) {
        return <p className="text-xs text-green-600 dark:text-green-400">Untuk Semua Karyawan</p>;
    }

    const employeeNames = target.employees?.map(id => employees.find(e => e.id === id)?.name).filter(Boolean) || [];

    return (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {target.levels && target.levels.length > 0 && <Badge variant="outline" className="text-xs"><Users className="h-3 w-3 mr-1"/>{target.levels.join(', ')}</Badge>}
            {target.departments && target.departments.length > 0 && <Badge variant="outline" className="text-xs"><Briefcase className="h-3 w-3 mr-1"/>{target.departments.length} Dept.</Badge>}
            {target.positions && target.positions.length > 0 && <Badge variant="outline" className="text-xs"><GitFork className="h-3 w-3 mr-1"/>{target.positions.length} Jabatan</Badge>}
            {employeeNames.length > 0 && <Badge variant="outline" className="text-xs"><User className="h-3 w-3 mr-1"/>{employeeNames.join(', ')}</Badge>}
        </div>
    );
}


export default function LearningProgramsPage() {
  const router = useRouter();
  const { learningPrograms, deleteLearningProgram, updateLearningProgram, employees } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();

  const [programToDelete, setProgramToDelete] = useState<LearningProgram | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const filteredPrograms = useMemo(() => {
    if (!learningPrograms) return [];
    if (userRole === 'superadmin') return learningPrograms;
    return learningPrograms.filter(p => p.company === currentUser?.company);
  }, [learningPrograms, currentUser, userRole]);

  const handleEdit = (programId: string) => {
    router.push(`/lms/admin/programs/${programId}/edit`);
  };
  
  const handleViewDetail = (programId: string) => {
    router.push(`/lms/admin/programs/${programId}`);
  };

  const openDeleteDialog = (program: LearningProgram) => {
    setProgramToDelete(program);
    setDeleteDialogOpen(true);
  };
  
  const handleDelete = async () => {
    if (programToDelete) {
        await deleteLearningProgram(programToDelete.id!);
        toast({ title: "Program Dihapus", description: `Program "${programToDelete.title}" telah dihapus.` });
        setProgramToDelete(null);
    }
  }

  const handleTogglePublish = async (program: LearningProgram) => {
    const newStatus = program.status === 'published' ? 'draft' : 'published';
    try {
        await updateLearningProgram(program.id!, { status: newStatus });
        toast({
            title: `Status Program Diperbarui`,
            description: `Program "${program.title}" sekarang berstatus ${newStatus === 'published' ? 'Diterbitkan' : 'Draf'}.`
        });
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Gagal Memperbarui Status",
            description: e.message,
        });
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Workflow />
                  Program Pembelajaran
                </CardTitle>
                <CardDescription>
                  Rancang, kelola, dan pantau alur pembelajaran terstruktur untuk pengembangan karyawan.
                </CardDescription>
              </div>
              <Button onClick={() => router.push('/lms/admin/programs/new')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Buat Program Baru
              </Button>
          </CardHeader>
          <CardContent>
            {filteredPrograms.length > 0 ? (
                <Accordion type="single" collapsible className="w-full space-y-3">
                    {filteredPrograms.map(program => (
                        <AccordionItem value={program.id!} key={program.id} className="border rounded-lg bg-background">
                            <AccordionTrigger className="p-4 hover:no-underline">
                                <div className="flex items-center justify-between w-full pr-4">
                                    <div className="text-left grid gap-1">
                                        <p className="font-semibold">{program.title}</p>
                                        <p className="text-sm text-muted-foreground">{program.company}</p>
                                    </div>
                                     <div className="flex items-center gap-2">
                                        <Badge variant={program.status === "published" ? "default" : "outline"}>
                                            {program.status === 'published' ? 'Diterbitkan' : 'Draf'}
                                        </Badge>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                               <div className="border-t pt-4 space-y-4">
                                 <div>
                                    <h4 className="text-sm font-semibold mb-2">Target Peserta</h4>
                                    <TargetAudienceInfo target={program.targetAudience} employees={employees} />
                                 </div>
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">Tahapan</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Program ini memiliki <strong>{program.stages.length}</strong> tahapan dengan total <strong>{program.stages.reduce((acc, s) => acc + s.activities.length, 0)}</strong> aktivitas.
                                    </p>
                                  </div>
                                   <div className="flex justify-end gap-2 mt-4">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="sm" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                            Aksi
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Opsi</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleViewDetail(program.id!)}>
                                            <Eye className="mr-2 h-4 w-4" /> Tampilkan Detail
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push('/calendar/organization')}>
                                            <Calendar className="mr-2 h-4 w-4" /> Tampilkan dalam Kalender
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleEdit(program.id!)}>
                                            <Edit className="mr-2 h-4 w-4" /> Ubah Program
                                        </DropdownMenuItem>
                                        {program.status === 'published' ? (
                                            <DropdownMenuItem onClick={() => handleTogglePublish(program)}>
                                                <EyeOff className="mr-2 h-4 w-4" /> Batalkan Publikasi
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem onClick={() => handleTogglePublish(program)}>
                                                <CheckCircle className="mr-2 h-4 w-4" /> Terbitkan
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(program)}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Hapus Program
                                        </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                               </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Belum ada program pembelajaran yang dibuat.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={programToDelete?.title || ''}
        itemType="program pembelajaran"
      />
    </>
  );
}
