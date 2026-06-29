// src/app/(main)/main-layout-content.tsx
"use client";

import React from 'react';
import Header from '@/components/layout/header';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useMasterData } from '@/contexts/master-data-context';
import { PageAssistant } from '@/components/layout/page-assistant';
import { BottomNav } from '@/components/layout/bottom-nav';
import { AppSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import Image from 'next/image';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePageContext } from '@/contexts/page-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
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

  if (!currentUser) {
    return null;
  }
  
  const userCompany = companies.find((c) => c.name === currentUser.company || c.id === currentUser.company);
  let isSubscriptionLocked = false;
  let lockReasonType = 'trial';

  if (userCompany) {
      if (userCompany.subscriptionExpiryDate) {
          const expiryDate = new Date(userCompany.subscriptionExpiryDate);
          expiryDate.setHours(23, 59, 59, 999);
          if (expiryDate < new Date()) {
              isSubscriptionLocked = true;
              lockReasonType = userCompany.subscriptionPlanId === 'default-trial' ? 'trial' : 'expired';
          }
      }
      
      if (!isSubscriptionLocked && userCompany.status === 'Tidak Aktif') {
          isSubscriptionLocked = true;
          lockReasonType = 'expired';
      }
  }

  const isSubscriptionRoute = pathname.startsWith('/subscription-plans') || pathname.startsWith('/subscription-status');

  let contentToRender = children;

  if (isSubscriptionLocked && !isSubscriptionRoute && currentUser.role !== 'superadmin') {
      contentToRender = (
          <div className="flex flex-col items-center justify-center h-[80vh] w-full text-center p-4">
              <AlertCircle className="w-16 h-16 text-destructive mb-4 mx-auto" />
              <h1 className="text-2xl font-bold mb-2">
                  Akses Terbatas
              </h1>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Masa berlaku trial atau langganan perusahaan "{userCompany?.name}" telah berakhir. Seluruh fitur manajemen performa dinonaktifkan sementara.
                  {currentUser.role === 'karyawan' && " Silakan hubungi manajemen atau administrator perusahaan Anda."}
              </p>
              <div className="flex gap-4 justify-center">
                  {(currentUser.role === 'manajemen' || currentUser.role === 'admin') && (
                      <Button onClick={() => router.push('/subscription-plans')}>
                        Upgrade / Ganti Paket
                      </Button>
                  )}
                  <Button variant={currentUser.role === 'karyawan' ? "default" : "outline"} onClick={() => router.push('/subscription-status')}>
                    Status Paket
                  </Button>
              </div>
          </div>
      );
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
      <div className="bg-background min-h-screen flex flex-col overflow-x-hidden">
        <AppSidebar />
        <Header />
        <main className={cn(
            "flex-1 flex flex-col w-full min-w-0 overflow-x-hidden",
            !hideBottomNav && "pb-24"
        )}>
          <div className={cn(
              "flex-1 flex flex-col w-full min-w-0",
              !hideBottomNav && "p-3 sm:p-6" // Slightly reduced padding for mobile
          )}>
            {contentToRender}
          </div>
        </main>
        <PageAssistant />
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
      <PageAssistant />
    </div>
  );
}
