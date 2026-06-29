// src/components/lms/quiz-form-sheet.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
} from "@/components/ui/form";
import type { LmsQuiz, LmsQuizQuestion, Company } from "@/types";
import { ScrollArea } from "../ui/scroll-area";
import { PlusCircle, Trash2, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";


// --- Zod Schema Definitions ---
const questionSchema = z.object({
  id: z.string(),
  question: z.string().min(1, "Pertanyaan tidak boleh kosong."),
  options: z.array(z.string().min(1, "Opsi tidak boleh kosong")).min(2, "Minimal harus ada dua opsi jawaban."),
  correctAnswer: z.coerce.number().min(0, "Jawaban benar harus dipilih."),
  points: z.coerce.number().min(1, "Poin minimal adalah 1.").default(10),
});

const quizSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Judul kuis harus diisi."),
  questions: z.array(questionSchema).min(1, "Kuis harus memiliki setidaknya satu pertanyaan."),
  company: z.string().min(1, "Perusahaan harus dipilih."),
});

type QuizFormValues = z.infer<typeof quizSchema>;

// --- Sub-components for the form ---
function QuestionFields({ questionIndex, form, removeQuestion }: { questionIndex: number; form: any; removeQuestion: (index: number) => void; }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `questions.${questionIndex}.options`,
  });

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-4 relative">
      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-destructive" onClick={() => removeQuestion(questionIndex)}>
        <Trash2 className="h-4 w-4" />
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-[1fr,120px] gap-4">
        <FormField
          control={form.control}
          name={`questions.${questionIndex}.question`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pertanyaan #{questionIndex + 1}</FormLabel>
              <FormControl>
                <Textarea placeholder="Ketik pertanyaan di sini..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name={`questions.${questionIndex}.points`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Poin</FormLabel>
              <FormControl>
                <Input type="number" placeholder="10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="pl-4 border-l-2 space-y-3">
        <FormLabel>Opsi Jawaban & Kunci Jawaban</FormLabel>
        <FormField
            control={form.control}
            name={`questions.${questionIndex}.correctAnswer`}
            render={({ field }) => (
                <FormItem className="space-y-3">
                    <FormControl>
                        <RadioGroup
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={String(field.value)}
                            className="space-y-2"
                        >
                            {fields.map((option, optionIndex) => (
                                <FormField
                                    key={option.id}
                                    control={form.control}
                                    name={`questions.${questionIndex}.options.${optionIndex}`}
                                    render={({ field: optionField }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value={String(optionIndex)} id={`q${questionIndex}-opt${optionIndex}`} />
                                            </FormControl>
                                            <div className="flex-1">
                                                <Input placeholder={`Opsi ${optionIndex + 1}`} {...optionField} />
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(optionIndex)} disabled={fields.length <= 2}>
                                                <X className="h-4 w-4" />
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
        <Button type="button" variant="outline" size="sm" onClick={() => append('')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Opsi
        </Button>
      </div>
    </div>
  );
}

// --- Main Sheet Component ---
interface QuizFormSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  quiz?: LmsQuiz;
  isCloning?: boolean;
  onSave: (data: any) => void;
}

export function QuizFormSheet({ isOpen, onOpenChange, quiz, isCloning, onSave }: QuizFormSheetProps) {
  const { companies } = useMasterData();
  const { currentUser, userRole } = useAuth();
  
  const form = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: "",
      questions: [],
      company: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });
  
  const totalPoints = form.watch('questions').reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  const showCompanySelector = userRole === 'superadmin' || (userRole === 'manajemen' && !!userCompany?.isHolding);

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

  useEffect(() => {
    if (isOpen) {
      const defaultCompany = userCompany?.name || manageableCompanies[0]?.name || '';
      if (quiz) {
        form.reset({
          ...quiz,
          id: isCloning ? undefined : quiz.id,
          title: isCloning ? `Salinan: ${quiz.title}` : quiz.title,
          company: quiz.company || defaultCompany,
          questions: quiz.questions.map(q => ({
            ...q,
            options: q.options || [],
            correctAnswer: q.correctAnswer ?? 0,
            points: q.points ?? 10,
          }))
        });
      } else {
        form.reset({
          title: "",
          questions: [{ id: `q_${Date.now()}`, question: '', options: ['', ''], correctAnswer: 0, points: 10 }],
          company: defaultCompany,
        });
      }
    }
  }, [quiz, isOpen, form, isCloning, userCompany, manageableCompanies]);

  const onSubmit = (data: QuizFormValues) => {
    console.log("Quiz data submitted:", data);
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader className="p-6">
              <SheetTitle>{isCloning ? 'Duplikat Kuis' : (quiz ? 'Ubah Kuis' : 'Buat Kuis Baru')}</SheetTitle>
              <SheetDescription>
                Buat kuis untuk evaluasi. Skor akhir dihitung dari persentase total poin yang didapat.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-6 px-6 py-4">
                {showCompanySelector && (
                  <FormField control={form.control} name="company" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Perusahaan</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Pilih perusahaan" /></SelectTrigger></FormControl>
                          <SelectContent>{manageableCompanies.map(c => (<SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>))}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                  )}/>
                )}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Judul Kuis</FormLabel>
                      <FormControl>
                        <Input placeholder="cth., Pre-Test Orientasi Produk" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-4">
                  <div className='space-y-1.5'>
                    <h3 className="text-lg font-medium">Daftar Pertanyaan</h3>
                    <p className="text-sm text-muted-foreground">
                      Total Poin untuk kuis ini: <span className="font-bold text-primary">{totalPoints}</span>
                    </p>
                  </div>
                  {fields.map((question, index) => (
                    <QuestionFields key={question.id} questionIndex={index} form={form} removeQuestion={remove} />
                  ))}
                  <Button type="button" variant="outline" onClick={() => append({ id: `q_${Date.now()}`, question: '', options: ['', ''], correctAnswer: 0, points: 10 })}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Pertanyaan
                  </Button>
                  <FormMessage>{form.formState.errors.questions?.root?.message}</FormMessage>
                </div>
              </div>
            </ScrollArea>
            <SheetFooter className="mt-auto p-6 border-t">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </SheetClose>
              <Button type="submit">Simpan Kuis</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
