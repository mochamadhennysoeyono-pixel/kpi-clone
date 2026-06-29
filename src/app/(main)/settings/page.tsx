
// src/app/(main)/settings/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useMasterData } from "@/contexts/master-data-context";
import type { Company, Employee, EmailTemplate, WhatsappTemplate, CommunicationCategory } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, User, Mail, Shield, Smartphone, Building, GitMerge, FileCode, Tags, Save, Sparkles, AlertCircle, Trash2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";

const accountSchema = z.object({
  name: z.string().min(1, "Nama harus diisi"),
});

type AccountFormValues = z.infer<typeof accountSchema>;

function InfoRow({ label, value, icon: Icon }: { label: string, value: React.ReactNode, icon?: any }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 border-b last:border-b-0 gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {Icon && <Icon className="size-4 opacity-60" />}
                <span>{label}</span>
            </div>
            <div className="text-sm font-semibold">{value || '-'}</div>
        </div>
    )
}

export default function SettingsPage() {
  const { currentUser, userRole, updateUserProfile, setIsLoading: setGlobalLoading } = useAuth();
  const { 
    companies, 
    emailTemplates, 
    whatsappTemplates,
    updateEmailTemplate, 
    deleteEmailTemplate, 
    updateWhatsappTemplate,
    deleteWhatsappTemplate,
    fetchData, 
    initializeDefaultEmailTemplates,
    initializeDefaultWhatsappTemplates
  } = useMasterData();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("profile");
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  
  // Template Editor State (Email)
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<string | null>(null);
  const [isSavingEmailTemplate, setIsSavingEmailTemplate] = useState(false);
  const [isInitializingEmail, setIsInitializingEmail] = useState(false);
  
  // Template Editor State (WA)
  const [selectedWATemplateId, setSelectedWATemplateId] = useState<string | null>(null);
  const [isSavingWATemplate, setIsSavingWATemplate] = useState(false);
  const [isInitializingWA, setIsInitializingWA] = useState(false);
  
  // Deletion State
  const [templateToDelete, setTemplateToDelete] = useState<{id: string, type: 'email' | 'wa', name: string} | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const companyForCurrentUser = companies.find(c => c.name === currentUser?.company);
  const parentCompany = companyForCurrentUser?.parentId ? companies.find(c => c.id === companyForCurrentUser.parentId) : null;

  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: "" }
  });

  useEffect(() => {
    if (currentUser) {
      accountForm.reset({ name: currentUser.name });
    }
  }, [currentUser, accountForm]);

  // --- Email Template Logic ---
  const activeEmailTemplate = useMemo(() => {
      if (!selectedEmailTemplateId) return null;
      return emailTemplates.find(t => t.id === selectedEmailTemplateId);
  }, [selectedEmailTemplateId, emailTemplates]);

  const [emailForm, setEmailForm] = useState({ subject: '', htmlContent: '' });

  useEffect(() => {
      if (activeEmailTemplate) {
          setEmailForm({
              subject: activeEmailTemplate.subject,
              htmlContent: activeEmailTemplate.htmlContent
          });
      }
  }, [activeEmailTemplate]);

  // --- WhatsApp Template Logic ---
  const activeWATemplate = useMemo(() => {
      if (!selectedWATemplateId) return null;
      return whatsappTemplates.find(t => t.id === selectedWATemplateId);
  }, [selectedWATemplateId, whatsappTemplates]);

  const [waForm, setWAForm] = useState({ message: '' });

  useEffect(() => {
      if (activeWATemplate) {
          setWAForm({ message: activeWATemplate.message });
      }
  }, [activeWATemplate]);

  const onAccountSubmit = async (data: AccountFormValues) => {
    if (!currentUser) return;
    setIsSubmittingAccount(true);
    setGlobalLoading(true);
    const result = await updateUserProfile(currentUser.id, { name: data.name });
    if (result.success) {
      toast({ title: "Profil Diperbarui" });
    } else {
      toast({ variant: "destructive", title: "Gagal Memperbarui", description: result.error });
    }
    setIsSubmittingAccount(false);
    setGlobalLoading(false);
  };

  const handleSaveEmailTemplate = async () => {
      if (!selectedEmailTemplateId) return;
      setIsSavingEmailTemplate(true);
      setGlobalLoading(true);
      try {
          await updateEmailTemplate(selectedEmailTemplateId, emailForm);
          toast({ title: "Template Email Disimpan" });
          await fetchData(true);
      } catch (e: any) {
          toast({ variant: 'destructive', title: "Gagal Menyimpan", description: e.message });
      } finally {
          setIsSavingEmailTemplate(false);
          setGlobalLoading(false);
      }
  };

  const handleSaveWATemplate = async () => {
      if (!selectedWATemplateId) return;
      setIsSavingWATemplate(true);
      setGlobalLoading(true);
      try {
          await updateWhatsappTemplate(selectedWATemplateId, waForm);
          toast({ title: "Template WhatsApp Disimpan" });
          await fetchData(true);
      } catch (e: any) {
          toast({ variant: 'destructive', title: "Gagal Menyimpan", description: e.message });
      } finally {
          setIsSavingWATemplate(false);
          setGlobalLoading(false);
      }
  };

  const handleInitEmail = async () => {
      setIsInitializingEmail(true);
      setGlobalLoading(true);
      await initializeDefaultEmailTemplates();
      setIsInitializingEmail(false);
      setGlobalLoading(false);
  };

  const handleInitWA = async () => {
      setIsInitializingWA(true);
      setGlobalLoading(true);
      await initializeDefaultWhatsappTemplates();
      setIsInitializingWA(false);
      setGlobalLoading(false);
  };

  const handleOpenDelete = (e: React.MouseEvent, id: string, type: 'email' | 'wa', name: string) => {
      e.stopPropagation();
      setTemplateToDelete({id, type, name});
      setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
      if (!templateToDelete) return;
      setGlobalLoading(true);
      try {
          if (templateToDelete.type === 'email') {
              await deleteEmailTemplate(templateToDelete.id);
              if (selectedEmailTemplateId === templateToDelete.id) setSelectedEmailTemplateId(null);
          } else {
              await deleteWhatsappTemplate(templateToDelete.id);
              if (selectedWATemplateId === templateToDelete.id) setSelectedWATemplateId(null);
          }
          toast({ title: "Template Dihapus" });
      } catch (e: any) {
          toast({ variant: 'destructive', title: "Gagal Menghapus", description: e.message });
      } finally {
          setTemplateToDelete(null);
          setDeleteDialogOpen(false);
          setGlobalLoading(false);
      }
  };

  const isSuperadmin = userRole === 'superadmin';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
        <div className="space-y-1">
            <h1 className="text-3xl font-bold font-headline tracking-tight">Pengaturan</h1>
            <p className="text-muted-foreground">Kelola profil pribadi dan konfigurasi sistem komunikasi Anda.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={cn("grid w-full mb-8", isSuperadmin ? "grid-cols-3 md:w-[600px]" : "grid-cols-1 md:w-[200px]")}>
                <TabsTrigger value="profile">Profil Saya</TabsTrigger>
                {isSuperadmin && <TabsTrigger value="templates_email">Template Email</TabsTrigger>}
                {isSuperadmin && <TabsTrigger value="templates_wa">Template WhatsApp</TabsTrigger>}
            </TabsList>

            <TabsContent value="profile" className="animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="shadow-lg border-none">
                            <CardHeader className="bg-primary/5">
                                <CardTitle className="flex items-center gap-2">
                                    <User className="size-5 text-primary" />
                                    Informasi Akun
                                </CardTitle>
                                <CardDescription>Detail profil publik dan kredensial Anda.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <Form {...accountForm}>
                                    <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-6">
                                        <FormField
                                            control={accountForm.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nama Lengkap</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} className="h-11" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label>Email Utama</Label>
                                                <div className="flex items-center h-11 px-3 rounded-md bg-muted/50 border text-muted-foreground gap-3">
                                                    <Mail className="size-4 opacity-50" />
                                                    {currentUser?.email}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Nomor Telepon</Label>
                                                <div className="flex items-center h-11 px-3 rounded-md bg-muted/50 border text-muted-foreground gap-3">
                                                    <Smartphone className="size-4 opacity-50" />
                                                    {currentUser?.phone || '-'}
                                                </div>
                                            </div>
                                        </div>
                                        <Button type="submit" disabled={isSubmittingAccount} className="font-bold">
                                            {isSubmittingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Simpan Perubahan Profil
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>

                        <Card className="shadow-lg border-none">
                            <CardHeader className="bg-primary/5">
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="size-5 text-primary" />
                                    Hak Akses & Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-1">
                                <InfoRow label="Status Akun" value={<Badge variant={currentUser?.status === 'Aktif' ? 'default' : 'destructive'}>{currentUser?.status}</Badge>} icon={Shield} />
                                <InfoRow label="Peran Sistem" value={<Badge variant="secondary" className="uppercase font-bold text-[10px]">{currentUser?.role}</Badge>} icon={Shield} />
                                <InfoRow label="Status Login" value={<Badge variant="outline">{currentUser?.loginStatus}</Badge>} icon={Shield} />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="shadow-lg border-none overflow-hidden">
                            <CardHeader className="bg-primary/5">
                                <CardTitle className="flex items-center gap-2">
                                    <Building className="size-5 text-primary" />
                                    Penempatan Kerja
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-1">
                                <InfoRow label="Perusahaan" value={companyForCurrentUser?.name} icon={Building} />
                                {parentCompany && <InfoRow label="Induk Perusahaan" value={parentCompany.name} icon={GitMerge} />}
                                <InfoRow label="Departemen" value={currentUser?.department} icon={Building} />
                                <InfoRow label="Jabatan" value={currentUser?.position} icon={Building} />
                                <InfoRow label="Level Jabatan" value={currentUser?.level} icon={Building} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>

            {isSuperadmin && (
                <TabsContent value="templates_email" className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Daftar Template Email</CardTitle>
                                    <Button variant="ghost" size="sm" onClick={handleInitEmail} disabled={isInitializingEmail}>
                                        {isInitializingEmail ? <Loader2 className="size-3 animate-spin mr-1" /> : <Sparkles className="size-3 mr-1" />}
                                        Reset Default
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-2 space-y-1">
                                    {emailTemplates.length > 0 ? (
                                        emailTemplates.map(template => (
                                            <div
                                                key={template.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setSelectedEmailTemplateId(template.id)}
                                                className={cn(
                                                    "w-full text-left p-3 rounded-lg text-sm transition-all flex flex-col gap-1 group relative cursor-pointer",
                                                    selectedEmailTemplateId === template.id ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs">{template.name}</span>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className={cn("size-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-white transition-opacity")}
                                                        onClick={(e) => handleOpenDelete(e, template.id, 'email', template.name)}
                                                    >
                                                        <Trash2 size={12} />
                                                    </Button>
                                                </div>
                                                <span className="text-[10px] opacity-70 truncate">{template.description}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center py-10 text-xs text-muted-foreground italic">Belum ada template email.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-8">
                            {activeEmailTemplate ? (
                                <Card className="shadow-lg min-h-[600px] flex flex-col">
                                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
                                        <div><CardTitle>{activeEmailTemplate.name}</CardTitle><CardDescription>Edit format email SMTP.</CardDescription></div>
                                        <Button onClick={handleSaveEmailTemplate} disabled={isSavingEmailTemplate}>
                                            {isSavingEmailTemplate && <Loader2 className="size-4 animate-spin mr-2" />}
                                            Simpan Template
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-6 flex-1">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase">Subjek Email</Label>
                                            <Input value={emailForm.subject} onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase">Parameter Tersedia</Label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {activeEmailTemplate.placeholders.map(p => (
                                                    <Badge key={p} variant="secondary" className="font-mono text-[9px] cursor-pointer" onClick={() => { navigator.clipboard.writeText(`{{${p}}}`); toast({ title: "Disalin!" }); }}>{`{{${p}}}`}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2 flex-1 flex flex-col min-h-[400px]">
                                            <Label className="text-[10px] font-black uppercase">Konten HTML</Label>
                                            <Textarea value={emailForm.htmlContent} onChange={(e) => setEmailForm(prev => ({ ...prev, htmlContent: e.target.value }))} className="flex-1 font-mono text-xs" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-muted/20 border-2 border-dashed rounded-3xl opacity-40"><Mail className="size-16 mb-4" /><p className="font-bold">Pilih Template Email</p></div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            )}

            {isSuperadmin && (
                <TabsContent value="templates_wa" className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Daftar Template WhatsApp</CardTitle>
                                    <Button variant="ghost" size="sm" onClick={handleInitWA} disabled={isInitializingWA}>
                                        {isInitializingWA ? <Loader2 className="size-3 animate-spin mr-1" /> : <Sparkles className="size-3 mr-1" />}
                                        Reset Default
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-2 space-y-1">
                                    {whatsappTemplates.length > 0 ? (
                                        whatsappTemplates.map(template => (
                                            <div
                                                key={template.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setSelectedWATemplateId(template.id)}
                                                className={cn(
                                                    "w-full text-left p-3 rounded-lg text-sm transition-all flex flex-col gap-1 group relative cursor-pointer",
                                                    selectedWATemplateId === template.id ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs">{template.name}</span>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className={cn("size-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-white transition-opacity")}
                                                        onClick={(e) => handleOpenDelete(e, template.id, 'wa', template.name)}
                                                    >
                                                        <Trash2 size={12} />
                                                    </Button>
                                                </div>
                                                <span className="text-[10px] opacity-70 truncate">{template.description}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center py-10 text-xs text-muted-foreground italic">Belum ada template WA.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-8">
                            {activeWATemplate ? (
                                <Card className="shadow-lg min-h-[500px] flex flex-col">
                                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
                                        <div><CardTitle>{activeWATemplate.name}</CardTitle><CardDescription>Edit format pesan WA Fonnte.</CardDescription></div>
                                        <Button onClick={handleSaveWATemplate} disabled={isSavingWATemplate}>
                                            {isSavingWATemplate && <Loader2 className="size-4 animate-spin mr-2" />}
                                            Simpan Template
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-6 flex-1">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase">Parameter Tersedia</Label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {activeWATemplate.placeholders.map(p => (
                                                    <Badge key={p} variant="secondary" className="font-mono text-[9px] cursor-pointer" onClick={() => { navigator.clipboard.writeText(`{{${p}}}`); toast({ title: "Disalin!" }); }}>{`{{${p}}}`}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2 flex-1 flex flex-col min-h-[300px]">
                                            <Label className="text-[10px] font-black uppercase">Isi Pesan (Gunakan *teks* untuk bold)</Label>
                                            <Textarea value={waForm.message} onChange={(e) => setWAForm({ message: e.target.value })} className="flex-1 font-sans text-sm leading-relaxed" placeholder="Halo {{nama_pengguna}}..." />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-muted/10 text-[10px] text-muted-foreground italic p-4 flex items-center gap-2">
                                        <AlertCircle className="size-3" /> WhatsApp tidak mendukung HTML. Gunakan format Markdown standar WhatsApp.
                                    </CardFooter>
                                </Card>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-muted/20 border-2 border-dashed rounded-3xl opacity-40"><MessageSquare className="size-16 mb-4" /><p className="font-bold">Pilih Template WhatsApp</p></div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            )}
        </Tabs>

        <DeleteConfirmationDialog 
            isOpen={isDeleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={handleConfirmDelete}
            itemName={templateToDelete?.name || ''}
            itemType={`template ${templateToDelete?.type.toUpperCase()}`}
        />
    </div>
  );
}
