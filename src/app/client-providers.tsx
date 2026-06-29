"use client";

import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { MasterDataProvider } from '@/contexts/master-data-context';
import { PageContextProvider } from '@/contexts/page-context';
import { SidebarProvider } from '@/contexts/sidebar-context';
import { Toaster } from '@/components/ui/toaster';
import { SubMenuProvider } from '@/components/layout/SubMenuOverlayProvider';
import { PushNotificationManager } from '@/components/layout/push-notification-manager';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
                <MasterDataProvider>
                    <PageContextProvider>
                        <SidebarProvider>
                            <SubMenuProvider>
                                <PushNotificationManager />
                                {children}
                                <Toaster />
                            </SubMenuProvider>
                        </SidebarProvider>
                    </PageContextProvider>
                </MasterDataProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
