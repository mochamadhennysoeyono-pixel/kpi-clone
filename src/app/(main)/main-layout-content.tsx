
// src/app/(main)/main-layout-content.tsx
"use client";

import React from 'react';
import Header from '@/components/layout/header';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useMasterData } from '@/contexts/master-data-context';
import { BottomNav } from '@/components/layout/bottom-nav';
import { AppSidebar } from '@/components/ui/sidebar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePageContext } from '@/contexts/page-context';
import { cn } from '@/lib/utils';
import { Ripple } from '@/components/ui/ripple';

export default function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isMasterDataLoading } = useMasterData();
  const { hideBottomNav } = usePageContext();
  const router = useRouter();
  const { isMobile, breakpoint } = useBreakpoint();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      router.replace('/login');
    }
  }, [isAuthLoading, currentUser, router]);
  
  const totalIsLoading = isAuthLoading || isMasterDataLoading;

  const isPortal = pathname === '/portal';
  const isDocEditor = pathname.startsWith('/document-management/templates/');
  const hideSidebar = isPortal || isDocEditor;

  if (totalIsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6">
          <Ripple className="w-16 h-16 text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">
            Sinkronisasi Arsitektur Adaptif...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  if (isDocEditor) {
    return <div className="h-screen flex flex-col bg-white overflow-hidden">{children}</div>;
  }

  return (
    <div className="flex h-screen bg-slate-50/50 text-foreground overflow-hidden relative">
      {!hideSidebar && <AppSidebar />}
      
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative h-full">
        <Header />
        
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
            <ScrollArea className="flex-1 w-full h-full">
                <main className={cn(
                    "w-full min-w-0 mx-auto",
                    isPortal ? "max-w-[1920px]" : "max-w-7xl"
                )}>
                    {/* Padding dinamis berdasarkan Breakpoint */}
                    <div className={cn(
                        "transition-all duration-500",
                        isMobile ? "pb-24" : "pb-10",
                        isPortal && "lg:p-12"
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
