"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RefreshCw, AlertTriangle, Phone, CheckCircle2, Building, User, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Ripple } from "@/components/ui/ripple";

// --- Right Side Visual Panel ---
const BrandingVisual = () => {
  return (
    <div 
      className="hidden lg:flex w-1/2 items-center justify-center bg-slate-900 p-12 relative overflow-hidden"
    >
      <div className="z-10 text-center flex flex-col items-center">
        <h1 className="text-5xl font-semibold text-white tracking-tight">
          Unlock Your Full Potential.
        </h1>
        <p className="mt-4 text-lg text-slate-300 max-w-[45ch]">
          The all-in-one performance platform designed to elevate individual growth and build a culture of excellence.
        </p>
      </div>
       <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
       <div className="absolute -top-48 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
    </div>
  );
};

// --- Form Implementations ---

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
      <Button type="submit" className="w-full font-semibold h-11 bg-slate-900 text-white hover:bg-slate-800" disabled={isLoading}>
        {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Masuk ke Akun'}
      </Button>
    </form>
  );
};

const RegisterForm = ({ onToggle }: { onToggle: (tab: string) => void }) => {
    const { registerCompanyAccount } = useAuth();
    const [formData, setFormData] = useState({
        companyName: '',
        adminName: '',
        email: '',
        whatsapp: '62',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

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
                description: result.message || "Akun Manajemen Anda telah dibuat.",
            });
            setIsSuccess(true);
        } else {
            setError(result.error || 'Terjadi kesalahan saat pendaftaran.');
        }
    };

  if (isSuccess) {
    return (
        <div className="text-center p-4 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex justify-center">
                <div className="bg-green-100 p-4 rounded-full">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
            </div>
            <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Registrasi Berhasil!</h3>
                <p className="text-sm text-muted-foreground">
                    Akun manajemen untuk <strong>{formData.companyName}</strong> telah diaktifkan dengan paket <strong>TRIAL 14 Hari</strong>.
                </p>
            </div>
            <Alert className="bg-blue-50 border-blue-200">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-800">
                    Silakan gunakan tab <strong>Masuk</strong> untuk memulai pengaturan dashboard perusahaan Anda.
                </AlertDescription>
            </Alert>
            <Button onClick={() => onToggle('login')} className="w-full h-11 font-bold bg-slate-900 text-white">
                Beralih ke Halaman Masuk
            </Button>
        </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="companyName">Nama Perusahaan</Label>
        <Input type="text" id="companyName" placeholder="cth., PT Maju Mundur" value={formData.companyName} onChange={handleChange} required disabled={isLoading} />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="adminName">Nama Lengkap Admin</Label>
        <Input type="text" id="adminName" placeholder="cth., Budi Santoso" value={formData.adminName} onChange={handleChange} required disabled={isLoading} />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="email">Email Bisnis</Label>
        <Input type="email" id="email" placeholder="admin@perusahaan.com" value={formData.email} onChange={handleChange} required disabled={isLoading} />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="whatsapp">Nomor WhatsApp</Label>
        <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="tel" id="whatsapp" placeholder="62812..." value={formData.whatsapp} onChange={handleChange} required disabled={isLoading} className="pl-10" />
        </div>
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="password">Kata Sandi</Label>
        <Input type="password" id="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required disabled={isLoading} />
      </div>
       <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi</Label>
        <Input type="password" id="confirmPassword" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required disabled={isLoading}/>
      </div>
      <Button type="submit" className="w-full font-bold h-11 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90" disabled={isLoading}>
        {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Daftar & Aktifkan Perusahaan'}
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
      const targetPath = userRole === "superadmin" ? "/dashboard" : "/beranda";
      router.replace(targetPath);
    }
  }, [isAuthLoading, currentUser, router, userRole]);

  if (isAuthLoading || (!isAuthLoading && currentUser)) {
     return (
        <div className="flex min-h-screen items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-6 text-center">
                <Image src="/logo.png" alt="Perfom Logo" width={140} height={38} unoptimized />
                <Ripple className="w-12 h-12 text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">
                    {currentUser ? "Berhasil masuk, mengarahkan..." : "Memuat Sesi..."}
                </p>
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
            {activeTab === 'login' ? 'Selamat Datang' : 'Daftar Perusahaan'}
          </h2>
          <p className="text-slate-600 mb-6 text-sm">
            {activeTab === 'login' 
              ? 'Masuk untuk memantau progres dan meningkatkan performa Anda.' 
              : 'Mulai transformasi manajemen performa tim Anda hari ini.'}
          </p>
          
          <div className="grid grid-cols-2 gap-2 mb-8 bg-slate-100 p-1 rounded-full border border-slate-200">
              <Button
                  onClick={() => setActiveTab('login')}
                  variant="ghost"
                  className={cn(
                      "w-full rounded-full text-xs font-bold h-9 transition-all",
                      activeTab === 'login' 
                          ? "bg-white text-slate-900 shadow-sm"
                          : "bg-transparent text-slate-500 hover:text-slate-900"
                  )}
              >
                  Masuk Akun
              </Button>
              <Button
                  onClick={() => setActiveTab('register')}
                  variant="ghost"
                  className={cn(
                    "w-full rounded-full text-xs font-bold h-9 transition-all",
                    activeTab === 'register' 
                        ? "bg-white text-slate-900 shadow-sm"
                        : "bg-transparent text-slate-500 hover:text-slate-900"
                )}
              >
                  Registrasi Bisnis
              </Button>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'login' ? <EmailLoginForm /> : <RegisterForm onToggle={setActiveTab} />}
          </div>
        </div>
      </div>

      {/* Right Side: Branding Visual */}
      <BrandingVisual />
    </div>
  );
}
