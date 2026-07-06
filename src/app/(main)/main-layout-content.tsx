
// src/app/(main)/main-layout-content.tsx
"use client";

import React, { useMemo } from 'react';
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
import { getActiveModuleFromPath } from '@/lib/nav-items';
import type { ModuleId } from '@/types';

export default function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { currentUser, userRole, isLoading: isAuthLoading } = useAuth();
  const { companies, isLoading: isMasterDataLoading } = useMasterData();
  const { hideBottomNav } = usePageContext();
  const router = useRouter();
  const { isMobile } = useBreakpoint();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      router.replace('/login');
    }
  }, [isAuthLoading, currentUser, router]);
  
  const totalIsLoading = isAuthLoading || isMasterDataLoading;

  // --- ACCESS PROTECTION GUARD ---
  React.useEffect(() => {
    if (totalIsLoading || !currentUser || userRole === 'superadmin') return;

    const activeModule = getActiveModuleFromPath(pathname);
    
    // Check for core operational modules only
    const protectedModules: ModuleId[] = ['appraisal', 'lms', 'collabspace'];
    
    if (activeModule && protectedModules.includes(activeModule as ModuleId)) {
      const company = companies.find(c => c.name === currentUser.company);
      const subscription = company?.moduleSubscriptions?.[activeModule as ModuleId];

      if (!subscription || subscription.status !== 'active') {
        console.warn(`[Access Guard] Unsubscribed access attempt to ${activeModule} from ${pathname}`);
        router.replace('/workspace');
      }
    }
  }, [pathname, totalIsLoading, currentUser, userRole, companies, router]);

  const isWorkspace = pathname === '/workspace';
  const isDocEditor = pathname.startsWith('/document-management/templates/');
  const hideSidebar = isWorkspace || isDocEditor;

  if (totalIsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <Ripple className="w-16 h-16 text-primary" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">
            PERFOM INDUSTRIAL UTILITY
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  if (isDocEditor) {
    return <div className="h-screen flex flex-col bg-background overflow-hidden">{children}</div>;
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
      {!hideSidebar && <AppSidebar />}
      
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative h-full">
        <Header />
        
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
            <ScrollArea className="flex-1 w-full h-full">
                <main className={cn(
                    "w-full min-w-0 mx-auto",
                    isWorkspace ? "max-w-[1920px]" : "max-w-7xl"
                )}>
                    <div className={cn(
                        "transition-all duration-500",
                        isMobile ? "pb-24" : "pb-10",
                        isWorkspace && "lg:p-12"
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
