
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
import { AlertCircle } from 'lucide-react'; 
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePageContext } from '@/contexts/page-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Ripple } from '@/components/ui/ripple';

export default function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading: isAuthLoading, userRole } = useAuth();
  const { companies, isLoading: isMasterDataLoading } = useMasterData();
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

  if (totalIsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
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
  
  // Logic to hide sidebar: for Portal or specific Rooms
  const isPortal = pathname === '/portal';
  const isDocEditor = pathname.startsWith('/document-management/templates/');
  const hideSidebar = isPortal || isDocEditor;

  let contentToRender = children;

  // --- Legacy Subscription Lock logic (to be replaced in later phases) ---
  if (userRole !== 'superadmin') {
      const userCompany = companies.find((c) => c.name === currentUser.company);
      if (userCompany && userCompany.status === 'Tidak Aktif' && !isPortal) {
          contentToRender = (
              <div className="flex flex-col items-center justify-center h-[80vh] w-full text-center p-4">
                  <AlertCircle className="w-16 h-16 text-destructive mb-4 mx-auto" />
                  <h1 className="text-2xl font-bold mb-2">Akses Terbatas</h1>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">Akun perusahaan Anda belum aktif.</p>
                  <Button onClick={() => router.push('/portal')}>Kembali ke Portal</Button>
              </div>
          );
      }
  }

  if (isDocEditor) {
    return (
      <div className="h-screen flex flex-col">
        {contentToRender}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {!hideSidebar && <AppSidebar />}
      
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
        <Header />
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
            <ScrollArea className="flex-1 w-full">
                <main className="w-full min-w-0">
                    <div className={cn(
                        "p-4 sm:p-6 lg:p-8 w-full min-w-0 overflow-hidden",
                        isPortal && "lg:p-12" // More padding for portal
                    )}>
                        {contentToRender}
                    </div>
                </main>
            </ScrollArea>
        </div>
      </div>
      
      {isMobile && !hideBottomNav && <BottomNav />}
    </div>
  );
}
