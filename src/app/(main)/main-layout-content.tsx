// src/app/(main)/main-layout-content.tsx
"use client";

import React from 'react';
import Header from '@/components/layout/header';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useMasterData } from '@/contexts/master-data-context';
import { BottomNav } from '@/components/layout/bottom-nav';
import { AppSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePageContext } from '@/contexts/page-context';
import { cn } from '@/lib/utils';
import { Ripple } from '@/components/ui/ripple';
import { getActiveModuleFromPath } from '@/lib/nav-items';

export default function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading: isAuthLoading, userRole } = useAuth();
  const { isLoading: isMasterDataLoading } = useMasterData();
  const { hideBottomNav } = usePageContext();
  const router = useRouter();
  const isMobile = useIsMobile();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      router.replace('/login');
    }
  }, [isAuthLoading, currentUser, router]);
  
  const totalIsLoading = isAuthLoading || isMasterDataLoading;

  const isPortal = pathname === '/portal';
  const isDocEditor = pathname.startsWith('/document-management/templates/');
  
  // Sidebar is hidden on the Portal and for the Document Editor
  const hideSidebar = isPortal || isDocEditor;

  if (totalIsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6">
          <Ripple className="w-16 h-16 text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">
            Sinkronisasi Data...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  if (isDocEditor) {
    return <div className="h-screen flex flex-col bg-white overflow-hidden">{children}</div>;
  }

  return (
    <div className="flex h-screen bg-white text-foreground overflow-hidden relative">
      {!hideSidebar && <AppSidebar />}
      
      {/* 
          PENTING: 'min-w-0' pada container flex-1 adalah kunci 
          agar layout tidak pecah saat sidebar terbuka.
      */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative h-full">
        <Header />
        
        <div className="flex-1 min-h-0 min-w-0 flex flex-col relative overflow-hidden">
            <ScrollArea className="flex-1 w-full h-full">
                <main className="w-full min-w-0">
                    <div className={cn(
                        "p-4 sm:p-6 lg:p-10 w-full min-w-0",
                        // Menambahkan padding bawah pada mobile agar tidak tertutup bottom nav
                        isMobile && !isPortal && "pb-24", 
                        isPortal && "lg:p-12 max-w-7xl mx-auto"
                    )}>
                        {children}
                    </div>
                </main>
            </ScrollArea>
        </div>
      </div>
      
      {isMobile && !hideBottomNav && <BottomNav />}
    </div>
  );
}
