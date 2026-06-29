// src/components/auth/RegisterForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { AlertCircle, Eye, EyeOff, Phone, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth, type CompanyRegistrationData } from "@/contexts/auth-context";

const registerSchema = z.object({
    name: z.string().min(2, "Nama lengkap Anda harus diisi"),
    companyName: z.string().min(2, "Nama perusahaan harus diisi"),
    email: z.string().email("Format email tidak valid"),
    phone: z.string().min(10, "Nomor HP minimal 10 karakter"),
    password: z.string().min(6, "Kata sandi minimal 6 karakter"),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { registerCompanyAccount } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      companyName: "",
      email: "",
      phone: "62",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setError(null);
    setIsLoading(true);
    try {
        const payload: CompanyRegistrationData = {
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          companyName: data.companyName,
        };

        const result = await registerCompanyAccount(payload);

        if (result.success) {
             toast({
                title: "Registrasi Berhasil!",
                description: "Akun Anda sudah aktif dengan paket Trial 14 hari.",
            });
            setIsSuccess(true);
        } else {
            setError(result.error || "Terjadi kesalahan saat mendaftar.");
        }
    } catch (e) {
        console.error("Registration submission failed:", e);
        setError("Terjadi kesalahan pada server. Silakan coba lagi.");
    } finally {
        setIsLoading(false);
    }
  };
  
  if (isSuccess) {
    return (
        <div className="text-center p-4 space-y-6 animate-fade-in">
             <div className="flex justify-center">
                <div className="bg-green-100 p-4 rounded-full">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
            </div>
            <div className="space-y-2">
                <p className="text-2xl font-bold text-foreground">Pendaftaran Berhasil!</p>
                <p className="text-sm text-muted-foreground">
                    Silakan periksa email Anda untuk verifikasi dan beralih ke tab "Masuk Akun" untuk login.
                </p>
            </div>
            <div className="p-3 bg-primary/5 rounded-lg text-xs text-primary font-medium border border-primary/10">
                Anda telah mendapatkan akses <strong className="font-bold">TRIAL 14 Hari</strong> untuk semua fitur premium.
            </div>
        </div>
    );
  }

  return (
    <div className="animate-fade-in">
        <div className="text-center mb-6">
             <h2 className="text-xl font-bold text-slate-800">Daftar Akun Perusahaan</h2>
        </div>

        {error && (
            <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    {error}
                </AlertDescription>
            </Alert>
        )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-sm">Nama Perusahaan</FormLabel>
                    <FormControl>
                        <Input placeholder="cth., PT Maju Mundur" {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-sm">Nama Lengkap Anda (Admin Utama)</FormLabel>
                        <FormControl>
                            <Input placeholder="cth., Budi Santoso" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-sm">Email (Untuk Login)</FormLabel>
                        <FormControl>
                        <Input type="email" placeholder="nama@perusahaan.com" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-sm">Nomor WhatsApp (Aktif)</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="tel" placeholder="628123456789" {...field} className="pl-10 h-11" />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Kata Sandi</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} {...field} className="h-11" />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                            onClick={() => setShowPassword(prev => !prev)}
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Konfirmasi Kata Sandi</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showConfirmPassword ? "text" : "password"} {...field} className="h-11" />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                            onClick={() => setShowConfirmPassword(prev => !prev)}
                        >
                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-bold bg-[#2563EB] hover:bg-[#1E40AF] text-white shadow-lg transition-all duration-300 transform hover:scale-105"
                disabled={isLoading}
               >
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Memproses...</> : 'Daftar & Aktifkan'}
              </Button>
        </form>
      </Form>
    </div>
  );
}
