// src/app/(main)/lms/admin/courses/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, PlusCircle, MoreHorizontal, Users, Briefcase, GitFork, Eye, Copy, Globe, EyeOff, CheckCircle, Edit, Trash2, ChevronDown, Building, Search, ArrowRight } from "lucide-react";
import { CourseFormSheet } from "@/components/lms/course-form-sheet";
import type { Course, Company } from "@/types";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CourseSimulationSheet } from "@/components/lms/course-simulation-sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { Input } from "@/components/ui/input";
import Image from "next/image";

function TargetAudienceInfo({ target }: { target: Course['targetAudience'] }) {
    if (!target || Object.values(target).every(v => !v || v.length === 0)) {
        return <p className="text-[9px] font-black uppercase text-emerald-600">Terbuka Untuk Semua</p>;
    }
    return (
        <div className="flex flex-wrap items-center gap-1 mt-1">
            {target.levels && target.levels.length > 0 && <Badge variant="outline" className="text-[7px] font-bold h-3.5 px-1 border-none bg-muted/50">{target.levels.join(', ')}</Badge>}
            {target.departments && target.departments.length > 0 && <Badge variant="outline" className="text-[7px] font-bold h-3.5 px-1 border-none bg-muted/50">{target.departments.length} DEPT</Badge>}
            {target.employees && target.employees.length > 0 && <Badge variant="outline" className="text-[7px] font-bold h-3.5 px-1 border-none bg-muted/50">{target.employees.length} USER</Badge>}
        </div>
    );
}

export default function LmsAdminCoursesPage() {
  const { courses, addCourse, updateCourse, deleteCourse, companies, duplicateCourseToGlobal, currentUser, userRole } = useMasterData();
  const { toast } = useToast();
  
  const [isFormSheetOpen, setFormSheetOpen] = useState(false);
  const [isSimulationSheetOpen, setSimulationSheetOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | undefined>(undefined);
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [coursesToDelete, setCoursesToDelete] = useState<Course[] | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState("");

  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [currentUser, companies]);
  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);

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

  const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

  const companyCourses = useMemo(() => {
    if (!courses) return [];
    let filtered = courses;
    const manageableNames = new Set(manageableCompanies.map(c => c.name));
    
    if (userRole !== 'superadmin') {
        filtered = filtered.filter(c => c.company === 'Global' || manageableNames.has(c.company));
    }

    if (selectedCompanyFilter !== 'all') {
        const companyName = companies.find(c => c.id === selectedCompanyFilter)?.name;
        filtered = filtered.filter(c => c.company === companyName);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    return filtered.sort((a,b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
  }, [courses, userRole, manageableCompanies, selectedCompanyFilter, searchTerm, companies]);

  const handleSaveCourse = async (data: any) => {
    if (data.id && !isCloning) await updateCourse(data.id, data);
    else await addCourse({ ...data, company: data.company || currentUser?.company || '', createdBy: currentUser?.id || '', createdAt: new Date(), status: 'draft' });
  };

  const handleTogglePublish = async (course: Course) => {
    const next = course.status === 'published' ? 'draft' : 'published';
    await updateCourse(course.id, { status: next });
    toast({ title: "Status Diperbarui" });
  };

  return (
    <ResponsivePage>
      <PageHeader 
        title="Manajemen Kursus" 
        description="Kelola kurikulum, materi interaktif, dan kriteria kelulusan pelatihan mandiri."
        icon={BookOpenCheck}
        actions={
            <div className="flex items-center gap-2">
                {selectedRowIds.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9 gap-1 font-bold">Aksi Massal ({selectedRowIds.length}) <ChevronDown size={14}/></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setCoursesToDelete(courses.filter(c => selectedRowIds.includes(c.id))); setDeleteDialogOpen(true); }} className="text-destructive font-bold"><Trash2 size={14} className="mr-2"/> Hapus Terpilih</DropdownMenuItem></DropdownMenuContent>
                    </DropdownMenu>
                )}
                <Button onClick={() => { setSelectedCourse(undefined); setIsCloning(false); setFormSheetOpen(true); }} className="font-bold shadow-lg h-9 sm:h-10"><PlusCircle size={16} className="mr-2" /> Tambah Kursus</Button>
            </div>
        }
      />

      <ResponsiveToolbar>
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Cari judul kursus..." className="pl-9 h-10 border-none bg-background/50 shadow-none focus-visible:ring-primary/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {showCompanyFilter && (
            <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background border-none shadow-sm text-[10px] font-black uppercase"><Building size={14} className="mr-2 text-primary" /><SelectValue placeholder="Perusahaan" /></SelectTrigger>
                <SelectContent className="z-[350]"><SelectItem value="all">Semua Klien</SelectItem>{manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
        )}
      </ResponsiveToolbar>

      <AdaptiveTable 
        data={companyCourses}
        keyExtractor={(c) => c.id}
        columns={[
            { header: "Materi Kursus", cell: (c) => (
                <div className="flex items-center gap-4">
                    <div className="size-14 rounded-lg overflow-hidden bg-slate-200 shrink-0 relative border shadow-sm">
                        {c.thumbnailUrl ? <Image src={c.thumbnailUrl} alt={c.title} fill className="object-cover" /> : <BookOpenCheck size={20} className="absolute center text-slate-400" />}
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate leading-tight">{c.title}</p>
                        <TargetAudienceInfo target={c.targetAudience} />
                    </div>
                </div>
            )},
            { header: "Perusahaan", cell: (c) => <span className="text-xs font-medium text-slate-600">{c.company === 'Global' ? <Badge variant="secondary" className="text-[8px] font-black border-none uppercase h-4">GLOBAL</Badge> : c.company}</span> },
            { header: "Modul", className: "text-center font-mono font-bold", cell: (c) => c.modules.length },
            { header: "Status", cell: (c) => <Badge variant={c.status === 'published' ? 'default' : 'outline'} className="text-[9px] font-black uppercase h-5">{c.status === 'published' ? 'Aktif' : 'Draf'}</Badge> },
            { header: "", className: "text-right", cell: (c) => (
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal size={18}/></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[350]">
                    <DropdownMenuItem onClick={() => { setSelectedCourse(c); setSimulationSheetOpen(true); }}><Eye size={14} className="mr-2"/> Lihat Simulasi</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSelectedCourse(c); setIsCloning(false); setFormSheetOpen(true); }}><Edit size={14} className="mr-2"/> Ubah Konten</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSelectedCourse(c); setIsCloning(true); setFormSheetOpen(true); }}><Copy size={14} className="mr-2"/> Duplikat (Clone)</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleTogglePublish(c)}>{c.status === 'published' ? <><EyeOff size={14} className="mr-2"/> Tarik Publikasi</> : <><CheckCircle size={14} className="mr-2"/> Terbitkan Kursus</>}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setCoursesToDelete([c]); setDeleteDialogOpen(true); }} className="text-destructive font-bold"><Trash2 size={14} className="mr-2"/> Hapus</DropdownMenuItem>
                </DropdownMenuContent></DropdownMenu>
            )}
        ]}
        renderMobileCard={(c) => (
            <Card className="border-border/40 shadow-sm overflow-hidden bg-background">
                <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-start gap-3">
                        <div className="size-14 rounded-xl overflow-hidden bg-slate-200 shrink-0 relative">
                            {c.thumbnailUrl && <Image src={c.thumbnailUrl} alt={c.title} fill className="object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="font-black text-xs uppercase truncate text-slate-800">{c.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[7px] font-bold h-4 px-1.5 border-none bg-muted/50">{c.modules.length} MODUL</Badge>
                                <Badge variant={c.status === 'published' ? 'default' : 'outline'} className="text-[7px] font-black uppercase h-4 px-1.5 border-none">{c.status}</Badge>
                            </div>
                        </div>
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={14}/></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setSelectedCourse(c); setSimulationSheetOpen(true); }}>Simulasi</DropdownMenuItem><DropdownMenuItem onClick={() => { setSelectedCourse(c); setFormSheetOpen(true); }}>Ubah</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                    </div>
                    <div className="pt-3 border-t border-dashed flex justify-between items-center">
                        <span className="text-[8px] font-black uppercase text-muted-foreground">Klien: {c.company}</span>
                        <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase gap-1.5" onClick={() => { setSelectedCourse(c); setFormSheetOpen(true); }}>DETAIL <ArrowRight size={10} /></Button>
                    </div>
                </CardContent>
            </Card>
        )}
      />

      <CourseFormSheet isOpen={isFormSheetOpen} onOpenChange={setFormSheetOpen} course={selectedCourse} isCloning={isCloning} onSave={handleSaveCourse} />
      <CourseSimulationSheet isOpen={isSimulationSheetOpen} onOpenChange={setSimulationSheetOpen} course={selectedCourse} />
      <DeleteConfirmationDialog isOpen={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={async () => { if(coursesToDelete) await Promise.all(coursesToDelete.map(c => deleteCourse(c.id))); setCoursesToDelete(null); }} itemName={coursesToDelete?.length === 1 ? coursesToDelete[0].title : `${coursesToDelete?.length} kursus`} itemType="kursus" />
    </ResponsivePage>
  );
}
