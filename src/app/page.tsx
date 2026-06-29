// src/app/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';


export default function RootPage() {
  const router = useRouter();
  const { currentUser, isLoading, userRole } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isLoading && isMobile !== undefined) {
      if (currentUser) {
        // Jika sudah login, arahkan ke dashboard sesuai role dan device
        if (isMobile) {
          if (userRole === "superadmin") router.replace("/dashboard");
          else if (userRole === "manajemen") router.replace("/reports");
          else router.replace("/action-center");
        } else {
          if (userRole === "superadmin") router.replace("/dashboard");
          else if (userRole === "manajemen") router.replace("/reports");
          else router.replace("/action-center");
        }
      } else {
        // Jika belum login, arahkan ke halaman login
        router.replace('/login');
      }
    }
  }, [isLoading, currentUser, userRole, isMobile, router]);

  // Render a loading indicator while the redirect happens.
  return (
     <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
           <div className="w-48 h-48 overflow-hidden rounded-full flex items-center justify-center">
             <Image 
                src="https://cdn.scalev.id/uploads/1761922925/t47Pkl_wNcAaWuCOexzPdQ/Video-Robot-Lari-dan-Melambai-unscreen.gif"
                alt="Loading..."
                width={341}
                height={192}
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
}
