
// src/app/(auth)/register/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import Link from "next/link";
import { Target, AlertCircle, Eye, EyeOff, Phone, CheckCircle2, Loader2 } from 'lucide-react';
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

export default function RegisterPage() {
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
            setTimeout(() => router.push('/login'), 3000);
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
        <div className="flex items-center justify-center min-h-screen bg-background/50 py-12 px-4">
            <Card className="mx-auto max-w-md w-full shadow-2xl text-center p-10 space-y-6 animate-fade-in">
                <div className="flex justify-center">
                    <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle2 className="h-16 w-16 text-green-600" />
                    </div>
                </div>
                <div className="space-y-2">
                    <CardTitle className="text-3xl font-headline text-foreground">Selamat!</CardTitle>
                    <CardDescription className="text-base">
                        Pendaftaran perusahaan <strong>{form.getValues('companyName')}</strong> berhasil dan akun Anda sudah <strong>AKTIF</strong> otomatis.
                    </CardDescription>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg text-sm text-primary font-medium border border-primary/10 leading-relaxed">
                    Nikmati paket TRIAL 14 Hari untuk semua fitur premium. <br /> Informasi login dan panduan telah dikirim ke WhatsApp Anda.
                </div>
                <Button asChild className="w-full h-12 font-bold text-lg">
                    <Link href="/login">Masuk Sekarang</Link>
                </Button>
                <p className="text-xs text-muted-foreground animate-pulse italic">Mengarahkan ke halaman login dalam beberapa detik...</p>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background/50 py-12 px-4">
        <Card className="mx-auto max-w-md w-full shadow-2xl animate-fade-in">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-center gap-2">
                  <Target className="h-8 w-8 text-primary" />
                  <CardTitle className="text-3xl font-headline text-center">
                    Registrasi Perusahaan
                  </CardTitle>
              </div>
            <CardDescription className="text-center text-sm font-medium">
              Daftarkan perusahaan Anda dan dapatkan akses <strong className="text-primary">GRATIS Trial 14 Hari</strong> secara instan.
            </CardDescription>
          </CardHeader>
          <CardContent>
              {error && (
                  <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                          {error}
                      </AlertDescription>
                  </Alert>
              )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Nama Perusahaan</FormLabel>
                          <FormControl>
                              <Input placeholder="cth., PT Maju Mundur" {...field} />
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
                              <FormLabel>Nama Lengkap Anda (Admin Utama)</FormLabel>
                              <FormControl>
                                  <Input placeholder="cth., Budi Santoso" {...field} />
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
                              <FormLabel>Email (Untuk Login)</FormLabel>
                              <FormControl>
                              <Input type="email" placeholder="Masukkan email Anda" {...field} />
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
                              <FormLabel>Nomor WhatsApp (Aktif)</FormLabel>
                              <FormControl>
                                  <div className="relative">
                                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input type="tel" placeholder="628123456789" {...field} className="pl-10" />
                                  </div>
                              </FormControl>
                              <FormDescription className="text-[10px] text-muted-foreground">
                                  Gunakan format internasional tanpa tanda + (cth: 62812...)
                              </FormDescription>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kata Sandi</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type={showPassword ? "text" : "password"} {...field} />
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
                          <FormLabel>Konfirmasi Kata Sandi</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type={showConfirmPassword ? "text" : "password"} {...field} />
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
                    <Button type="submit" className="w-full h-11 font-bold shadow-lg" disabled={isLoading}>
                      {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Memproses Akun...</> : 'Daftar & Aktifkan Sekarang'}
                    </Button>
              
                <div className="mt-4 text-center text-sm">
                  Sudah punya akun?{' '}
                  <Link href="/login" className="underline font-semibold text-primary hover:text-primary/80 transition-colors">
                    Masuk di sini
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
    </div>
  );
}
