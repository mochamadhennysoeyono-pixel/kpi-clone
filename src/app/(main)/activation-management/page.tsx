// src/app/(main)/activation-management/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Halaman Aktivasi Perusahaan (Legacy)
 * Dialihkan ke Dashboard karena alur registrasi sekarang sudah terintegrasi di Portal & Settings.
 */
export default function ActivationManagementPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect otomatis ke dashboard pusat kendali
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 text-muted-foreground animate-pulse">
      <Loader2 className="size-8 animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Mengarahkan ke Dashboard...</p>
    </div>
  );
}
