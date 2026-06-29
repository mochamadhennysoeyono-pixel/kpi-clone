// src/components/lms/admin/programs/program-form.tsx
"use client";

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useFieldArray, useWatch, useFormContext } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, Workflow, BookOpenCheck, Loader2, Save, CalendarIcon, BellRing, AlertCircle, Link as LinkIcon, Video, MapPin, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MultiSelect } from '@/components/ui/multi-select';
import { LearningProgram, ProgramStage, ProgramActivity, Employee, Company, LmsQuiz, Course, type ProgramFormValues } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { serverTimestamp } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';

const CourseFormSheet = dynamic(() => import('@/components/lms/course-form-sheet').then(mod => mod.CourseFormSheet), {
    loading: () => <p>Memuat...</p>,
    ssr: false
});

function ActivityFields({
  stageIndex,
  activityIndex,
  remove,
  courses,
  quizzes,
  learningPrograms,
  onOpenCourseForm,
}: {
  stageIndex: number;
  activityIndex: number;
  remove: (index: number) => void;
  courses: Course[];
  quizzes: LmsQuiz[];
  learningPrograms: LearningProgram[];
  onOpenCourseForm: () => void;
}) {
  const { control } = useFormContext<ProgramFormValues>();
  
  const activityType = useWatch({
    control,
    name: `stages.${stageIndex}.activities.${activityIndex}.type`,
  });
  
  const onFailAction = useWatch({
    control,
    name: `stages.${stageIndex}.activities.${activityIndex}.onFail.action`,
  });

  return (
    <div className="rounded-md border bg-background p-4 relative space-y-4">
       <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={() => remove(activityIndex)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <FormField
        control={control}
        name={`stages.${stageIndex}.activities.${activityIndex}.title`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Judul Aktivitas</FormLabel>
            <FormControl>
              <Input placeholder="cth., Mempelajari Dasar Produk" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name={`stages.${stageIndex}.activities.${activityIndex}.type`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipe</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? 'LMS_COURSE'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Tipe Aktivitas" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="LMS_COURSE">Kursus LMS</SelectItem>
                  <SelectItem value="LMS_QUIZ">Kuis</SelectItem>
                  <SelectItem value="OFFLINE_EVENT">Acara Offline</SelectItem>
                  <SelectItem value="ONLINE_MEETING">Rapat Online</SelectItem>
                  <SelectItem value="SUBMISSION_TASK">Tugas Unggahan</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
            control={control}
            name={`stages.${stageIndex}.activities.${activityIndex}.resourceId`}
            render={({ field }) => (
                <FormItem>
                <FormLabel>Sumber Daya</FormLabel>
                {activityType === 'LMS_COURSE' && courses && (
                    <div className="flex items-center gap-2">
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Pilih Kursus" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {courses.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="sm" onClick={onOpenCourseForm}>
                            <PlusCircle className="h-4 w-4 mr-2"/>
                            Baru
                        </Button>
                    </div>
                )}
                 {activityType === 'LMS_QUIZ' && quizzes && (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih Kuis" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {quizzes.map(q => (
                                <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {activityType === 'OFFLINE_EVENT' && (
                     <FormControl><Input placeholder="Lokasi acara" {...field} value={field.value ?? ''} /></FormControl>
                )}
                 {activityType === 'ONLINE_MEETING' && (
                     <FormControl><Input placeholder="Link rapat online" {...field} value={field.value ?? ''} /></FormControl>
                )}
                 {activityType === 'SUBMISSION_TASK' && (
                     <FormControl><Textarea placeholder="Jelaskan tugas yang harus dikumpulkan..." {...field} value={field.value ?? ''} /></FormControl>
                )}
                <FormMessage />
                </FormItem>
            )}
        />
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <FormField
            control={control}
            name={`stages.${stageIndex}.activities.${activityIndex}.passingCriteria.score`}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>KKM (Skor Minimal Lulus)</FormLabel>
                    <FormControl><Input type="number" placeholder="cth., 80" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                    {activityType === 'LMS_COURSE' && <FormDescription className="text-xs">Nilai ini akan menimpa KKM asli dari kursus yang dipilih, khusus untuk program ini.</FormDescription>}
                </FormItem>
            )}
        />
       </div>

        <div className="p-3 border rounded-md space-y-3">
             <FormLabel>Kondisi Jika Gagal Lulus</FormLabel>
             <FormField
                control={control}
                name={`stages.${stageIndex}.activities.${activityIndex}.onFail.action`}
                render={({ field }) => (
                <FormItem>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value ?? 'RETRY'} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                             <Label htmlFor={`onfail-retry-${stageIndex}-${activityIndex}`} className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-accent/50 [&:has([data-state=checked])]:border-primary"><RadioGroupItem value="RETRY" id={`onfail-retry-${stageIndex}-${activityIndex}`} /> Ulangi</Label>
                             <Label htmlFor={`onfail-redirect-${stageIndex}-${activityIndex}`} className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-accent/50 [&:has([data-state=checked])]:border-primary"><RadioGroupItem value="REDIRECT_TO_PROGRAM" id={`onfail-redirect-${stageIndex}-${activityIndex}`} /> Pindah Program</Label>
                             <Label htmlFor={`onfail-fail-${stageIndex}-${activityIndex}`} className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-accent/50 [&:has([data-state=checked])]:border-destructive"><RadioGroupItem value="FAIL_PROGRAM" id={`onfail-fail-${stageIndex}-${activityIndex}`} /> Gagal</Label>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
             {onFailAction === 'REDIRECT_TO_PROGRAM' && (
                <FormField
                    control={control}
                    name={`stages.${stageIndex}.activities.${activityIndex}.onFail.remedialProgramId`}
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Pilih Program Tujuan</FormLabel>
                         {learningPrograms && learningPrograms.length > 0 ? (
                            <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih program tujuan..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {learningPrograms.map(prog => (
                                        <SelectItem key={prog.id} value={prog.id}>{prog.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                         ) : (
                             <p className="text-xs text-muted-foreground">Tidak ada program lain yang bisa dipilih.</p>
                         )}
                    </FormItem>
                    )}
                />
            )}
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <FormField
                control={control}
                name={`stages.${stageIndex}.activities.${activityIndex}.startDate`}
                render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Tanggal Mulai</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}
            />
            <FormField
                control={control}
                name={`stages.${stageIndex}.activities.${activityIndex}.endDate`}
                render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Tanggal Selesai</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={control}
                name={`stages.${stageIndex}.activities.${activityIndex}.reminderDays`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Pengingat (Hari Sebelum)</FormLabel>
                        <FormControl><Input type="number" placeholder="cth., 3" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={control}
                name={`stages.${stageIndex}.activities.${activityIndex}.reminderType`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipe Pengingat</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? 'APP'}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="NONE">Tidak Ada</SelectItem>
                                <SelectItem value="APP">Notifikasi Aplikasi</SelectItem>
                                <SelectItem value="EMAIL">Email</SelectItem>
                                <SelectItem value="BOTH">Aplikasi & Email</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    </div>
  );
}

function StageFields({
  stageIndex,
  remove,
  courses,
  quizzes,
  learningPrograms,
  onOpenCourseForm,
}: {
  stageIndex: number;
  remove: (index: number) => void;
  courses: Course[];
  quizzes: LmsQuiz[];
  learningPrograms: LearningProgram[];
  onOpenCourseForm: (stageIndex: number, activityIndex: number) => void;
}) {
  const { control } = useFormContext<ProgramFormValues>();
  const { fields, append, remove: removeActivity } = useFieldArray({
    control,
    name: `stages.${stageIndex}.activities`,
  });

  const defaultActivity: ProgramActivity = { 
    id: `act_${Date.now()}`, 
    title: '', 
    type: 'LMS_COURSE', 
    resourceId: '', 
    startDate: undefined,
    endDate: undefined,
    reminderDays: 0,
    reminderType: 'APP',
    passingCriteria: { score: 80, attendance: false, approved: false }, 
    onFail: { action: 'RETRY', remedialProgramId: '' } 
  };

  return (
    <Card className="bg-muted/30">
        <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base">Tahap #{stageIndex + 1}</CardTitle>
            <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => remove(stageIndex)}
            >
                Hapus Tahap
            </Button>
        </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name={`stages.${stageIndex}.title`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Judul Tahap</FormLabel>
              <FormControl>
                <Input placeholder="cth., Fondasi Produk" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-3 pt-2">
            <h4 className="font-semibold text-sm">Aktivitas Pembelajaran</h4>
            {fields.map((field, activityIndex) => (
                <ActivityFields
                  key={field.id}
                  stageIndex={stageIndex}
                  activityIndex={activityIndex}
                  remove={removeActivity}
                  courses={courses}
                  quizzes={quizzes}
                  learningPrograms={learningPrograms}
                  onOpenCourseForm={() => onOpenCourseForm(stageIndex, activityIndex)}
                />
            ))}
            <Button
                type="button"
                variant="outline"
                onClick={() => append(defaultActivity)}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Aktivitas
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProgramForm({ program, filterCompany, setFilterCompany, filterDepartment, setFilterDepartment, filterPosition, setFilterPosition }: { program?: LearningProgram; filterCompany: string; setFilterCompany: (value: string) => void; filterDepartment: string; setFilterDepartment: (value: string) => void; filterPosition: string; setFilterPosition: (value: string) => void; }) {
  const { addLearningProgram, updateLearningProgram, companies, departments, positions, employees, courses, quizzes, learningPrograms, addCourse } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  
  const [isCourseFormOpen, setIsCourseFormOpen] = React.useState(false);
  const [newCourseTarget, setNewCourseTarget] = React.useState<{stageIndex: number, activityIndex: number} | null>(null);

  const form = useFormContext<ProgramFormValues>();
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'stages',
  });

  const defaultStage: ProgramStage = { 
    id: `stage_${Date.now()}`, 
    title: '', 
    description: '',
    activities: [{ 
      id: `act_${Date.now()}`, 
      title: '', 
      type: 'LMS_COURSE', 
      resourceId: '', 
      startDate: undefined,
      endDate: undefined,
      reminderDays: 0,
      reminderType: 'APP',
      passingCriteria: { score: 80, attendance: false, approved: false }, 
      onFail: { action: 'RETRY', remedialProgramId: '' } 
    }] 
  };


  const isEditing = !!program;
  
  const companyAndGlobalResources = React.useMemo(() => {
    if (!quizzes || !courses) return { companyCourses: [], companyQuizzes: [] };
    const globalQuizzes = quizzes.filter(q => q.company === 'Global');
    const globalCourses = courses.filter(c => c.company === 'Global' && c.isProgram);

    const companyToShow = filterCompany || currentUser?.company;

    if (!companyToShow) {
      return { companyCourses: globalCourses, companyQuizzes: globalQuizzes };
    }
    
    const companyCourses = courses.filter(c => c.company === companyToShow && c.isProgram);
    const companyQuizzes = quizzes.filter(q => q.company === companyToShow);

    return {
      companyCourses: [...new Map([...globalCourses, ...companyCourses].map(item => [item['id'], item])).values()],
      companyQuizzes: [...new Map([...globalQuizzes, ...companyQuizzes].map(item => [item['id'], item])).values()],
    };
  }, [filterCompany, currentUser?.company, courses, quizzes]);
  
  const userCompany = React.useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  const isHoldingAdmin = React.useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);

  const manageableCompanies = React.useMemo(() => {
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

  const departmentOptions = React.useMemo(() => departments.filter(d => d.company === filterCompany).map(d => ({ label: d.name, value: d.name })), [departments, filterCompany]);
  const positionOptions = React.useMemo(() => positions.filter(p => p.company === filterCompany).map(p => ({ label: p.name, value: p.name })), [positions, filterCompany]);
  const employeeOptions = React.useMemo(() => employees.filter(e => e.company === filterCompany && e.status === 'Aktif').map(e => ({ label: e.name, value: e.id })), [employees, filterCompany]);
  const levelOptions: {label: string, value: Employee['level']}[] = [ { label: 'Direktur', value: 'Direktur' }, { label: 'Manager', value: 'Manager' }, { label: 'Supervisor', value: 'Supervisor' }, { label: 'Staff', value: 'Staff' }];

  const handleOpenCourseForm = (stageIndex: number, activityIndex: number) => {
    setNewCourseTarget({ stageIndex, activityIndex });
    setIsCourseFormOpen(true);
  };
  
  const handleSaveNewCourse = async (courseData: Omit<Course, 'id' | 'createdBy' | 'createdAt'> & { id?: string }) => {
    const newCourse = await addCourse(courseData);
    if (newCourse && newCourseTarget) {
      form.setValue(`stages.${newCourseTarget.stageIndex}.activities.${newCourseTarget.activityIndex}.resourceId`, newCourse.id);
      setIsCourseFormOpen(false);
      setNewCourseTarget(null);
      toast({ title: "Kursus Baru Dibuat & Dipilih." });
    } else {
      toast({ variant: 'destructive', title: "Gagal Membuat Kursus Baru." });
    }
  };

  const onSubmit = async (data: ProgramFormValues) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateLearningProgram(program.id!, data);
        toast({ title: "Program Diperbarui" });
      } else {
        await addLearningProgram({ ...data, createdBy: currentUser?.id, createdAt: serverTimestamp() as any });
        toast({ title: "Program Baru Dibuat" });
      }
      router.push('/lms/admin/programs');
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Gagal Menyimpan", description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
           <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <Workflow />
                    {isEditing ? 'Ubah Program Pembelajaran' : 'Buat Program Pembelajaran Baru'}
                </CardTitle>
                 <CardDescription>
                    Rancang alur pembelajaran terstruktur untuk pengembangan kompetensi karyawan.
                </CardDescription>
            </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Nama Program</FormLabel><FormControl><Input placeholder="cth., Program Pengembangan Manajer 2025" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Tujuan Program</FormLabel><FormControl><Textarea placeholder="Jelaskan tujuan akhir atau kompetensi yang ingin dicapai dari program ini" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
             {userRole === 'superadmin' && (<FormField control={form.control} name="company" render={({ field }) => ( <FormItem><FormLabel>Perusahaan</FormLabel><Select onValueChange={(v) => { field.onChange(v); setFilterCompany(v); }} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Pilih perusahaan" /></SelectTrigger></FormControl><SelectContent>{manageableCompanies.map(c => (<SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>)}
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle className="text-base">Target Peserta</CardTitle><CardDescription>Tentukan siapa saja yang akan mengikuti program ini.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <FormField control={form.control} name="targetAudience.levels" render={({ field }) => (<FormItem><FormLabel>Level Jabatan</FormLabel><MultiSelect options={levelOptions} value={field.value ?? []} onChange={field.onChange} placeholder="Pilih level..."/></FormItem>)}/>
                <FormField control={form.control} name="targetAudience.departments" render={({ field }) => (<FormItem><FormLabel>Departemen</FormLabel><MultiSelect options={departmentOptions} value={field.value ?? []} onChange={field.onChange} placeholder="Pilih departemen..."/></FormItem>)}/>
                <FormField control={form.control} name="targetAudience.positions" render={({ field }) => (<FormItem><FormLabel>Jabatan</FormLabel><MultiSelect options={positionOptions} value={field.value ?? []} onChange={field.onChange} placeholder="Pilih jabatan..."/></FormItem>)}/>
                 <FormField control={form.control} name="targetAudience.employees" render={({ field }) => (<FormItem><FormLabel>Karyawan Spesifik</FormLabel><MultiSelect options={employeeOptions} value={field.value ?? []} onChange={field.onChange} placeholder="Pilih karyawan..."/></FormItem>)}/>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle className="text-base">Tahapan Program</CardTitle><CardDescription>Susun tahapan dan aktivitas pembelajaran secara berurutan.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                {fields.map((field, index) => (
                    <StageFields
                      key={field.id}
                      stageIndex={index}
                      control={form.control}
                      remove={remove}
                      courses={companyAndGlobalResources.companyCourses}
                      quizzes={companyAndGlobalResources.companyQuizzes}
                      learningPrograms={learningPrograms}
                      onOpenCourseForm={(stageIndex, activityIndex) => handleOpenCourseForm(stageIndex, activityIndex)}
                    />
                ))}
                <Button type="button" variant="outline" onClick={() => append(defaultStage)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Tahap
                </Button>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Pengaturan Publikasi</CardTitle>
            </CardHeader>
            <CardContent>
                 <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Publikasikan Program</FormLabel>
                        <FormDescription>
                           Jadikan program ini terlihat dan dapat diakses oleh karyawan yang ditargetkan.
                        </FormDescription>
                      </div>
                      <FormControl>
                         <Switch
                          checked={field.value === 'published'}
                          onCheckedChange={(checked) => field.onChange(checked ? 'published' : 'draft')}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
            </CardContent>
        </Card>
        
        <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.back()}>Batal</Button>
            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Simpan Perubahan' : 'Simpan Program'}
            </Button>
        </div>

        <CourseFormSheet 
            isOpen={isCourseFormOpen}
            onOpenChange={setIsCourseFormOpen}
            onSave={handleSaveNewCourse}
            isProgramContext={true}
        />
        </form>
    </div>
  );
}
