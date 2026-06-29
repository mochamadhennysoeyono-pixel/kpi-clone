// src/app/(main)/lms/admin/courses/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpenCheck, PlusCircle, MoreHorizontal, Users, Briefcase, GitFork, Eye, Copy, Globe, EyeOff, CheckCircle, Edit, Trash2, ChevronDown } from "lucide-react";
import { CourseFormSheet } from "@/components/lms/course-form-sheet";
import type { Course, Company } from "@/types";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CourseSimulationSheet } from "@/components/lms/course-simulation-sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";


function TargetAudienceInfo({ target }: { target: Course['targetAudience'] }) {
    if (!target || Object.values(target).every(v => !v || v.length === 0)) {
        return <p className="text-xs text-green-600 dark:text-green-400">Untuk Semua Karyawan</p>;
    }

    return (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {target.levels && target.levels.length > 0 && <Badge variant="outline" className="text-xs"><Users className="h-3 w-3 mr-1"/>{target.levels.join(', ')}</Badge>}
            {target.departments && target.departments.length > 0 && <Badge variant="outline" className="text-xs"><Briefcase className="h-3 w-3 mr-1"/>{target.departments.length} Departemen</Badge>}
            {target.positions && target.positions.length > 0 && <Badge variant="outline" className="text-xs"><GitFork className="h-3 w-3 mr-1"/>{target.positions.length} Jabatan</Badge>}
            {target.employees && target.employees.length > 0 && <Badge variant="outline" className="text-xs"><Users className="h-3 w-3 mr-1"/>{target.employees.length} Karyawan</Badge>}
        </div>
    );
}

export default function LmsAdminCoursesPage() {
  const { courses, addCourse, updateCourse, deleteCourse, companies, duplicateCourseToGlobal } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();
  const [isFormSheetOpen, setFormSheetOpen] = useState(false);
  const [isSimulationSheetOpen, setSimulationSheetOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | undefined>(undefined);
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [coursesToDelete, setCoursesToDelete] = useState<Course[] | null>(null);
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

  const companyCourses = useMemo(() => {
    if (!courses) return [];
    
    const manageableCompanyNames = manageableCompanies.map(c => c.name);

    let filteredCourses = courses.filter(course => {
        if (userRole === 'superadmin') {
            return true;
        }
        return manageableCompanyNames.includes(course.company);
    });

    if (selectedCompanyFilter !== 'all') {
        filteredCourses = filteredCourses.filter(c => c.company === selectedCompanyFilter);
    }
    
    return filteredCourses;
  }, [courses, userRole, manageableCompanies, selectedCompanyFilter]);
  
  const handleSelectAll = (checked: boolean | "indeterminate") => {
    setSelectedRowIds(checked ? companyCourses.map(c => c.id) : []);
  };
  
  const handleRowSelect = (id: string) => {
    setSelectedRowIds(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleAddCourse = () => {
    setSelectedCourse(undefined);
    setIsCloning(false);
    setFormSheetOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setIsCloning(false);
    setFormSheetOpen(true);
  };
  
  const handleDuplicateCourse = (course: Course) => {
    setSelectedCourse(course);
    setIsCloning(true);
    setFormSheetOpen(true);
  }

  const handleDuplicateToGlobal = async (course: Course) => {
    await duplicateCourseToGlobal(course);
  };
  
  const handleViewSimulation = (course: Course) => {
    setSelectedCourse(course);
    setSimulationSheetOpen(true);
  };

  const handleTogglePublish = async (course: Course) => {
    const newStatus = course.status === 'published' ? 'draft' : 'published';
    await updateCourse(course.id, { status: newStatus });
  };

  const handleSaveCourse = async (data: Omit<Course, 'id' | 'createdBy' | 'createdAt'> & { id?: string }) => {
    if (data.id && !isCloning) {
      await updateCourse(data.id, data);
    } else {
      const { id, ...courseData } = data;
      const newCoursePayload: Omit<Course, 'id'> = {
        ...courseData,
        company: courseData.company || currentUser?.company || '',
        createdBy: currentUser?.id || '',
        createdAt: new Date(),
        status: 'draft',
      };
      await addCourse(newCoursePayload);
    }
  };

  const openDeleteDialog = (coursesToDelete: Course[]) => {
    setCoursesToDelete(coursesToDelete);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (coursesToDelete && coursesToDelete.length > 0) {
      const deletePromises = coursesToDelete.map(course => deleteCourse(course.id));
      await Promise.all(deletePromises);
      toast({
        title: "Hapus Berhasil",
        description: `${coursesToDelete.length} kursus telah berhasil dihapus.`,
      });
      setCoursesToDelete(null);
      setSelectedRowIds([]);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <BookOpenCheck />
                Manajemen Kursus (LMS)
              </CardTitle>
              <CardDescription>
                Buat, edit, dan kelola semua materi kursus dan modul pembelajaran.
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
                        <DropdownMenuItem onClick={() => openDeleteDialog(courses.filter(c => selectedRowIds.includes(c.id)))} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus Pilihan
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
               )}
               <Button onClick={handleAddCourse}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Kursus
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedRowIds.length > 0 && selectedRowIds.length === companyCourses.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Pilih semua"
                    />
                  </TableHead>
                  <TableHead>Nama Kursus</TableHead>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="hidden sm:table-cell">Jumlah Modul</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyCourses.length > 0 ? (
                  companyCourses.map(course => (
                    <TableRow key={course.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRowIds.includes(course.id)}
                            onCheckedChange={() => handleRowSelect(course.id)}
                            aria-label={`Pilih ${course.title}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                           <div className="flex items-start gap-4">
                              {course.thumbnailUrl && (
                                <img src={course.thumbnailUrl} alt={course.title} className="rounded-md object-cover w-20 h-auto aspect-video" onError={(e) => (e.currentTarget.style.display = 'none')} />
                              )}
                              <div className="flex flex-col">
                                <span>{course.title}</span>
                                <TargetAudienceInfo target={course.targetAudience} />
                              </div>
                           </div>
                        </TableCell>
                        <TableCell>{course.company === 'Global' ? <Badge variant="secondary">Global</Badge> : course.company}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {course.categories && course.categories.length > 0
                              ? course.categories.map(cat => <Badge key={cat} variant="secondary">{cat}</Badge>)
                              : <span className="text-xs text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{course.modules.length}</TableCell>
                        <TableCell>
                           <Badge variant={course.status === 'published' ? 'default' : 'outline'}>{course.status === 'published' ? 'Diterbitkan' : 'Draf'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent>
                               <DropdownMenuItem onClick={() => handleViewSimulation(course)}><Eye className="mr-2 h-4 w-4" />Lihat Simulasi</DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleEditCourse(course)}><Edit className="mr-2 h-4 w-4" />Ubah</DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleDuplicateCourse(course)}><Copy className="mr-2 h-4 w-4" />Duplikat</DropdownMenuItem>
                               {userRole === 'superadmin' && course.company !== 'Global' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDuplicateToGlobal(course)}>
                                    <Globe className="mr-2 h-4 w-4" /> Duplikat ke Global
                                  </DropdownMenuItem>
                                </>
                               )}
                               <DropdownMenuSeparator />
                               {course.status === 'published' ? (
                                    <DropdownMenuItem onClick={() => handleTogglePublish(course)}>
                                        <EyeOff className="mr-2 h-4 w-4" /> Batalkan Publikasi
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => handleTogglePublish(course)}>
                                        <CheckCircle className="mr-2 h-4 w-4" /> Terbitkan
                                    </DropdownMenuItem>
                                )}
                               <DropdownMenuSeparator />
                               <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog([course])}>Hapus</DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                        </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Belum ada kursus yang dibuat untuk filter ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <CourseFormSheet
        isOpen={isFormSheetOpen}
        onOpenChange={setFormSheetOpen}
        course={selectedCourse}
        isCloning={isCloning}
        onSave={handleSaveCourse}
      />
      <CourseSimulationSheet
        isOpen={isSimulationSheetOpen}
        onOpenChange={setSimulationSheetOpen}
        course={selectedCourse}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={coursesToDelete?.length === 1 ? coursesToDelete[0].title : `${coursesToDelete?.length} kursus`}
        itemType="kursus"
      />
    </>
  );
}
