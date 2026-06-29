// src/components/memos/memo-composer-dialog.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/auth-context";
import { useMasterData } from "@/contexts/master-data-context";
import type { Employee, Company, Memo } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ChevronsUpDown, Check, User, Users, Building, GitMerge, Loader2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const memoSchema = z.object({
  recipients: z.array(z.string()).min(1, "Pilih setidaknya satu penerima."),
  subject: z.string().min(1, "Subjek harus diisi."),
  message: z.string().min(1, "Pesan tidak boleh kosong."),
});

type MemoFormValues = z.infer<typeof memoSchema>;

interface RecipientOption {
  value: string;
  label: string;
  type: 'group' | 'individual';
  icon: React.ElementType;
}

interface MemoComposerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  replyToMemo?: Memo | null;
}

export function MemoComposerDialog({ isOpen, onOpenChange, replyToMemo }: MemoComposerDialogProps) {
  const { currentUser, userRole } = useAuth();
  const { employees, companies, addMemo } = useMasterData();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<MemoFormValues>({
    resolver: zodResolver(memoSchema),
    defaultValues: { recipients: [], subject: "", message: "" },
  });

  useEffect(() => {
    if (isOpen && replyToMemo) {
      const originalMessage = `\n\n--- Pesan Asli ---\nDari: ${replyToMemo.senderName}\nSubjek: ${replyToMemo.subject}\n\n${replyToMemo.message}`;
      form.reset({
        recipients: [replyToMemo.senderId],
        subject: `Re: ${replyToMemo.subject}`,
        message: originalMessage,
      });
    } else if (isOpen && !replyToMemo) {
      form.reset({ recipients: [], subject: "", message: "" });
    }
  }, [isOpen, replyToMemo, form]);

  const recipientOptions = useMemo((): RecipientOption[] => {
    if (!currentUser) return [];
    
    let groupOptions: RecipientOption[] = [];
    let individualOptions: RecipientOption[] = [];
    const userCompany = companies.find(c => c.name === currentUser.company);

    const getDescendantCompanies = (parentId: string): Company[] => {
      const children = companies.filter(c => c.parentId === parentId);
      return [...children, ...children.flatMap(child => getDescendantCompanies(child.id))];
    };

    if (userRole === 'superadmin') {
      groupOptions.push({ value: 'group_all', label: 'Semua Pengguna', type: 'group', icon: Users });
      companies.forEach(c => {
        groupOptions.push({ value: `group_company_${c.id}`, label: `Grup: ${c.name}`, type: 'group', icon: Building });
      });
      individualOptions = employees.map(e => ({ value: e.id, label: e.name, type: 'individual', icon: User }));

    } else if (userRole === 'manajemen') {
      if (userCompany?.isHolding) {
        const descendantCompanies = getDescendantCompanies(userCompany.id);
        groupOptions.push({ value: `group_company_${userCompany.id}`, label: `Grup: ${userCompany.name} (Internal)`, type: 'group', icon: GitMerge });
        descendantCompanies.forEach(dc => {
          groupOptions.push({ value: `group_company_${dc.id}`, label: `Grup: ${dc.name}`, type: 'group', icon: Building });
        });
        const managedCompanyNames = [userCompany, ...descendantCompanies].map(c => c.name);
        individualOptions = employees.filter(e => managedCompanyNames.includes(e.company)).map(e => ({ value: e.id, label: e.name, type: 'individual', icon: User }));
      } else if (userCompany) {
        groupOptions.push({ value: `group_company_${userCompany.id}`, label: `Grup: ${userCompany.name}`, type: 'group', icon: Building });
        individualOptions = employees.filter(e => e.company === currentUser.company).map(e => ({ value: e.id, label: e.name, type: 'individual', icon: User }));
      }
    } else if (userRole === 'user') {
      const subordinates = employees.filter(e => e.reportsTo === currentUser.id);
      if (subordinates.length > 0) {
        groupOptions.push({ value: 'group_team', label: 'Grup: Seluruh Tim Saya', type: 'group', icon: Users });
        individualOptions.push(...subordinates.map(e => ({ value: e.id, label: e.name, type: 'individual', icon: User })));
      }
      if (currentUser.reportsTo) {
        const supervisor = employees.find(e => e.id === currentUser.reportsTo);
        if (supervisor) {
          individualOptions.push({ value: supervisor.id, label: `${supervisor.name} (Atasan)`, type: 'individual', icon: User });
        }
      }
    }
    
    // Remove duplicates and the current user from individual options
    const uniqueIndividuals = new Map<string, RecipientOption>();
    individualOptions.forEach(opt => {
        if (opt.value !== currentUser.id) {
            uniqueIndividuals.set(opt.value, opt);
        }
    });

    return [
        ...groupOptions.sort((a,b) => a.label.localeCompare(b.label)),
        ...Array.from(uniqueIndividuals.values()).sort((a,b) => a.label.localeCompare(b.label))
    ];

  }, [currentUser, userRole, employees, companies]);

  const getRecipientIds = (selectedValues: string[]): { name: string; id: string }[] => {
    const recipients = new Set<string>(); // Use a Set of IDs to handle duplicates

    selectedValues.forEach(value => {
        if (value === 'group_all') {
            employees.forEach(e => e.id !== currentUser?.id && recipients.add(e.id));
        } else if (value.startsWith('group_company_')) {
            const companyId = value.replace('group_company_', '');
            const company = companies.find(c => c.id === companyId);
            if (company) {
                employees.filter(e => e.company === company.name && e.id !== currentUser?.id).forEach(e => recipients.add(e.id));
            }
        } else if (value === 'group_team' && currentUser) {
            employees.filter(e => e.reportsTo === currentUser.id).forEach(e => recipients.add(e.id));
        } else {
            recipients.add(value);
        }
    });

    return Array.from(recipients).map(id => {
        const employee = employees.find(e => e.id === id);
        return { id, name: employee?.name || 'Unknown User' };
    });
  };


  const onSubmit = async (data: MemoFormValues) => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
        const recipients = getRecipientIds(data.recipients);
        const memoPromises = recipients.map(recipient => 
            addMemo({
                senderId: currentUser.id,
                senderName: currentUser.name,
                recipientId: recipient.id,
                recipientName: recipient.name,
                subject: data.subject,
                message: data.message,
                isRead: false,
                timestamp: serverTimestamp()
            })
        );
        const notificationPromises = recipients.map(recipient => 
            addDoc(collection(db, "notifications"), {
              recipientId: recipient.id,
              senderName: currentUser.name,
              message: `Anda menerima memo baru dari ${currentUser.name} tentang "${data.subject}"`,
              link: `/memos`,
              isRead: false,
              timestamp: serverTimestamp()
            })
        );
        
        await Promise.all([...memoPromises, ...notificationPromises]);
        
        toast({
            title: "Memo Terkirim",
            description: `Pesan Anda telah berhasil dikirim ke ${recipients.length} penerima.`,
        });

        form.reset();
        onOpenChange(false);
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Gagal Mengirim Memo",
            description: e.message || "Terjadi kesalahan saat mengirim pesan.",
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  if (!currentUser) return null;
  
  const isReplying = !!replyToMemo;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) form.reset();
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{isReplying ? "Balas Memo" : "Tulis Memo Baru"}</DialogTitle>
              <DialogDescription>
                {isReplying ? `Membalas pesan dari ${replyToMemo.senderName}` : "Kirim pesan internal ke individu atau grup."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <FormField
                control={form.control}
                name="recipients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kepada</FormLabel>
                     <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant="outline"
                                role="combobox"
                                disabled={isReplying}
                                className={cn(
                                    "w-full justify-between h-auto min-h-10",
                                    !field.value?.length && "text-muted-foreground",
                                    isReplying && "bg-muted/50 cursor-not-allowed"
                                )}
                                >
                                <div className="flex flex-wrap gap-1">
                                {field.value?.length > 0 ? (
                                    field.value.map(val => (
                                         <span key={val} className="bg-muted text-foreground text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                            {recipientOptions.find(o => o.value === val)?.label || employees.find(e => e.id === val)?.name || val}
                                         </span>
                                    ))
                                ) : (
                                    "Pilih penerima grup atau individu..."
                                )}
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        {!isReplying && (
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                               <Command>
                                <CommandInput placeholder="Cari penerima..." />
                                <CommandList>
                                    <CommandEmpty>Tidak ada hasil.</CommandEmpty>
                                    <CommandGroup heading="Grup">
                                    {recipientOptions.filter(o => o.type === 'group').map((option) => (
                                        <CommandItem
                                            key={option.value}
                                            value={option.label}
                                            onSelect={() => {
                                                const currentValues = field.value || [];
                                                const newValue = currentValues.includes(option.value)
                                                ? currentValues.filter(v => v !== option.value)
                                                : [...currentValues, option.value];
                                                form.setValue("recipients", newValue);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value?.includes(option.value) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex items-center gap-2">
                                                <option.icon className="h-4 w-4 text-muted-foreground" />
                                                <span>{option.label}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                    <CommandGroup heading="Individu">
                                        {recipientOptions.filter(o => o.type === 'individual').map((option) => (
                                        <CommandItem
                                            key={option.value}
                                            value={option.label}
                                            onSelect={() => {
                                                const currentValues = field.value || [];
                                                const newValue = currentValues.includes(option.value)
                                                ? currentValues.filter(v => v !== option.value)
                                                : [...currentValues, option.value];
                                                form.setValue("recipients", newValue);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value?.includes(option.value) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex items-center gap-2">
                                                <option.icon className="h-4 w-4 text-muted-foreground" />
                                                <span>{option.label}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </CommandList>
                               </Command>
                            </PopoverContent>
                        )}
                     </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subjek</FormLabel>
                    <FormControl>
                      <Input placeholder="Subjek memo Anda" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Isi Pesan</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tulis pesan Anda di sini..." className="h-40" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kirim Memo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
