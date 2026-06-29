
"use client";

import { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PhoneLoginFormProps {
  onBackToEmail: () => void;
}

export default function PhoneLoginForm({ onBackToEmail }: PhoneLoginFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const { toast } = useToast();

  // --- Inisialisasi reCAPTCHA (invisible) ---
  useEffect(() => {
    if (typeof window !== "undefined" && !window.recaptchaVerifier) {
      let container = document.getElementById("recaptcha-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "recaptcha-container";
        document.body.appendChild(container); // Append to body to persist across renders
      }

      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: (response: any) => {
          console.log("reCAPTCHA verified automatically");
        },
        "expired-callback": () => {
          console.warn("reCAPTCHA expired, please try sending OTP again.");
        },
      });
      
      window.recaptchaVerifier.render().catch((error) => {
        console.error("reCAPTCHA render error:", error);
      });
    }
  }, []);

  // --- Kirim OTP ---
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) {
        throw new Error("reCAPTCHA belum siap. Coba segarkan halaman.");
      }

      const formattedPhone = phoneNumber.startsWith("+62")
        ? phoneNumber
        : phoneNumber.startsWith("0")
        ? `+62${phoneNumber.substring(1)}`
        : `+62${phoneNumber}`;

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      
      setConfirmationResult(confirmation);
      setStep("otp");
      toast({
        title: "Kode OTP Terkirim",
        description: `Kode verifikasi telah dikirim ke ${formattedPhone}`,
      });
    } catch (error: any) {
      console.error("Gagal mengirim OTP:", error);
      let errorMessage = "Gagal mengirim OTP. Pastikan nomor benar dan reCAPTCHA aktif.";
       if (error.code === 'auth/too-many-requests') {
          errorMessage = "Terlalu banyak percobaan. Silakan coba lagi nanti.";
      }
       if (error.code === 'auth/invalid-phone-number') {
          errorMessage = "Format nomor telepon tidak valid. Gunakan format +628xxxxxxxx.";
      }
       if (error.code === 'auth/invalid-app-credential') {
          errorMessage = "Kredensial aplikasi tidak valid. Pastikan domain Anda sudah diizinkan di Firebase Console.";
      }
      toast({
        variant: "destructive",
        title: "Gagal Mengirim OTP",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Verifikasi OTP ---
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!confirmationResult) throw new Error("Konfirmasi OTP tidak ditemukan.");
      await confirmationResult.confirm(otpCode);
      toast({
        title: "Berhasil Login!",
        description: "Anda akan diarahkan ke dasbor."
      });
      // Login berhasil, onAuthStateChanged akan menangani sisanya
    } catch (error: any) {
      console.error("Verifikasi OTP gagal:", error);
      toast({
        variant: "destructive",
        title: "Verifikasi Gagal",
        description: "Kode OTP salah atau sudah kedaluwarsa.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {step === "phone" ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <Input
            type="tel"
            placeholder="+6281234567890"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
            disabled={isLoading}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Kirim Kode OTP"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBackToEmail}
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Login Email
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <Input
            type="text"
            placeholder="Masukkan kode OTP"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            required
            disabled={isLoading}
            inputMode="numeric"
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verifikasi & Masuk"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setStep("phone")}
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Gunakan Nomor Lain
          </Button>
        </form>
      )}
    </div>
  );
}
