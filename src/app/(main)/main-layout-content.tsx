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
import { Button } from '@/components/ui/button';
import { Ripple } from '@/components/ui/ripple';
import { getActiveModuleFromPath } from '@/lib/nav-items';
import { AlertCircle } from 'lucide-react';

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

  const isSuperAdmin = userRole === 'superadmin';
  const isPortal = pathname === '/portal';
  const isDocEditor = pathname.startsWith('/document-management/templates/');
  const activeModule = getActiveModuleFromPath(pathname);
  
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

  // Final content check logic
  let contentToRender = children;

  if (isDocEditor) {
    return <div className="h-screen flex flex-col bg-white">{contentToRender}</div>;
  }

  return (
    <div className="flex h-screen bg-white text-foreground overflow-hidden">
      {!hideSidebar && <AppSidebar />}
      
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
        <Header />
        
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
            <ScrollArea className="flex-1 w-full">
                <main className="w-full min-w-0">
                    <div className={cn(
                        "p-4 sm:p-6 lg:p-10 w-full min-w-0 overflow-hidden",
                        // Menambahkan padding bawah pada mobile agar tidak tertutup bottom nav
                        !isPortal && "pb-24 md:pb-6", 
                        isPortal && "lg:p-12 max-w-7xl mx-auto"
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
