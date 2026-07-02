// src/app/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { Ripple } from '@/components/ui/ripple';


export default function RootPage() {
  const router = useRouter();
  const { currentUser, isLoading, userRole } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isLoading && isMobile !== undefined) {
      if (currentUser) {
        // Jika sudah login, arahkan ke dashboard sesuai role
        if (userRole === "superadmin") {
          router.replace("/dashboard");
        } else if (userRole === "manajemen") {
          router.replace("/reports");
        } else {
          router.replace("/action-center");
        }
      } else {
        // Jika belum login, arahkan ke halaman login
        router.replace('/login');
      }
    }
  }, [isLoading, currentUser, userRole, isMobile, router]);

  // Render a clean Ripple loading state while the redirect happens.
  return (
     <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <Ripple className="w-24 h-24 text-primary" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">
            Menyiapkan Workspace
          </p>
        </div>
      </div>
  );
}
