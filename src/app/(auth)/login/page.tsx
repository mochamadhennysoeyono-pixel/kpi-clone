// src/app/(auth)/login/page.tsx
"use client";

import { useEffect, useState, FormEvent, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Phone, Mail, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import Link from "next/link";
import EmailLoginForm from "@/components/auth/EmailLoginForm";
import PhoneLoginForm from "@/components/auth/PhoneLoginForm";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import { useIsMobile } from "@/hooks/use-mobile";


// --- Main Page ---
export default function LoginPage() {
  const { currentUser, isLoading, userRole } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const isMobile = useIsMobile();

  // Redirect setelah login
  useEffect(() => {
    // Pastikan status login dan deteksi mobile sudah siap
    if (!isLoading && currentUser && isMobile !== undefined) {
      if (isMobile) {
        // Tampilan Mobile
        if (userRole === "superadmin") {
          router.replace("/dashboard");
        } else if (userRole === "manajemen") {
          router.replace("/reports");
        } else {
          router.replace("/action-center"); // Default mobile home untuk user/atasan
        }
      } else {
        // Tampilan Desktop
        if (userRole === "superadmin") {
          router.replace("/dashboard");
        } else if (userRole === "manajemen") {
          router.replace("/reports");
        } else {
          router.replace("/action-center"); // Default desktop home
        }
      }
    }
  }, [isLoading, currentUser, router, userRole, isMobile]);

  const LoadingScreen = () => (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
           {/* GIF Container with cropping */}
           <div className="w-48 h-48 overflow-hidden rounded-full flex items-center justify-center">
             <Image 
                src="https://cdn.scalev.id/uploads/1761922925/t47Pkl_wNcAaWuCOexzPdQ/Video-Robot-Lari-dan-Melambai-unscreen.gif"
                alt="Loading..."
                width={341} // Original GIF width (16:9 ratio for 192 height)
                height={192} // Let the height dictate the scale
                priority
                unoptimized
                className="w-auto h-full max-w-none"
            />
           </div>
          <div className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
              <RefreshCw className="h-4 w-4 animate-spin-slow" />
              <span>Performa Dalam Genggaman</span>
          </div>
        </div>
      </div>
  );
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (currentUser) {
    return (
       <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
           {/* GIF Container with cropping */}
           <div className="w-48 h-48 overflow-hidden rounded-full flex items-center justify-center">
             <Image 
                src="https://cdn.scalev.id/uploads/1761922925/t47Pkl_wNcAaWuCOexzPdQ/Video-Robot-Lari-dan-Melambai-unscreen.gif"
                alt="Loading..."
                width={341} // Original GIF width (16:9 ratio for 192 height)
                height={192} // Let the height dictate the scale
                priority
                unoptimized
                className="w-auto h-full max-w-none"
            />
           </div>
          <div className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
              <RefreshCw className="h-4 w-4 animate-spin-slow" />
              <span>Berhasil masuk, mengarahkan...</span>
          </div>
        </div>
      </div>
    );
  }

  const logoUrl = theme === 'dark' 
    ? "https://cdn.scalev.id/uploads/1761479088/xFJINSeSDNexO-6P4yJiUw/1761479088448-k-(22).webp"
    : "https://cdn.scalev.id/uploads/1761479058/gCopUyafm3sdQ-bUDtHQaw/1761479058364-k-(21).webp";


  return (
    <div className="flex items-center justify-center min-h-screen bg-background/50">
      <Card className="mx-auto max-w-sm w-full shadow-2xl rounded-2xl">
        <CardHeader className="space-y-4 p-6">
          <div className="flex items-center justify-center">
            <Image
              src={logoUrl}
              alt="Logo"
              width={240}
              height={64}
              priority
            />
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-0">
            <div className="text-center mb-6 mt-4">
                <p className="text-xl font-bold">Selamat datang!</p>
                <p className="text-sm text-muted-foreground">
                    {loginMethod === "email"
                    ? "Silakan masuk dengan email atau akun Google Anda."
                    : "Masukkan nomor handphone untuk menerima kode verifikasi."}
                </p>
            </div>

          {loginMethod === "email" ? (
            <Fragment>
              <EmailLoginForm />

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Atau lanjutkan dengan
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <GoogleLoginButton />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLoginMethod("phone")}
                >
                  <Phone className="mr-2 h-4 w-4" /> Masuk dengan No. Handphone
                </Button>
              </div>
            </Fragment>
          ) : (
            <PhoneLoginForm onBackToEmail={() => setLoginMethod("email")} />
          )}

          <Separator className="my-6" />
          <div className="mt-4 text-center text-sm">
            Perusahaan atau leader baru?{" "}
            <Link href="/register" className="underline font-semibold">
              Daftar di sini
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
