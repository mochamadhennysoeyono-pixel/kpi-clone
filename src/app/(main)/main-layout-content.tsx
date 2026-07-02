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
import { ConcentricRing } from '@/components/ui/concentric-ring';

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
        <div className="flex flex-col items-center gap-4">
          <ConcentricRing className="w-12 h-12 text-primary" style={{ '--duration': '1.5s' } as React.CSSProperties} />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Memuat data...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }
  
  let userCompany;
  let isSubscriptionLocked = false;
  let contentToRender = children;

  if (userRole !== 'superadmin') {
      userCompany = companies.find((c) => c.name === currentUser.company || c.id === currentUser.company);
      
      if (userCompany) {
          if (userCompany.subscriptionExpiryDate) {
              const expiryDate = new Date(userCompany.subscriptionExpiryDate);
              expiryDate.setHours(23, 59, 59, 999);
              if (expiryDate < new Date()) {
                  isSubscriptionLocked = true;
              }
          }
          
          if (!isSubscriptionLocked && userCompany.status === 'Tidak Aktif') {
              isSubscriptionLocked = true;
          }
      }

      const isSubscriptionRoute = pathname.startsWith('/subscription-plans') || pathname.startsWith('/subscription-status');

      if (isSubscriptionLocked && !isSubscriptionRoute) {
          contentToRender = (
              <div className="flex flex-col items-center justify-center h-[80vh] w-full text-center p-4">
                  <AlertCircle className="w-16 h-16 text-destructive mb-4 mx-auto" />
                  <h1 className="text-2xl font-bold mb-2">
                      Akses Terbatas
                  </h1>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Masa berlaku trial atau langganan perusahaan "{userCompany?.name}" telah berakhir. Seluruh fitur manajemen performa dinonaktifkan sementara.
                  </p>
                  <div className="flex gap-4 justify-center">
                      {(userRole === 'manajemen') && (
                          <Button onClick={() => router.push('/subscription-plans')}>
                            Upgrade / Ganti Paket
                          </Button>
                      )}
                      <Button variant={userRole === 'user' ? "default" : "outline"} onClick={() => router.push('/subscription-status')}>
                        Status Paket
                      </Button>
                  </div>
              </div>
          );
      }
  }

  if (pathname.startsWith('/document-management/templates/')) {
    return (
      <div className="h-screen flex flex-col">
        {contentToRender}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="bg-background h-screen flex flex-col overflow-hidden">
        <AppSidebar />
        <Header />
        <ScrollArea className="flex-1">
          <main className={cn(
            "w-full",
            !hideBottomNav && "pb-24"
          )}>
            <div className={cn(
              "w-full",
              !hideBottomNav && "p-3 sm:p-6"
            )}>
              {contentToRender}
            </div>
          </main>
        </ScrollArea>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
        <Header />
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
            <ScrollArea className="flex-1 w-full">
                <main className="w-full min-w-0">
                    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 overflow-hidden">
                        {contentToRender}
                    </div>
                </main>
            </ScrollArea>
        </div>
      </div>
    </div>
  );
}
