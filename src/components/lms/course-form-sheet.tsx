// src/components/lms/course-form-sheet.tsx
"use client";

import * as React from "react";
import { useEffect, useState, useMemo, useRef } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import type { Course, LmsModule, LmsTopic, LmsQuiz, Company, Employee, Department, Position } from "@/types";
import { ScrollArea } from "../ui/scroll-area";
import { PlusCircle, Trash2, Check, ChevronsUpDown, X, FileText, Youtube, Link as LinkIcon, Bold, Italic, Underline, FileQuestion, Edit, Lightbulb, HelpCircle, List, ListOrdered, Upload, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { QuizFormSheet } from "./quiz-form-sheet";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { Checkbox } from "../ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Dialog, DialogContent as HelpDialogContent, DialogHeader as HelpDialogHeader, DialogTitle as HelpDialogTitle, DialogDescription as HelpDialogDescription, DialogTrigger } from "../ui/dialog";
import Image from "next/image";
import { addDoc, collection } from "firebase/firestore";
import { db, storage } from "@/lib/firebase/client";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { Progress } from "../ui/progress";
import { useToast } from "@/hooks/use-toast";


// --- Zod Schema Definitions ---
const topicQuizSchema = z.object({
  id: z.string(),
  question: z.string().min(1, "Pertanyaan kuis tidak boleh kosong."),
  options: z.array(z.string().min(1, "Opsi tidak boleh kosong")).min(2, "Minimal harus ada dua opsi."),
  correctAnswer: z.number().min(0, "Jawaban benar harus dipilih."),
});


const topicSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Judul topik harus diisi."),
  contentType: z.enum(['text', 'video', 'link']),
  content: z.string().optional(),
  description: z.string().optional(),
  hideVideoControls: z.boolean().default(false),
  quiz: topicQuizSchema.optional(),
  workbookUrl: z.string().url("URL tidak valid").optional().or(z.literal('')),
});

const moduleSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Judul modul harus diisi."),
  topics: z.array(topicSchema).min(1, "Setiap modul harus memiliki setidaknya satu topik."),
  preTestQuizId: z.string().optional(),
  postTestQuizId: z.string().optional(),
  passingScore: z.preprocess(
    (val) => val === '' ? undefined : val,
    z.coerce.number({ invalid_type_error: "Skor harus angka." }).min(0).max(100).optional()
  ),
  weight: z.preprocess(
    (val) => val === '' ? undefined : val,
    z.coerce.number({ invalid_type_error: "Bobot harus angka." }).min(0).max(100).optional()
  ),
});

const courseSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Judul kursus harus diisi."),
  description: z.string().min(1, "Deskripsi harus diisi."),
  thumbnailUrl: z.string().optional().or(z.literal('')),
  categories: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  company: z.string().min(1, "Perusahaan harus dipilih."),
  isProgram: z.boolean().default(false),
  modules: z.array(moduleSchema).min(1, "Kursus harus memiliki setidaknya satu modul."),
  // Legacy fields
  preTestQuizId: z.string().optional(),
  postTestQuizId: z.string().optional(),
  postTestPassingScore: z.preprocess((val) => val === '' ? undefined : val, z.coerce.number().optional()),
  targetAudience: z.object({
    departments: z.array(z.string()).optional(),
    positions: z.array(z.string()).optional(),
    levels: z.array(z.string()).optional(),
    employees: z.array(z.string()).optional(),
  }).default({}),
}).superRefine((data, ctx) => {
    // Legacy validation
    if (!data.isProgram && data.postTestQuizId && data.postTestQuizId !== 'none') {
        if (data.postTestPassingScore === undefined || data.postTestPassingScore === null || isNaN(data.postTestPassingScore)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Skor kelulusan harus diisi jika Post-Test diaktifkan.",
                path: ['postTestPassingScore'],
            });
        }
    }
    // Program Mode validation
    if (data.isProgram) {
      const totalWeight = data.modules.reduce((sum, mod) => sum + (Number(mod.weight) || 0), 0);
      if (Math.abs(totalWeight - 100) > 0.1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Total bobot semua modul harus 100%.",
          path: ["modules"],
        });
      }

      data.modules.forEach((module, index) => {
        if (module.postTestQuizId && module.postTestQuizId !== 'none') {
           if (module.passingScore === undefined || module.passingScore === null || isNaN(module.passingScore)) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "KKM modul harus diisi jika Post-Test diaktifkan.",
                path: [`modules.${index}.passingScore`],
            });
           }
        }
      });
    }
});


type CourseFormValues = z.infer<typeof courseSchema>;

// --- Multi-Select Combobox ---
interface MultiSelectProps {
  options: { label: string; value: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}

function MultiSelect({ options, value, onChange, placeholder }: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 text-left"
        >
          <div className="flex flex-wrap gap-1 w-[calc(100%-2rem)]">
            {value.length > 0
              ? value.map(val => (
                  <Badge variant="secondary" key={val} className="mr-1 mb-1">
                    {options.find(opt => opt.value === val)?.label ?? val}
                  </Badge>
                ))
              : <span className="text-muted-foreground">{placeholder}</span>}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari..." />
          <CommandList>
            <CommandEmpty>Tidak ada hasil.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    const newValue = value.includes(option.value)
                      ? value.filter((v) => v !== option.value)
                      : [...value, option.value];
                    onChange(newValue);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

//--- Tag Input Component ---
function TagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void; }) {
    const [inputValue, setInputValue] = useState('');
    const tags = value || [];
  
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && inputValue.trim()) {
        e.preventDefault();
        const newTags = [...new Set([...tags, inputValue.trim()])]; // Ensure uniqueness
        onChange(newTags);
        setInputValue('');
      }
    };
  
    const removeTag = (tagToRemove: string) => {
      const newTags = tags.filter((tag: string) => tag !== tagToRemove);
      onChange(newTags);
    };
  
    return (
      <div>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ketik kategori lalu tekan Enter..."
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag: string, index: number) => (
            <Badge key={index} variant="secondary">
              {tag}
              <button
                type="button"
                className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => removeTag(tag)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    );
  }

// --- Topic Quiz Fields ---
function TopicQuizFields({ moduleIndex, topicIndex, form }: { moduleIndex: number; topicIndex: number; form: any }) {
    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: `modules.${moduleIndex}.topics.${topicIndex}.quiz.options`
    });
  
    return (
      <div className="p-3 border-t mt-4 space-y-3 bg-blue-50 dark:bg-blue-900/20">
        <FormField
          control={form.control}
          name={`modules.${moduleIndex}.topics.${topicIndex}.quiz.question`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold">Pertanyaan Cek Pemahaman</FormLabel>
              <FormControl>
                <Input placeholder="Ketik pertanyaan di sini..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`modules.${moduleIndex}.topics.${topicIndex}.quiz.correctAnswer`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Opsi Jawaban (pilih jawaban yang benar)</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value ?? 0)} className="space-y-2">
                  {fields.map((option, optionIndex) => (
                    <FormField
                      key={option.id}
                      control={form.control}
                      name={`modules.${moduleIndex}.topics.${topicIndex}.quiz.options.${optionIndex}`}
                      render={({ field: optionField }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <RadioGroupItem value={String(optionIndex)} id={`q${topicIndex}-opt${optionIndex}`} />
                          </FormControl>
                          <Input placeholder={`Opsi ${optionIndex + 1}`} {...optionField} value={optionField.value || ''} />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(optionIndex)} disabled={fields.length <= 2}>
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </FormItem>
                      )}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="button" size="sm" variant="outline" onClick={() => append('')}>
          <PlusCircle className="h-4 w-4 mr-2" /> Tambah Opsi
        </Button>
      </div>
    );
  }


// --- Sub-components for the form ---
function ModuleFields({ moduleIndex, form, removeModule, isProgramMode, quizzes }: { moduleIndex: number; form: any; removeModule: (index: number) => void; isProgramMode: boolean; quizzes: LmsQuiz[] }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `modules.${moduleIndex}.topics`,
  });

  const watchedTopics = useWatch({ control: form.control, name: `modules.${moduleIndex}.topics` });

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };
  
  const handleAddQuiz = (topicIndex: number) => {
    form.setValue(`modules.${moduleIndex}.topics.${topicIndex}.quiz`, {
      id: `quiz_${Date.now()}`,
      question: '',
      options: ['', ''],
      correctAnswer: 0
    });
  };

  const handleRemoveQuiz = (topicIndex: number) => {
    form.setValue(`modules.${moduleIndex}.topics.${topicIndex}.quiz`, undefined);
  };

  return (
    <>
    <div className="rounded-lg border bg-muted/30 p-4 space-y-4 relative">
      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-destructive" onClick={() => removeModule(moduleIndex)}>
        <Trash2 className="h-4 w-4" />
      </Button>
      <FormField
        control={form.control}
        name={`modules.${moduleIndex}.title`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Judul Modul #{moduleIndex + 1}</FormLabel>
            <FormControl>
              <Input placeholder="cth., Pengenalan Produk" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {isProgramMode && (
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
            <FormField control={form.control} name={`modules.${moduleIndex}.weight`} render={({ field }) => ( <FormItem><FormLabel>Bobot Modul (%)</FormLabel><FormControl><Input type="number" placeholder="cth., 25" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name={`modules.${moduleIndex}.preTestQuizId`} render={({ field }) => ( <FormItem><FormLabel>Pre-Test (Ops)</FormLabel><Select onValueChange={field.onChange} value={field.value || 'none'}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Kuis" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Tanpa Pre-Test</SelectItem>{quizzes.map(q => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name={`modules.${moduleIndex}.postTestQuizId`} render={({ field }) => ( <FormItem><FormLabel>Post-Test (Ops)</FormLabel><Select onValueChange={field.onChange} value={field.value || 'none'}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Kuis" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Tanpa Post-Test</SelectItem>{quizzes.map(q => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name={`modules.${moduleIndex}.passingScore`} render={({ field }) => ( <FormItem><FormLabel>KKM Modul (%)</FormLabel><FormControl><Input type="number" placeholder="cth., 80" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )}/>
        </div>
      )}

      <div className="pl-4 border-l-2 space-y-3">
        <h4 className="text-sm font-semibold">Topik/Materi</h4>
        {fields.map((topic, topicIndex) => {
          const contentType = watchedTopics?.[topicIndex]?.contentType || 'text';
          const hasQuiz = !!watchedTopics?.[topicIndex]?.quiz;

          return (
            <div key={topic.id} className="border rounded-md bg-background/50">
              <div className="p-3 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Topik #{topicIndex + 1}</p>
                  <Button type="button" variant="link" size="sm" className="text-destructive h-auto p-0" onClick={() => remove(topicIndex)} disabled={fields.length <= 1}>
                      Hapus Topik
                  </Button>
                </div>
                  <FormField
                      control={form.control}
                      name={`modules.${moduleIndex}.topics.${topicIndex}.contentType`}
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel className="text-xs">Tipe Konten</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                  <SelectItem value="text">Teks</SelectItem>
                                  <SelectItem value="video">Video YouTube</SelectItem>
                                  <SelectItem value="link">Sematkan Link</SelectItem>
                              </SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                  )}/>

                 {contentType === 'text' ? (
                     <div className="space-y-4">
                          <FormField
                              control={form.control}
                              name={`modules.${moduleIndex}.topics.${topicIndex}.title`}
                              render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-xs">Judul</FormLabel>
                                  <FormControl>
                                  <Input placeholder="cth., Chapter 1: Introduction" {...field} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name={`modules.${moduleIndex}.topics.${topicIndex}.content`}
                              render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-xs">Konten</FormLabel>
                                  <div className="border rounded-md">
                                      <div className="flex items-center gap-1 border-b p-2 bg-muted/50">
                                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }}><Bold className="h-4 w-4" /></Button>
                                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }}><Italic className="h-4 w-4" /></Button>
                                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); applyFormat('underline'); }}><Underline className="h-4 w-4" /></Button>
                                      </div>
                                      <FormControl>
                                          <div
                                              contentEditable
                                              onBlur={e => field.onChange(e.currentTarget.innerHTML)}
                                              dangerouslySetInnerHTML={{ __html: field.value || '' }}
                                              className="h-32 p-2 focus-visible:ring-2 focus-visible:ring-ring rounded-b-md outline-none text-sm overflow-y-auto"
                                          />
                                      </FormControl>
                                  </div>
                                  <FormMessage />
                              </FormItem>
                              )}
                          />
                     </div>
                 ) : (
                  <>
                    <FormField
                      control={form.control}
                      name={`modules.${moduleIndex}.topics.${topicIndex}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Judul Topik</FormLabel>
                          <FormControl>
                            <Input placeholder="cth., Sejarah Produk" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`modules.${moduleIndex}.topics.${topicIndex}.content`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {contentType === 'video' && "URL Video YouTube"}
                            {contentType === 'link' && "URL untuk disematkan (Google Drive, dll)"}
                          </FormLabel>
                          <FormControl>
                             <Textarea 
                                placeholder={
                                  contentType === 'video' ? "https://www.youtube.com/watch?v=..." :
                                  "https://docs.google.com/presentation/..."
                                }
                                {...field} 
                                className="h-24"
                             />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {contentType === 'video' && (
                        <div className='space-y-4'>
                            <FormField
                                control={form.control}
                                name={`modules.${moduleIndex}.topics.${topicIndex}.description`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="text-xs">Deskripsi Video (Opsional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Berikan sedikit pengantar atau ringkasan tentang video ini." {...field} value={field.value ?? ''} className="h-20" />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`modules.${moduleIndex}.topics.${topicIndex}.hideVideoControls`}
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                    Sembunyikan kontrol pemutar video YouTube
                                    </FormLabel>
                                </FormItem>
                                )}
                            />
                        </div>
                    )}
                  </>
                 )}
                  
                 <FormField
                    control={form.control}
                    name={`modules.${moduleIndex}.topics.${topicIndex}.workbookUrl`}
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center gap-2">
                                <FormLabel className="text-xs">URL Workbook (Opsional)</FormLabel>
                                 <Dialog>
                                    <DialogTrigger asChild>
                                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground"><HelpCircle className="h-4 w-4" /></Button>
                                    </DialogTrigger>
                                    <HelpDialogContent>
                                        <HelpDialogHeader>
                                            <HelpDialogTitle>Cara Mendapatkan Link Google Drive</HelpDialogTitle>
                                            <HelpDialogDescription>
                                                Ikuti langkah ini untuk memastikan file Anda bisa diunduh oleh semua peserta.
                                            </HelpDialogDescription>
                                        </HelpDialogHeader>
                                        <div className="text-sm space-y-2">
                                            <p>1. Buka file di Google Drive, klik tombol <strong>"Bagikan"</strong>.</p>
                                            <p>2. Di bagian "Akses umum", ubah dari "Dibatasi" menjadi <strong>"Siapa saja yang memiliki link"</strong>.</p>
                                            <p>3. Pastikan peran di sampingnya adalah <strong>"Pelihat"</strong>.</p>
                                            <p>4. Klik <strong>"Salin link"</strong> dan tempelkan di kolom ini.</p>
                                        </div>
                                    </HelpDialogContent>
                                </Dialog>
                            </div>
                        <FormControl>
                            <Input placeholder="https://..." {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 {!hasQuiz ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => handleAddQuiz(topicIndex)}>
                        <Lightbulb className="mr-2 h-4 w-4" /> Tambah Kuis Cek Pemahaman
                    </Button>
                ) : (
                    <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveQuiz(topicIndex)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Hapus Kuis dari Topik Ini
                    </Button>
                )}
              </div>

               {hasQuiz && (
                <TopicQuizFields moduleIndex={moduleIndex} topicIndex={topicIndex} form={form} />
              )}
            </div>
          );
        })}
        <div className="pt-4">
             <FormLabel className="text-sm font-semibold">Tambah Konten Baru</FormLabel>
             <div className="grid grid-cols-3 gap-2 mt-2">
                 <Button type="button" variant="outline" className="flex-col h-20" onClick={() => append({ id: `topic_${Date.now()}`, title: '', contentType: 'text', content: '', quiz: undefined, workbookUrl: '', hideVideoControls: false })}>
                     <FileText className="h-6 w-6 mb-1" />
                     Teks
                 </Button>
                 <Button type="button" variant="outline" className="flex-col h-20" onClick={() => append({ id: `topic_${Date.now()}`, title: '', contentType: 'video', content: '', quiz: undefined, workbookUrl: '', hideVideoControls: false })}>
                     <Youtube className="h-6 w-6 mb-1" />
                     YouTube
                 </Button>
                 <Button type="button" variant="outline" className="flex-col h-20" onClick={() => append({ id: `topic_${Date.now()}`, title: '', contentType: 'link', content: '', quiz: undefined, workbookUrl: '', hideVideoControls: false })}>
                     <LinkIcon className="h-6 w-6 mb-1" />
                     Sematkan
                 </Button>
             </div>
        </div>
      </div>
    </div>
    </>
  );
}

// --- Main Sheet Component ---
interface CourseFormSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  course?: Course;
  isCloning?: boolean;
  onSave: (data: any) => void;
  isProgramContext?: boolean;
}

const getNewTopic = (): Omit<LmsTopic, 'id'> & { id?: string } => ({
  id: `topic_${Date.now()}`,
  title: '',
  contentType: 'text',
  content: '',
  quiz: undefined,
  workbookUrl: '',
  hideVideoControls: false,
});

const getNewModule = (): Omit<LmsModule, 'id'> & { id?: string } => ({
  id: `module_${Date.now()}`,
  title: '',
  topics: [getNewTopic()],
  preTestQuizId: 'none',
  postTestQuizId: 'none',
  passingScore: 80,
  weight: 0,
});

const getDefaultCourseData = (defaultCompany: string): CourseFormValues => ({
    title: "",
    description: "",
    thumbnailUrl: "",
    categories: [],
    status: "draft",
    company: defaultCompany,
    isProgram: false,
    modules: [getNewModule()],
    preTestQuizId: "none",
    postTestQuizId: "none",
    postTestPassingScore: undefined,
    targetAudience: { departments: [], positions: [], levels: [], employees: [] },
  });

export function CourseFormSheet({ isOpen, onOpenChange, course, isCloning, onSave, isProgramContext = false }: CourseFormSheetProps) {
  const { quizzes, addQuiz, companies, departments, positions, employees } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();
  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  
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
  
  const companyAndGlobalOptions = useMemo(() => {
    const options = [...manageableCompanies];
    if (userRole === 'superadmin') {
      options.push({ id: 'Global', name: 'Global' } as Company);
    }
    return options;
  }, [manageableCompanies, userRole]);

  const showCompanySelector = userRole === 'superadmin' || (userRole === 'manajemen' && !!userCompany?.isHolding);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: getDefaultCourseData(''),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "modules",
  });

  const isProgramMode = form.watch('isProgram');
  const watchedCompany = form.watch("company");
  const watchedDepartments = form.watch("targetAudience.departments") || [];
  const watchedPositions = form.watch("targetAudience.positions") || [];
  const watchedLevels = form.watch("targetAudience.levels") || [];
  const thumbnailUrl = form.watch("thumbnailUrl");
  const postTestQuizId = form.watch('postTestQuizId');
  const watchedModules = form.watch('modules');
  
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const totalModuleWeight = useMemo(() => {
    if (!isProgramMode || !watchedModules) return 0;
    return watchedModules.reduce((sum, mod) => sum + (Number(mod.weight) || 0), 0);
  }, [isProgramMode, watchedModules]);

  const [companyQuizzes, setCompanyQuizzes] = useState<LmsQuiz[]>([]);

  useEffect(() => {
    if (!quizzes) return;
    const quizMap = new Map<string, LmsQuiz>();
    quizzes.filter(q => q.company === 'Global').forEach(q => quizMap.set(q.title, q));
    const companyToShow = watchedCompany || currentUser?.company;
    if (companyToShow) {
      quizzes.filter(q => q.company === companyToShow).forEach(q => quizMap.set(q.title, q));
    }
    setCompanyQuizzes(Array.from(quizMap.values()));
  }, [quizzes, watchedCompany, currentUser]);

  const filteredDepartments = useMemo(() => {
      if (!watchedCompany) return [];
      return departments.filter(d => d.company === watchedCompany);
  }, [departments, watchedCompany]);

  const filteredPositions = useMemo(() => {
    if (!watchedCompany) return [];
    let companyPositions = positions.filter(p => p.company === watchedCompany);
    if (watchedDepartments.length > 0) {
      return companyPositions.filter(p => watchedDepartments.includes(p.department));
    }
    return companyPositions;
  }, [positions, watchedCompany, watchedDepartments]);

  const filteredEmployees = useMemo(() => {
    if (!watchedCompany) return [];
    let companyEmployees = employees.filter(e => e.company === watchedCompany && e.status === 'Aktif' && e.role === 'user');
    if (watchedDepartments.length > 0) {
      companyEmployees = companyEmployees.filter(e => watchedDepartments.includes(e.department));
    }
    if (watchedPositions.length > 0) {
      companyEmployees = companyEmployees.filter(e => watchedPositions.includes(e.position));
    }
    if (watchedLevels.length > 0) {
      companyEmployees = companyEmployees.filter(e => watchedLevels.includes(e.level));
    }
    return companyEmployees;
  }, [employees, watchedCompany, watchedDepartments, watchedPositions, watchedLevels]);


  // --- State for Quiz Management ---
  const [isQuizSheetOpen, setIsQuizSheetOpen] = useState(false);
  const [quizTarget, setQuizTarget] = useState<'preTest' | 'postTest' | `module-${number}`>('preTest');
  const [quizToEdit, setQuizToEdit] = useState<LmsQuiz | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) return;

    const defaultCompany = (showCompanySelector && manageableCompanies.length > 0)
        ? manageableCompanies[0].name
        : userCompany?.name || '';
    
    let defaultData = getDefaultCourseData(defaultCompany);

    if (isProgramContext) {
        defaultData.isProgram = true;
    }

    if (course) {
        const targetAudience = course.targetAudience || {};
        const sanitizedTargetAudience = {
            departments: Array.isArray(targetAudience.departments) ? targetAudience.departments : [],
            positions: Array.isArray(targetAudience.positions) ? targetAudience.positions : [],
            levels: Array.isArray(targetAudience.levels) ? targetAudience.levels : [],
            employees: Array.isArray(targetAudience.employees) ? targetAudience.employees : [],
        };
        const sanitizedModules = (Array.isArray(course.modules) && course.modules.length > 0)
            ? course.modules.map((mod: any) => ({
                ...getNewModule(),
                ...mod,
                topics: (Array.isArray(mod.topics) && mod.topics.length > 0)
                    ? mod.topics.map((topic: any) => ({ ...getNewTopic(), ...topic }))
                    : [getNewTopic()],
            }))
            : [getNewModule()];

        const dataToLoad = {
            ...defaultData,
            ...course,
            id: isCloning ? undefined : course.id,
            title: isCloning ? `Salinan dari: ${course.title || ''}` : course.title,
            company: isCloning ? (currentUser?.company || defaultData.company) : (course.company || defaultData.company),
            status: 'draft',
            targetAudience: sanitizedTargetAudience,
            modules: sanitizedModules,
            postTestPassingScore: course.postTestPassingScore ?? undefined,
        };

        form.reset(dataToLoad);
    } else {
        form.reset(defaultData);
    }
}, [course, isOpen, isCloning, form, userCompany, manageableCompanies, currentUser, showCompanySelector, isProgramContext]);


  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploadingThumbnail(true);
    setUploadProgress(0);

    const storagePath = `course_thumbnails/${currentUser.company}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload error:", error);
        toast({ variant: "destructive", title: "Gagal Mengunggah", description: error.message });
        setIsUploadingThumbnail(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        form.setValue('thumbnailUrl', downloadURL, { shouldValidate: true });
        setIsUploadingThumbnail(false);
        setUploadProgress(0);
        toast({ title: "Thumbnail Diperbarui" });
      }
    );
  };

  const handleOpenQuizForm = (target: 'preTest' | 'postTest', quizToEdit?: LmsQuiz) => {
    setQuizTarget(target);
    setQuizToEdit(quizToEdit);
    setIsQuizSheetOpen(true);
  };
  
  const handleOpenModuleQuizForm = (moduleIndex: number, target: 'preTestQuizId' | 'postTestQuizId') => {
    setQuizTarget(`module-${moduleIndex}`);
    setIsQuizSheetOpen(true);
  }

  const handleSaveNewQuiz = async (newQuizData: Omit<LmsQuiz, 'id'>) => {
    const company = form.getValues('company');
    const dataWithCompany = { ...newQuizData, company: company || currentUser?.company || '' };
    try {
        const docRef = await addDoc(collection(db, "lmsQuizzes"), dataWithCompany);
        const savedQuiz = { ...dataWithCompany, id: docRef.id };
        setCompanyQuizzes(prev => [...prev, savedQuiz]);
        
        if (quizTarget === 'preTest') {
          form.setValue('preTestQuizId', savedQuiz.id);
        } else if(quizTarget === 'postTest') {
          form.setValue('postTestQuizId', savedQuiz.id);
        } else if (typeof quizTarget === 'string' && quizTarget.startsWith('module-')) {
          const moduleIndex = parseInt(quizTarget.split('-')[1]);
          form.setValue(`modules.${moduleIndex}.postTestQuizId`, savedQuiz.id);
        }

    } catch (e) {
        console.error("Error adding new quiz:", e);
    }
    setQuizToEdit(undefined);
    setIsQuizSheetOpen(false);
  };
  
  const handleSaveCourse = async (data: CourseFormValues) => {
    const cleanedData = sanitizeUndefined(data);
    onSave(cleanedData);
    onOpenChange(false);
  };
  
  const levelOptions: {label: string, value: Employee['level']}[] = [
      { label: 'Direktur', value: 'Direktur' },
      { label: 'Manager', value: 'Manager' },
      { label: 'Supervisor', value: 'Supervisor' },
      { label: 'Staff', value: 'Staff' },
  ];

  const watchedCompanyValue = form.watch("company");
  const isGlobalCourse = watchedCompanyValue === 'Global';

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-4xl lg:max-w-[80vw] xl:max-w-[70vw] flex flex-col h-full p-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveCourse)} className="flex flex-col h-full">
              <SheetHeader className="p-6">
                <SheetTitle>{isCloning ? "Duplikat Kursus" : (course ? 'Ubah Kursus' : 'Buat Kursus Baru')}</SheetTitle>
                <SheetDescription>
                  Isi detail kursus, target peserta, modul, dan materi pembelajaran di bawah ini.
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-6 px-6 py-4">
                  {!isProgramContext && (
                    <FormField control={form.control} name="isProgram" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5"><FormLabel>Learning Pathway Mode</FormLabel><FormDescription>Ubah perhitungan skor akhir berdasarkan bobot setiap modul.</FormDescription></div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                  )}
                  {showCompanySelector && (
                    <FormField control={form.control} name="company" render={({ field }) => (
                        <FormItem><FormLabel>Perusahaan</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih perusahaan" /></SelectTrigger></FormControl><SelectContent>{companyAndGlobalOptions.map((c) => (<SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                  )}
                  <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Judul Kursus</FormLabel><FormControl><Input placeholder="cth., Orientasi Karyawan Baru" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Deskripsi Singkat</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Jelaskan secara singkat tentang kursus ini..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="thumbnailUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thumbnail Kursus</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            {field.value ? (
                              <div className="relative aspect-video w-full max-w-sm rounded-md overflow-hidden border group">
                                <Image src={field.value} alt="Thumbnail preview" fill className="object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <Button 
                                    type="button" 
                                    variant="secondary" 
                                    size="sm" 
                                    onClick={() => thumbnailInputRef.current?.click()}
                                  >
                                    <Upload className="h-4 w-4 mr-2" /> Ganti
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="destructive" 
                                    size="sm" 
                                    onClick={() => field.onChange('')}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Hapus
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6 bg-muted/20">
                                {isUploadingThumbnail ? (
                                  <div className="w-full max-w-xs space-y-2">
                                    <div className="flex justify-between text-xs">
                                      <span>Mengunggah...</span>
                                      <span>{uploadProgress.toFixed(0)}%</span>
                                    </div>
                                    <Progress value={uploadProgress} className="h-1.5" />
                                  </div>
                                ) : (
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => thumbnailInputRef.current?.click()}
                                  >
                                    <Upload className="h-4 w-4 mr-2" /> Unggah Gambar Thumbnail
                                  </Button>
                                )}
                              </div>
                            )}
                            <input
                              type="file"
                              ref={thumbnailInputRef}
                              onChange={handleThumbnailUpload}
                              accept="image/*"
                              className="hidden"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                   <FormField
                    control={form.control}
                    name="categories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategori Kursus</FormLabel>
                        <FormControl>
                           <TagInput value={field.value ?? []} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {!isGlobalCourse && !isProgramContext && (
                   <div className="space-y-4 rounded-md border p-4">
                        <FormLabel className="text-base font-semibold">Target Peserta</FormLabel>
                        <p className="text-sm text-muted-foreground -mt-2">Kosongkan semua filter jika kursus ini untuk semua karyawan di perusahaan.</p>
                        <FormField
                            control={form.control}
                            name="targetAudience.levels"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Level Jabatan</FormLabel>
                                    <MultiSelect
                                        options={levelOptions}
                                        value={field.value ?? []}
                                        onChange={field.onChange}
                                        placeholder="Semua Level"
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="targetAudience.departments"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Departemen</FormLabel>
                                     <MultiSelect
                                        options={filteredDepartments.map(d => ({ label: d.name, value: d.name }))}
                                        value={field.value ?? []}
                                        onChange={(newVal) => {
                                            field.onChange(newVal);
                                            form.setValue('targetAudience.positions', []);
                                            form.setValue('targetAudience.employees', []);
                                        }}
                                        placeholder="Semua Departemen"
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="targetAudience.positions"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Jabatan</FormLabel>
                                <MultiSelect
                                    options={filteredPositions.map(p => ({ label: p.name, value: p.name }))}
                                    value={field.value ?? []}
                                     onChange={(newVal) => {
                                        field.onChange(newVal);
                                        form.setValue('targetAudience.employees', []);
                                    }}
                                    placeholder="Semua Jabatan"
                                />
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="targetAudience.employees"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Karyawan Spesifik</FormLabel>
                                <MultiSelect
                                    options={filteredEmployees.map(e => ({ label: e.name, value: e.id }))}
                                    value={field.value ?? []}
                                    onChange={field.onChange}
                                    placeholder="Semua Karyawan (sesuai filter di atas)"
                                />
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                   </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Modul Pembelajaran</h3>
                    </div>
                    {fields.map((module, index) => (
                      <ModuleFields key={module.id} moduleIndex={index} form={form} removeModule={remove} isProgramMode={isProgramMode} quizzes={companyQuizzes} />
                    ))}
                    <Button type="button" variant="outline" onClick={() => append(getNewModule())}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Tambah Modul
                    </Button>
                    <FormMessage>{form.formState.errors.modules?.root?.message}</FormMessage>
                  </div>

                  {!isProgramMode && (
                  <div className="space-y-6 border-t pt-6">
                    <h3 className="text-lg font-medium">Evaluasi Kursus</h3>
                    <div className="space-y-4">
                      <FormField control={form.control} name="preTestQuizId" render={({ field }) => (
                          <FormItem><FormLabel>Pre-Test (Opsional)</FormLabel><div className="flex items-center gap-2"><Select onValueChange={field.onChange} value={field.value || 'none'}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Kuis dari Bank Soal" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Tanpa Pre-Test</SelectItem>{(companyQuizzes || []).map((q) => (<SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>))}</SelectContent></Select><Button type="button" variant="outline" size="sm" onClick={() => handleOpenQuizForm('preTest')}><PlusCircle className="mr-2 h-4 w-4" />Buat</Button></div><FormMessage /></FormItem>
                      )}/>
                      <FormField control={form.control} name="postTestQuizId" render={({ field }) => (
                          <FormItem><FormLabel>Post-Test (Opsional)</FormLabel><div className="flex items-center gap-2"><Select onValueChange={field.onChange} value={field.value || 'none'}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Kuis dari Bank Soal" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Tanpa Post-Test</SelectItem>{(companyQuizzes || []).map((q) => (<SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>))}</SelectContent></Select><Button type="button" variant="outline" size="sm" onClick={() => handleOpenQuizForm('postTest')}><PlusCircle className="mr-2 h-4 w-4" />Buat</Button></div><FormMessage /></FormItem>
                      )}/>
                      {postTestQuizId && postTestQuizId !== 'none' && (
                         <FormField
                            control={form.control}
                            name="postTestPassingScore"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Skor Kelulusan Post-Test (%)</FormLabel>
                                <FormControl>
                                <Input type="number" placeholder="cth., 80" {...field} value={field.value ?? ''}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                      )}
                    </div>
                  </div>
                  )}

                   <div className="space-y-4 border-t pt-6">
                     <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel>Status Publikasi</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                        {isGlobalCourse ? (
                            <>
                                <SelectItem value="draft">Draf (Disimpan, tidak terlihat oleh Manajemen)</SelectItem>
                                <SelectItem value="published">Diterbitkan (Tersedia untuk Manajemen)</SelectItem>
                            </>
                        ) : (
                            <>
                                <SelectItem value="draft">Draf (Disimpan, tidak terlihat oleh karyawan)</SelectItem>
                                <SelectItem value="published">Diterbitkan (Tersedia untuk karyawan target)</SelectItem>
                            </>
                        )}
                        </SelectContent></Select><FormMessage /></FormItem>
                      )}/>
                   </div>

                </div>
              </ScrollArea>
              <SheetFooter className="mt-auto p-4 border-t flex flex-col sm:flex-row sm:justify-between sm:items-center">
                 {isProgramMode && (
                    <div className="text-sm font-bold">Total Bobot: <span className={totalModuleWeight !== 100 ? 'text-destructive' : 'text-primary'}>{totalModuleWeight.toFixed(0)}%</span></div>
                 )}
                 <div className="flex gap-2 self-end">
                    <SheetClose asChild>
                        <Button type="button" variant="outline">Batal</Button>
                    </SheetClose>
                    <Button type="submit">Simpan Kursus</Button>
                 </div>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <QuizFormSheet
        isOpen={isQuizSheetOpen}
        onOpenChange={setIsQuizSheetOpen}
        onSave={handleSaveNewQuiz}
        quiz={quizToEdit}
      />
    </>
  );
}

// Helper function to sanitize undefined values from object
function sanitizeUndefined(obj: any): any {
    if (obj === null) return null;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(sanitizeUndefined).filter(v => v !== undefined);
    }
    
    const newObj: {[key: string]: any} = {};
    for (const key in obj) {
        if (obj[key] !== undefined) {
            newObj[key] = sanitizeUndefined(obj[key]);
        }
    }
    return newObj;
}
