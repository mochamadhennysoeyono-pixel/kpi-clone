
// src/app/(main)/portal/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Halaman Portal (Legacy)
 * Dialihkan ke Workspace untuk standarisasi nama baru.
 */
export default function PortalRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect otomatis ke Workspace
    router.replace("/workspace");
  }, [router]);

  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 text-muted-foreground animate-pulse">
      <Loader2 className="size-8 animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Mengarahkan ke Workspace...</p>
    </div>
  );
}
