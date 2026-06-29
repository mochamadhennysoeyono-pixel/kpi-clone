// src/app/(main)/layout.tsx
import { MasterDataProvider } from "@/contexts/master-data-context";
import { PageContextProvider } from "@/contexts/page-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { SubMenuProvider } from "@/components/layout/SubMenuOverlayProvider";
import MainLayoutContent from "./main-layout-content";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <SubMenuProvider>
        <MasterDataProvider>
          <PageContextProvider>
            <MainLayoutContent>{children}</MainLayoutContent>
          </PageContextProvider>
        </MasterDataProvider>
      </SubMenuProvider>
    </SidebarProvider>
  );
}
