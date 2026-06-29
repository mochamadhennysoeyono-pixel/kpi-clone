// src/components/auth/EmailLoginForm.tsx
"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import { ForgotPasswordDialog } from "./ForgotPasswordDialog";

export default function EmailLoginForm() {
  const { loginWithEmail, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPassOpen, setForgotPassOpen] = useState(false);

  const handleEmailFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await loginWithEmail(email.toLowerCase(), password);
    if (result && !result.success) {
      setError(result.error || "Gagal masuk. Periksa email dan kata sandi Anda.");
    } else if (!result) {
      setError("Gagal masuk (no response).");
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Selamat Datang di Perfom</h2>
      </div>

      <form onSubmit={handleEmailFormSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="font-semibold text-gray-700 text-sm">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="nama@perusahaan.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-semibold text-gray-700 text-sm">Kata Sandi</Label>
                <Button 
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs text-[#2563EB] hover:text-[#1E40AF] font-semibold"
                  onClick={() => setForgotPassOpen(true)}
                >
                  Lupa Kata Sandi?
                </Button>
            </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button 
          type="submit" 
          className="w-full h-11 text-base font-bold bg-[#0F172A] hover:bg-slate-800 text-white shadow-lg transition-all duration-300 transform hover:scale-105"
          disabled={isLoading}
        >
          {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/> Memproses...</> : "Masuk ke Akun Saya"}
        </Button>
      </form>
      <ForgotPasswordDialog isOpen={isForgotPassOpen} onOpenChange={setForgotPassOpen} />
    </>
  );
}
