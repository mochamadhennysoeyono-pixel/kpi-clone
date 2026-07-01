// src/app/(auth)/login/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";

// =================================================================
// LOGIN PAGE - NOW FULLY FUNCTIONAL
// =================================================================


// --- Right Side Visual Panel ---
const BrandingVisual = () => {
  return (
    <div 
      className="hidden lg:flex w-1/2 items-center justify-center bg-slate-900 p-12 relative overflow-hidden"
    >
      <div className="z-10 text-center flex flex-col items-center">
        <h1 className="text-5xl font-semibold text-white tracking-tight">
          Unlock Your Team's Potential.
        </h1>
        <p className="mt-4 text-lg text-slate-300 max-w-[45ch]">
          The all-in-one HRIS platform designed to elevate performance and build a culture of excellence.
        </p>
      </div>
       <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
       <div className="absolute -top-48 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
    </div>
  );
};

// --- Form Implementations (FULLY WIRED) ---

const EmailLoginForm = () => {
  const { loginWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const result = await loginWithEmail(email, password);
    setIsLoading(false);
    if (!result.success) {
      setError(result.error || 'Terjadi kesalahan.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-sm text-red-700 p-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="email">Email Address</Label>
        <Input 
          type="email" 
          id="email" 
          placeholder="nama@perusahaan.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input 
          type="password" 
          id="password" 
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <Button type="submit" className="w-full font-semibold h-10" disabled={isLoading}>
        {isLoading ? <RefreshCw className="h-4 w-4 animate-spin-slow" /> : 'Masuk'}
      </Button>
    </form>
  );
};

const RegisterForm = () => {
    const { registerCompanyAccount } = useAuth();
    const [formData, setFormData] = useState({
        companyName: '',
        adminName: '',
        email: '',
        whatsapp: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError('Konfirmasi kata sandi tidak cocok.');
            return;
        }
        setError(null);
        setIsLoading(true);

        const result = await registerCompanyAccount({
            name: formData.adminName,
            email: formData.email,
            companyName: formData.companyName,
            phone: formData.whatsapp,
            password: formData.password,
        });

        setIsLoading(false);

        if (result.success) {
             toast({
                title: "Pendaftaran Berhasil!",
                description: result.message || "Akun Anda telah dibuat. Silakan login untuk melanjutkan.",
                variant: "success",
            });
             // Optionally, switch to login tab
        } else {
            setError(result.error || 'Terjadi kesalahan saat pendaftaran.');
        }
    };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-sm text-red-700 p-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="companyName">Nama Perusahaan</Label>
        <Input type="text" id="companyName" placeholder="cth., PT Maju Mundur" value={formData.companyName} onChange={handleChange} required disabled={isLoading} />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="adminName">Nama Lengkap Anda (Admin Utama)</Label>
        <Input type="text" id="adminName" placeholder="cth., Budi Santoso" value={formData.adminName} onChange={handleChange} required disabled={isLoading} />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="email">Email (Untuk Login)</Label>
        <Input type="email" id="email" placeholder="admin@kpi.com" value={formData.email} onChange={handleChange} required disabled={isLoading} />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="whatsapp">Nomor WhatsApp (Aktif)</Label>
        <Input type="tel" id="whatsapp" placeholder="62812..." value={formData.whatsapp} onChange={handleChange} required disabled={isLoading} />
        <p className="text-xs text-slate-500 mt-1">Gunakan format internasional tanpa tanda + (cth: 62812...)</p>
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="password">Kata Sandi</Label>
        <Input type="password" id="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required disabled={isLoading} />
      </div>
       <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi</Label>
        <Input type="password" id="confirmPassword" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required disabled={isLoading}/>
      </div>
      <Button type="submit" className="w-full font-semibold h-10" disabled={isLoading}>
        {isLoading ? <RefreshCw className="h-4 w-4 animate-spin-slow" /> : 'Daftar & Aktifkan Sekarang'}
      </Button>
    </form>
  );
};


// --- Main Page (Calibrated Layout) ---
export default function LoginPage() {
  const { currentUser, isLoading: isAuthLoading, userRole } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("login");

  useEffect(() => {
    if (!isAuthLoading && currentUser) {
      const targetPath = userRole === "superadmin" ? "/dashboard" : "/beranda"; // MOD: Changed /reports to /beranda for non-superadmin
      router.replace(targetPath);
    }
  }, [isAuthLoading, currentUser, router, userRole]);

  if (isAuthLoading || (!isAuthLoading && currentUser)) {
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
          
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">
            {activeTab === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun Perusahaan'}
          </h2>
          <p className="text-slate-600 mb-6">
            {activeTab === 'login' 
              ? 'Masuk untuk melanjutkan ke dasbor Anda.' 
              : 'Mulai perjalanan Anda untuk optimasi SDM.'}
          </p>
          
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
