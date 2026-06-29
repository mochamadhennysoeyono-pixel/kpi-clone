// src/app/(auth)/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCw, TrendingUp, ClipboardCheck, ArrowUpRight, Users, FileClock } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";
import EmailLoginForm from "@/components/auth/EmailLoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

// --- Mockup Component for the right side (FINAL VERSION) ---
const DashboardMockup = () => {
  const svgPattern = `data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg stroke='%23d1d5db' stroke-width='1'%3E%3Cpath d='M40 0v80M0 40h80'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E`;

  return (
    <div 
      className="hidden lg:flex w-3/5 items-center justify-center bg-[#F8F9FA] p-12 relative overflow-hidden"
      style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}
    >
      <div className="w-full max-w-sm bg-[#0F172A] text-white rounded-2xl shadow-2xl p-6 space-y-6 z-10 transform transition-transform duration-500 hover:scale-105">
        <p className="font-bold text-lg">Dashboard HRIS</p>
        <div className="flex justify-between items-center"><p className="text-sm text-slate-400">Analitik Performa</p><p className="text-2xl font-bold flex items-center gap-2">8.5/10 <ArrowUpRight className="w-5 h-5 text-emerald-400" /></p></div>
        <div className="flex justify-between items-center"><p className="text-sm text-slate-400">Tingkat Kehadiran</p><p className="text-2xl font-bold">98%</p></div>
        <div className="flex justify-between items-center"><p className="text-sm text-slate-400">Kontrak Segera Berakhir</p><p className="text-2xl font-bold">3</p></div>
      </div>
      <div className="absolute top-24 right-12 bg-white/70 backdrop-blur-md p-4 rounded-xl border border-white/50 shadow-lg z-20 flex items-center gap-3 w-60 transform transition-transform duration-500 hover:scale-110 animate-fade-in-down"><TrendingUp className="w-7 h-7 text-[#2563EB]" /><div><p className="text-sm text-slate-600">Skor Kinerja</p><p className="text-xl font-bold text-[#0F172A]">92</p></div></div>
      <div className="absolute bottom-24 left-12 bg-white/70 backdrop-blur-md p-4 rounded-xl border border-white/50 shadow-lg z-20 flex items-center gap-3 w-60 transform transition-transform duration-500 hover:scale-110 animate-fade-in-up"><ClipboardCheck className="w-7 h-7 text-[#2563EB]" /><div><p className="text-sm text-slate-600">Persetujuan</p><p className="text-xl font-bold text-[#0F172A]">4</p></div></div>
    </div>
  );
};

// --- Main Page ---
export default function LoginPage() {
  const { currentUser, isLoading, userRole } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("login");

  useEffect(() => {
    if (!isLoading && currentUser) {
      const targetPath = userRole === "manajemen" ? "/reports" : "/action-center";
      router.replace(targetPath);
    }
  }, [isLoading, currentUser, router, userRole]);

  if (isLoading || (!isLoading && currentUser)) {
    const message = currentUser ? "Berhasil masuk, mengarahkan..." : "Memuat Sesi...";
     return (
        <div className="flex h-screen items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <Image src="/logo.png" alt="Perfom Logo" width={120} height={32} />
                <div className="flex items-center gap-2 font-medium text-slate-500">
                    <RefreshCw className="h-4 w-4 animate-spin-slow" />
                    <span>{message}</span>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F0F2F5] flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-6xl flex bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Left Side: Form */}
        <div className="w-full lg:w-2/5 p-8 md:p-12 flex flex-col justify-center">
          <div className="w-full">
            
            <div className="mb-8 flex justify-center">
              <Image src="/logo.png" alt="Perfom Logo" width={180} height={48} />
            </div>
            
            <div className="flex justify-center gap-1 mb-8 bg-slate-200/60 p-1 rounded-full">
                <Button
                    onClick={() => setActiveTab('login')}
                    variant="ghost"
                    className={cn(
                        "w-full rounded-full text-sm font-semibold transition-all duration-300 h-9",
                        activeTab === 'login' 
                            ? "bg-[#0F172A] text-white shadow-md"
                            : "bg-transparent text-slate-500 hover:bg-slate-300/50"
                    )}
                >
                    Masuk Akun
                </Button>
                <Button
                    onClick={() => setActiveTab('register')}
                    variant="ghost"
                    className={cn(
                        "w-full rounded-full text-sm font-semibold transition-all duration-300 h-9",
                        activeTab === 'register' 
                            ? "bg-[#2563EB] text-white shadow-md"
                            : "bg-transparent text-slate-500 hover:bg-slate-300/50"
                    )}
                >
                    Daftar Perusahaan
                </Button>
            </div>

            <div className="animate-fade-in-up">
                {activeTab === 'login' ? <EmailLoginForm /> : <RegisterForm />}
            </div>
          </div>
        </div>

        {/* Right Side: Mockup */}
        <DashboardMockup />
      </div>
    </div>
  );
}
