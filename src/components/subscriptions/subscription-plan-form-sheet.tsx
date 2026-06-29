
// src/components/subscriptions/subscription-plan-form-sheet.tsx
"use client";

import { useEffect } from "react";
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
  FormDescription
} from "@/components/ui/form";
import type { SubscriptionPlan } from "@/types";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
    PlusCircle, 
    Trash2, 
    Shield, 
    GraduationCap, 
    ClipboardCheck, 
    LayoutGrid, 
    CheckCircle2, 
    GitMerge,
    Target,
    FileText,
    Bot,
    Info
} from "lucide-react";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

const planSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama paket harus diisi"),
  title: z.string().optional(),
  description: z.string().min(1, "Deskripsi harus diisi"),
  subscriptionDescription: z.string().optional(),
  price: z.coerce.number().min(0, "Harga minimal 0"),
  userLimit: z.coerce.number().int("Limit harus angka bulat").min(-1, "Limit minimal -1 untuk tak terbatas"),
  managementUserLimit: z.coerce.number().int("Limit harus angka bulat").min(-1, "Limit minimal -1 untuk tak terbatas"),
  companyLimit: z.coerce.number().int("Limit harus angka bulat").min(-1, "Limit minimal -1 untuk tak terbatas"),
  durationDays: z.coerce.number().int("Durasi harus angka bulat").min(1, "Durasi minimal 1 hari"),
  status: z.enum(['Active', 'Draft']),
  benefitList: z.array(z.object({ text: z.string() })),
  features: z.object({
    allowHolding: z.boolean().default(false),
    allowKpi: z.boolean().default(true),
    allowKbo: z.boolean().default(true),
    allowReporting: z.boolean().default(true),
    allowLms: z.boolean().default(false),
    allowCollabSpace: z.boolean().default(true),
    allowOkr: z.boolean().default(true),
    allowAiFeatures: z.boolean().default(false),
    allowDocumentManagement: z.boolean().default(false),
  }),
});

type PlanFormValues = z.infer<typeof planSchema>;

interface SubscriptionPlanFormSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan?: SubscriptionPlan;
  onSave: (data: Omit<SubscriptionPlan, 'id'> & { id?: string }) => void;
}

export function SubscriptionPlanFormSheet({ isOpen, onOpenChange, plan, onSave }: SubscriptionPlanFormSheetProps) {
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      title: "",
      description: "",
      subscriptionDescription: "",
      price: 0,
      userLimit: 50,
      managementUserLimit: 5,
      companyLimit: 1,
      durationDays: 365,
      status: "Active",
      benefitList: [{ text: "" }],
      features: {
        allowHolding: false,
        allowKpi: true,
        allowKbo: true,
        allowReporting: true,
        allowLms: false,
        allowCollabSpace: true,
        allowOkr: true,
        allowAiFeatures: false,
        allowDocumentManagement: false,
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "benefitList"
  });

  const allowHolding = form.watch('features.allowHolding');

  useEffect(() => {
    if (isOpen) {
      if (plan) {
        form.reset({
          ...plan,
          name: plan.name || "",
          title: plan.title || "",
          description: plan.description || "",
          subscriptionDescription: plan.subscriptionDescription || "",
          price: plan.price ?? 0,
          userLimit: plan.userLimit ?? -1,
          managementUserLimit: plan.managementUserLimit ?? -1,
          companyLimit: plan.companyLimit ?? 0,
          durationDays: plan.durationDays ?? 30,
          benefitList: plan.benefitList ? plan.benefitList.map(t => ({ text: t })) : [{ text: "" }],
        });
      } else {
        form.reset({
          name: "",
          title: "",
          description: "",
          subscriptionDescription: "",
          price: 0,
          userLimit: 50,
          managementUserLimit: 5,
          companyLimit: 1,
          durationDays: 365,
          status: "Active",
          benefitList: [{ text: "" }],
          features: {
            allowHolding: false,
            allowKpi: true,
            allowKbo: true,
            allowReporting: true,
            allowLms: false,
            allowCollabSpace: true,
            allowOkr: true,
            allowAiFeatures: false,
            allowDocumentManagement: false,
          },
        });
      }
    }
  }, [plan, form, isOpen]);

  const onSubmit = (data: PlanFormValues) => {
    const finalData = {
        ...data,
        benefitList: data.benefitList.map(b => b.text).filter(t => t.trim() !== ""),
    };
    onSave(finalData as any);
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="p-6 border-b bg-muted/20">
              <SheetTitle className="font-headline text-xl">
                {plan ? 'Ubah Rencana Berlangganan' : 'Tambah Rencana Berlangganan'}
              </SheetTitle>
              <SheetDescription>
                Konfigurasi detail paket, harga, dan fitur yang tersedia untuk klien.
              </SheetDescription>
            </SheetHeader>
            
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nama Paket</FormLabel><FormControl><Input placeholder="cth., TRIAL atau PROFESSIONAL" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Judul Badge</FormLabel>
                            <FormControl><Input placeholder="cth., 14 Days Free Trial" {...field} /></FormControl>
                            <FormDescription className="text-[10px]">Akan muncul sebagai badge title saat user berlangganan.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Deskripsi Singkat</FormLabel><FormControl><Textarea placeholder="Ketikkan deskripsi singkat tentang paket..." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem><FormLabel>Harga (Rp)</FormLabel><FormControl><Input type="number" placeholder="Rp. Masukkan harga paket" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="durationDays" render={({ field }) => (
                        <FormItem><FormLabel>Durasi Aktif (Hari)</FormLabel><FormControl><Input type="number" placeholder="cth., 14 atau 365" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <FormField control={form.control} name="userLimit" render={({ field }) => (
                        <FormItem><FormLabel>Limit Staff (User)</FormLabel><FormControl><Input type="number" placeholder="Masukkan jumlah staff" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 bg-muted/10">
                            <Label>Status Aktif</Label>
                            <FormControl>
                                <Switch 
                                    checked={field.value === 'Active'} 
                                    onCheckedChange={(val) => field.onChange(val ? 'Active' : 'Draft')} 
                                />
                            </FormControl>
                        </FormItem>
                    )}/>
                </div>

                <Separator />

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" /> Detail Paket (Manfaat)</h4>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => form.setValue('benefitList', [{ text: '' }])}>Bersihkan</Button>
                            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => append({ text: "" })}>Tambah Detail</Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground w-6">{index + 1}</span>
                                <FormField
                                    control={form.control}
                                    name={`benefitList.${index}.text`}
                                    render={({ field: itemField }) => (
                                        <FormControl><Input placeholder="Teks detail manfaat..." {...itemField} className="h-9" /></FormControl>
                                    )}
                                />
                                <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => remove(index)} disabled={fields.length === 1}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                <Separator />

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold flex items-center gap-2"><LayoutGrid className="size-4 text-primary" /> Konfigurasi Modul & Fitur</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FeatureSwitch form={form} name="features.allowKpi" label="Modul KPI" icon={ClipboardCheck} />
                        <FeatureSwitch form={form} name="features.allowKbo" label="Modul KBO" icon={Shield} />
                        <FeatureSwitch form={form} name="features.allowOkr" label="Modul OKR" icon={Target} />
                        <FeatureSwitch form={form} name="features.allowLms" label="Modul LMS" icon={GraduationCap} />
                        <FeatureSwitch form={form} name="features.allowCollabSpace" label="CollabSpace" icon={LayoutGrid} />
                        <FeatureSwitch form={form} name="features.allowAiFeatures" label="Fitur AI (KIPI)" icon={Bot} />
                        <FeatureSwitch form={form} name="features.allowDocumentManagement" label="Manajemen Dokumen" icon={FileText} />
                        <FeatureSwitch form={form} name="features.allowHolding" label="Akses Holding" icon={GitMerge} />
                        <FeatureSwitch form={form} name="features.allowReporting" label="Analisis Laporan" icon={Info} />
                    </div>
                    
                    {allowHolding && (
                        <FormField control={form.control} name="companyLimit" render={({ field }) => (
                            <FormItem className="mt-4 p-4 border rounded-xl bg-blue-50/50">
                                <FormLabel>Limit Anak Perusahaan (Grup)</FormLabel>
                                <FormControl><Input type="number" {...field} className="bg-background" /></FormControl>
                                <FormDescription className="text-[10px]">Berapa banyak perusahaan yang bisa dikelola di bawah satu induk.</FormDescription>
                            </FormItem>
                        )}/>
                    )}
                </div>
              </div>
            </ScrollArea>

            <SheetFooter className="p-6 border-t bg-muted/20">
              <div className="flex w-full justify-between items-center">
                <SheetClose asChild>
                    <Button type="button" variant="ghost">Kembali</Button>
                </SheetClose>
                <Button type="submit" className="px-8 font-bold shadow-lg">Simpan Rencana</Button>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function FeatureSwitch({ form, name, label, icon: Icon }: { form: any, name: string, label: string, icon: any }) {
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <div className="flex items-center justify-between p-3 rounded-xl border bg-background hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                            <Icon className="size-4 text-muted-foreground" />
                        </div>
                        <Label className="text-xs font-bold cursor-pointer" htmlFor={name}>{label}</Label>
                    </div>
                    <Switch 
                        id={name}
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                        className="scale-75"
                    />
                </div>
            )}
        />
    )
}
