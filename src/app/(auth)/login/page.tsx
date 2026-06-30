// src/app/(auth)/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";

// =================================================================
// INJECTING LINEAR.APP DNA (TYPOGRAPHY, SPACING, SHAPES)
// =================================================================


// --- Right Side Visual Panel (Calibrated to Linear's display typography) ---
const BrandingVisual = () => {
  return (
    <div 
      className="hidden lg:flex w-1/2 items-center justify-center bg-slate-900 p-12 relative overflow-hidden"
    >
      <div className="z-10 text-center flex flex-col items-center">
        {/* Based on {typography.display-lg} - 56px, 600w, -1.8px tracking */}
        <h1 className="text-5xl font-semibold text-white tracking-tight">
          Unlock Your Team's Potential.
        </h1>
        {/* Based on {typography.subhead} - 20px, 400w */}
        <p className="mt-4 text-lg text-slate-300 max-w-[45ch]">
          The all-in-one HRIS platform designed to elevate performance and build a culture of excellence.
        </p>
      </div>
       {/* Subtle background glow */}
       <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
       <div className="absolute -top-48 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
    </div>
  );
};

// --- Form Implementations (Calibrated to Linear's specs) ---
const EmailLoginForm = () => {
  return (
    <form className="space-y-4">
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="email">Email Address</Label>
        <Input type="email" id="email" placeholder="nama@perusahaan.com" />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input type="password" id="password" placeholder="••••••••" />
      </div>
      <Button type="submit" className="w-full font-semibold h-10">Masuk</Button>
    </form>
  );
};

const RegisterForm = () => {
  return (
    <form className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="fullname">Nama Lengkap</Label>
          <Input type="text" id="fullname" placeholder="John Doe" />
        </div>
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="company">Nama Perusahaan</Label>
          <Input type="text" id="company" placeholder="PT Sejahtera Abadi" />
        </div>
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="reg-email">Email Perusahaan</Label>
          <Input type="email" id="reg-email" placeholder="admin@perusahaan.com" />
        </div>
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="reg-password">Password</Label>
          <Input type="password" id="reg-password" placeholder="Buat password yang kuat" />
        </div>
      <Button type="submit" className="w-full font-semibold h-10">Daftar & Buat Akun</Button>
    </form>
  );
};


// --- Main Page (Calibrated Layout) ---
export default function LoginPage() {
  const { currentUser, isLoading, userRole } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("login");

  useEffect(() => {
    if (!isLoading && currentUser) {
      const targetPath = userRole === "superadmin" ? "/dashboard" : "/reports";
      router.replace(targetPath);
    }
  }, [isLoading, currentUser, router, userRole]);

  if (isLoading || (!isLoading && currentUser)) {
     return (
        <div className="flex min-h-screen items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4 text-center">
                <Image src="/logo.png" alt="Perfom Logo" width={120} height={32} unoptimized />
                <div className="flex items-center gap-2 font-medium text-slate-500">
                    <RefreshCw className="h-4 w-4 animate-spin-slow" />
                    <span>{currentUser ? "Berhasil masuk, mengarahkan..." : "Memuat Sesi..."}</span>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white flex">
      {/* Left Side: Form (Calibrated) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-sm">
          
          <div className="mb-6">
            <Image src="/logo.png" alt="Perfom Logo" width={140} height={38} unoptimized />
          </div>
          
          {/* Based on {typography.headline} - 28px, 600w, -0.6px tracking */}
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">
            {activeTab === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun Perusahaan'}
          </h2>
          {/* Based on {typography.body} - 16px, 400w */}
          <p className="text-slate-600 mb-6">
            {activeTab === 'login' 
              ? 'Masuk untuk melanjutkan ke dasbor Anda.' 
              : 'Mulai perjalanan Anda untuk optimasi SDM.'}
          </p>
          
          {/* Based on {components.pricing-tab-default/selected} */}
          <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 p-1 rounded-full">
              <Button
                  onClick={() => setActiveTab('login')}
                  variant="ghost"
                  className={cn(
                      "w-full rounded-full text-sm font-semibold h-9",
                      activeTab === 'login' 
                          ? "bg-white text-slate-900 shadow-sm"
                          : "bg-transparent text-slate-600 hover:text-slate-900"
                  )}
              >
                  Masuk
              </Button>
              <Button
                  onClick={() => setActiveTab('register')}
                  variant="ghost"
                  className={cn(
                    "w-full rounded-full text-sm font-semibold h-9",
                    activeTab === 'register' 
                        ? "bg-white text-slate-900 shadow-sm"
                        : "bg-transparent text-slate-600 hover:text-slate-900"
                )}
              >
                  Daftar
              </Button>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {activeTab === 'login' ? <EmailLoginForm /> : <RegisterForm />}
          </div>
        </div>
      </div>

      {/* Right Side: Branding Visual */}
      <BrandingVisual />
    </div>
  );
}