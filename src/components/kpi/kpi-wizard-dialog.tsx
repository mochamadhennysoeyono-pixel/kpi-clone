// src/components/kpi/kpi-wizard-dialog.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Loader2, Wand2, ArrowRight, Check, Bot, Trash2, PlusCircle } from "lucide-react";
import { useMasterData } from "@/contexts/master-data-context";
import { ScrollArea } from "../ui/scroll-area";
import { runKpiWizard } from "@/actions/kpiWizard.action";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Separator } from "../ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import type { CompanyObjective, KpiWizardInput, InterviewPhaseOutput, DesignPhaseOutput, ChatMessage } from "@/types";

// Define a type for chat messages that can hold React nodes
type DisplayMessage = {
    id: string;
    role: 'user' | 'model';
    content: string; // The raw string content for history
    node: React.ReactNode; // The renderable node
};


// --- Form Validation Schemas ---
const formSchema = z.object({
  textInput: z.string().optional(),
  checkboxInput: z.array(z.string()).optional(),
  radioInput: z.string().optional(),
});

type WizardFormData = z.infer<typeof formSchema>;

const objectiveItemSchema = z.object({
    id: z.string().optional(),
    objectiveName: z.string().min(1, "Deskripsi tujuan tidak boleh kosong."),
    bscPerspective: z.enum(["Financial", "Customer & Market", "Internal Business Process", "Learning & Growth"], { required_error: "Perspektif BSC harus dipilih" }),
    strategicFocus: z.enum(["Growth", "Efficiency", "Quality", "Compliance"], { required_error: "Fokus strategis harus dipilih" }),
});

const objectivesFormSchema = z.object({
    objectives: z.array(objectiveItemSchema).min(1, "Harus ada minimal satu objective."),
});
type ObjectivesFormData = z.infer<typeof objectivesFormSchema>;



// --- Chat UI Components ---
const BotMessage = React.memo(({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 size-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
      <Bot size={20} />
    </div>
    <div className="p-3 rounded-lg bg-muted max-w-[90%]">
      {children}
    </div>
  </div>
));
BotMessage.displayName = 'BotMessage';

const UserMessage = React.memo(({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-3 justify-end">
    <div className="p-3 rounded-lg bg-primary text-primary-foreground max-w-[90%]">
      {children}
    </div>
  </div>
));
UserMessage.displayName = 'UserMessage';


// --- In-Chat Objective Form ---
function InChatObjectiveForm({ onSave, onCancel, isLoading, company, period }: { onSave: (data: Omit<CompanyObjective, 'id'>[]) => void, onCancel: () => void, isLoading: boolean, company: string, period: string }) {
    const objectiveForm = useForm<ObjectivesFormData>({
        resolver: zodResolver(objectivesFormSchema),
        defaultValues: {
            objectives: [{
                objectiveName: "",
                bscPerspective: "Financial",
                strategicFocus: "Growth",
            }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: objectiveForm.control,
        name: "objectives"
    });

    const handleSave = (data: ObjectivesFormData) => {
        const objectivesToSave = data.objectives.map(obj => ({
            ...obj,
            company,
            period,
        }));
        onSave(objectivesToSave);
    };

    return (
        <FormProvider {...objectiveForm}>
            <form onSubmit={objectiveForm.handleSubmit(handleSave)} className="space-y-4 p-4 border rounded-lg bg-background">
                <h3 className="font-semibold text-center">Tambah Objective Perusahaan ({period})</h3>
                <ScrollArea className="max-h-64">
                    <div className="space-y-4 pr-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/50">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-destructive" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                                <FormField
                                    control={objectiveForm.control}
                                    name={`objectives.${index}.objectiveName`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nama / Deskripsi Tujuan</FormLabel>
                                            <FormControl><Textarea placeholder="cth., Meningkatkan profitabilitas..." {...field} disabled={isLoading} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={objectiveForm.control} name={`objectives.${index}.bscPerspective`} render={({ field }) => (<FormItem><FormLabel>Perspektif BSC</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isLoading}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                                        <SelectItem value="Financial">Financial</SelectItem>
                                        <SelectItem value="Customer & Market">Customer & Market</SelectItem>
                                        <SelectItem value="Internal Business Process">Internal Business Process</SelectItem>
                                        <SelectItem value="Learning & Growth">Learning & Growth</SelectItem>
                                    </SelectContent></Select><FormMessage /></FormItem>)}/>
                                    <FormField control={objectiveForm.control} name={`objectives.${index}.strategicFocus`} render={({ field }) => (<FormItem><FormLabel>Fokus Strategis</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isLoading}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                                        <SelectItem value="Growth">Growth</SelectItem>
                                        <SelectItem value="Efficiency">Efficiency</SelectItem>
                                        <SelectItem value="Quality">Quality</SelectItem>
                                        <SelectItem value="Compliance">Compliance</SelectItem>
                                    </SelectContent></Select><FormMessage /></FormItem>)}/>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ objectiveName: '', bscPerspective: 'Financial', strategicFocus: 'Growth' })} disabled={isLoading}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Objective Lain
                </Button>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>Batal</Button>
                    <Button type="submit" disabled={isLoading}>
                         {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                         Simpan Objective
                    </Button>
                </div>
            </form>
        </FormProvider>
    )
}


// --- Main Dialog Component ---
interface KPIWizardDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  prefilledData: {
    jobTitle: string;
    department: string;
    jobLevel: 'Staff' | 'Supervisor' | 'Manager' | 'Direktur';
    company: string;
  };
  onComplete: (suggestions: any[]) => void;
}

export function KPIWizardDialog({ isOpen, onOpenChange, prefilledData, onComplete }: KPIWizardDialogProps) {
  const { companyObjectives, addCompanyObjective } = useMasterData();
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [selectedResults, setSelectedResults] = useState<any[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isAddingObjective, setIsAddingObjective] = useState(false);
  
  const [currentAIResponse, setCurrentAIResponse] = useState<InterviewPhaseOutput | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const form = useForm<WizardFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { textInput: "", checkboxInput: [], radioInput: "" },
  });

  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

  const relevantObjectives = useMemo(() => {
    return companyObjectives.filter(obj => obj.period === currentYear && obj.company === prefilledData.company);
  }, [companyObjectives, currentYear, prefilledData.company]);

  const addMessage = useCallback((role: 'model' | 'user', content: React.ReactNode, idSuffix?: string) => {
    const stringContent = typeof content === 'string' ? content : 'React Component';
    setMessages(prev => {
        const newMessage: DisplayMessage = {
            id: `${Date.now()}-${idSuffix || prev.length}`,
            role: role as 'user' | 'model',
            content: stringContent,
            node: content,
        };
        if (prev.some(p => p.id === newMessage.id)) return prev;
        return [...prev, newMessage];
    });
  }, []);

  const startConversation = useCallback(async () => {
    setIsLoading(true);
    setMessages([]);
    setResults([]);
    setSelectedResults([]);
    setIsFinished(false);
    setCurrentAIResponse(null);
    setIsAddingObjective(false);
    form.reset();
  
    const introMessage = `Halo! Aku KIPI, konsultan AI yang akan membantumu membuat setup KPI.`;
    addMessage('bot', introMessage, 'intro');
  
    if (relevantObjectives.length === 0) {
      const contextMessage = (
        <Card className="bg-background">
            <CardHeader><CardTitle className="text-base">Konteks yang Akan Dianalisis</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
                <p><strong>Jabatan:</strong> {prefilledData.jobTitle}</p>
                <p><strong>Departemen:</strong> {prefilledData.department}</p>
                <p><strong>Level:</strong> {prefilledData.jobLevel}</p>
                <Separator className="my-2"/>
                <p className="font-semibold">Objective Perusahaan ({currentYear}):</p>
                <div className="text-destructive text-xs p-2 bg-destructive/10 rounded-md">
                    <p>Objective perusahaan untuk tahun ini belum ada. AI memerlukan ini sebagai jangkar strategi.</p>
                    <Button variant="link" className="p-0 h-auto font-semibold text-xs" onClick={() => setIsAddingObjective(true)}>
                        Klik di sini untuk menambahkan sekarang.
                    </Button>
                </div>
            </CardContent>
        </Card>
      );
      addMessage('bot', contextMessage, 'context-missing');
      setIsLoading(false);
      return;
    }

    const contextMessage = (
       <Card className="bg-background">
        <CardHeader><CardTitle className="text-base">Konteks yang Akan Dianalisis</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Jabatan:</strong> {prefilledData.jobTitle}</p>
          <p><strong>Departemen:</strong> {prefilledData.department}</p>
          <p><strong>Level:</strong> {prefilledData.jobLevel}</p>
          <Separator className="my-2"/>
          <p className="font-semibold">Objective Perusahaan ({currentYear}):</p>
          <ul className="list-disc pl-5">
              {relevantObjectives.map(obj => <li key={obj.id}>{obj.objectiveName}</li>)}
          </ul>
        </CardContent>
      </Card>
    );
     addMessage('bot', contextMessage, 'context-ok');

    try {
        const payload: KpiWizardInput = {
            phase: 'INITIALIZE',
            context: prefilledData,
            companyObjectives: relevantObjectives.map(o => ({ objectiveName: o.objectiveName, bscPerspective: o.bscPerspective })),
            history: [],
        };
        
        const response = await runKpiWizard(payload);
        if (!response.success || !response.data || response.data.phase !== 'INTERVIEW') {
            throw new Error(response.error || 'Respons AI tidak valid.');
        }

        const initialAIResponse = response.data;
        setCurrentAIResponse(initialAIResponse);
        addMessage('bot', initialAIResponse.responseText, 'q1');
    } catch(e: any) {
        const traceId = `INIT-${Date.now()}`;
        addMessage('bot', `Maaf, terjadi kesalahan saat memulai percakapan. (Ref: ${traceId})`, 'error-start');
        console.error(`[AIError] Trace ID: ${traceId}`, { error: e.message, stack: e.stack });
    } finally {
        setIsLoading(false);
    }
  }, [prefilledData, relevantObjectives, currentYear, addMessage, form]);
  
  const handleSaveObjective = async (data: Omit<CompanyObjective, 'id'>[]) => {
    setIsLoading(true);
    try {
        await Promise.all(data.map(obj => addCompanyObjective(obj)));
        setIsAddingObjective(false);
    } catch (e: any) {
        addMessage('bot', "Maaf, terjadi kesalahan saat menyimpan Objective. Silakan coba lagi.", 'error-save-obj');
        setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      startConversation();
    }
  }, [isOpen, relevantObjectives.length]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  }, [messages, isLoading, isAddingObjective]);

  const handleSendMessage = useCallback(async (formData: WizardFormData) => {
    if (!currentAIResponse) return;

    let userAnswer = '';
    switch (currentAIResponse.nextInputType) {
        case 'textarea': userAnswer = formData.textInput || ''; break;
        case 'checkbox_financial': userAnswer = formData.checkboxInput?.join(', ') || ''; break;
        case 'radio_customer': userAnswer = formData.radioInput || ''; break;
    }
    
    if (!userAnswer.trim()) return;

    const userHistory: ChatMessage[] = messages
        .map(m => ({ role: m.role, content: m.content as string }));

    addMessage('user', userAnswer);
    setIsLoading(true);
    setCurrentAIResponse(null);
    form.reset();

    const currentChatHistory: ChatMessage[] = [...userHistory, { role: 'user', content: userAnswer }];

    const payload: KpiWizardInput = {
      phase: 'INTERVIEW',
      context: prefilledData,
      companyObjectives: relevantObjectives.map(obj => ({
        objectiveName: obj.objectiveName,
        bscPerspective: obj.bscPerspective,
      })),
      history: currentChatHistory,
    };

    try {
        const response = await runKpiWizard(payload);
        if (!response.success || !response.data || response.data.phase !== 'INTERVIEW') {
            throw new Error(response.error || 'Respons AI tidak valid.');
        }

        const nextAIResponse = response.data;
        
        if (nextAIResponse.isFinished) {
            setIsFinished(true);
            addMessage('bot', nextAIResponse.responseText, 'finished');
            
            const designPayload: KpiWizardInput = {
              ...payload,
              phase: 'DESIGN',
              history: [...currentChatHistory, {role: 'model', content: nextAIResponse.responseText}]
            };
            
            const designResponse = await runKpiWizard(designPayload);
            if (!designResponse.success || !designResponse.data || designResponse.data.phase !== 'DESIGN') {
                throw new Error(designResponse.error || 'Respons desain KPI tidak valid.');
            }
            
            const kpiResult = designResponse.data;
            setResults(kpiResult.suggestions);
            setSelectedResults(kpiResult.suggestions);

        } else {
            setCurrentAIResponse(nextAIResponse);
            addMessage('bot', nextAIResponse.responseText, `q${messages.length}`);
        }

    } catch (e: any) {
        const traceId = `CHAT-${Date.now()}`;
        addMessage('bot', `Maaf, terjadi kesalahan. (Ref: ${traceId})`, 'error-send');
        console.error(`[AIError] Trace ID: ${traceId}`, { error: e.message, stack: e.stack });
    } finally {
        setIsLoading(false);
    }
  }, [currentAIResponse, messages, addMessage, form, prefilledData, relevantObjectives]);

  useEffect(() => {
    if (results.length > 0) {
      addMessage('bot',
        <div className="space-y-2">
            <p className="font-semibold">Ini dia hasilnya! Pilih KPI yang ingin kamu tambahkan.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                {results.map((res: any, index: number) => (
                    <Card key={index} className="p-3 bg-background">
                        <div className="flex items-start gap-4">
                            <Checkbox id={`res-final-${index}`} defaultChecked onCheckedChange={(checked) => {
                                if(checked) setSelectedResults(prev => [...prev, res]);
                                else setSelectedResults(prev => prev.filter(s => s.indicator !== res.indicator));
                            }}/>
                            <div className="grid gap-1.5">
                                <Label htmlFor={`res-final-${index}`} className="font-semibold cursor-pointer">{res.indicator}</Label>
                                <p className="text-xs text-muted-foreground">{res.reasoning}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>,
      'results');
    }
  }, [results, addMessage]);
  
  const isObjectiveMissing = relevantObjectives.length === 0;

  const renderInputArea = () => {
    if (isLoading || isFinished || isObjectiveMissing || !currentAIResponse) return null;
    
    const inputType = currentAIResponse.nextInputType;
    
    return (
        <FormProvider {...form}>
            <form className="w-full space-y-4" onSubmit={form.handleSubmit(handleSendMessage)}>
                {inputType === 'textarea' && (
                    <FormField control={form.control} name="textInput" render={({ field }) => (
                      <FormItem><FormControl><Textarea placeholder="Ketik jawabanmu di sini..." {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                )}
                {inputType === 'checkbox_financial' && (
                     <FormField control={form.control} name="checkboxInput" render={() => (
                        <FormItem className="grid grid-cols-2 gap-2">
                            {['Revenue', 'Cost Control', 'Profit Margin', 'Budget Management', 'Tidak langsung (support)'].map(item => (<FormField key={item} control={form.control} name="checkboxInput" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 bg-background hover:bg-accent/50 has-[:checked]:border-primary"><FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => checked ? field.onChange([...(field.value || []), item]) : field.onChange((field.value || []).filter(v => v !== item))} /></FormControl><FormLabel className="font-normal">{item}</FormLabel></FormItem>
                            )}/>))}
                        <FormMessage />
                        </FormItem>
                    )}/>
                )}
                {inputType === 'radio_customer' && (
                     <FormField control={form.control} name="radioInput" render={({ field }) => (
                        <FormItem><FormControl>
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Internal" /></FormControl><FormLabel className="font-normal">Internal</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="External" /></FormControl><FormLabel className="font-normal">Eksternal</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Keduanya" /></FormControl><FormLabel className="font-normal">Keduanya</FormLabel></FormItem>
                            </RadioGroup>
                        </FormControl><FormMessage /></FormItem>
                    )}/>
                )}
                <div className="flex justify-end">
                    <Button type="submit">
                        Kirim
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 /> AI KPI Wizard
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
            <ScrollArea className="h-full pr-4 -mr-6" viewportRef={scrollAreaRef}>
                {isAddingObjective ? (
                    <div className="px-1 py-4">
                        <InChatObjectiveForm 
                            onSave={handleSaveObjective}
                            onCancel={() => setIsAddingObjective(false)}
                            isLoading={isLoading}
                            company={prefilledData.company}
                            period={currentYear}
                        />
                    </div>
                ) : (
                    <div className="space-y-4 px-1 py-4">
                        {messages.map(msg => (
                            msg.role === 'model' 
                            ? <BotMessage key={msg.id}>{msg.node}</BotMessage>
                            : <UserMessage key={msg.id}>{msg.node}</UserMessage>
                        ))}
                        {isLoading && !isAddingObjective && (
                            <BotMessage>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>KIPI sedang mengetik...</span>
                                </div>
                            </BotMessage>
                        )}
                    </div>
                )}
            </ScrollArea>
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t">
          {isFinished && !isLoading ? (
             <div className="flex w-full justify-between items-center">
                <DialogClose asChild>
                    <Button variant="ghost">Tutup</Button>
                </DialogClose>
                <Button onClick={() => onComplete(selectedResults)} disabled={selectedResults.length === 0}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Tambahkan ({selectedResults.length}) ke Setup
                </Button>
            </div>
          ) : !isAddingObjective ? (
            renderInputArea()
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
