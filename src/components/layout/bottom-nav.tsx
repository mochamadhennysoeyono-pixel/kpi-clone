// src/components/layout/bottom-nav.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import {
  Home,
  LayoutGrid,
  Activity,
  Folder,
  BarChart2,
  Settings,
  MonitorPlay,
  Building
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubMenu } from './submenu-context';
import { getNavItems, getActiveModuleFromPath, iconMap } from '@/lib/nav-items';
import { usePageContext } from '@/contexts/page-context';
import { IconTokens } from '@/lib/icon-tokens';

export function BottomNav() {
  const pathname = usePathname();
  const { userRole, currentUser } = useAuth();
  const { employees, companies, subscriptionPlans, okrs } = useMasterData();
  const isMobile = useIsMobile();
  const { setActiveGroup, activeGroup } = useSubMenu();
  const { hideBottomNav } = usePageContext();

  const userCompany = React.useMemo(() => {
    if (!currentUser) return null;
    return companies.find(c => c.name === currentUser.company);
  }, [currentUser, companies]);

  const userSubscriptionPlan = React.useMemo(() => {
    if (!userCompany) return null;
    const relevantCompany = userCompany.parentId ? companies.find(c => c.id === userCompany.parentId) : userCompany;
    if (!relevantCompany) return null;
    return subscriptionPlans.find(p => p.id === relevantCompany.subscriptionPlanId);
  }, [userCompany, companies, subscriptionPlans]);

  const hasSubordinates = React.useMemo(() => {
    if (!currentUser) return false;
    return employees.some(e => e.reportsTo === currentUser.id);
  }, [currentUser, employees]);
  
  const activeModule = React.useMemo(() => getActiveModuleFromPath(pathname), [pathname]);

  const handleMenuClick = () => {
    if (activeGroup) {
      setActiveGroup(null);
      return;
    }
    const allDesktopItems = getNavItems(userRole, hasSubordinates, userCompany, userSubscriptionPlan, false, currentUser, okrs, activeModule);
    const menuGroup = {
      label: 'Navigasi Pintar',
      subItems: allDesktopItems,
    };
    setActiveGroup(menuGroup);
  };

  // --- CONFIGURATION PER ROLE ---
  const items = React.useMemo(() => {
    if (!userRole) return [];

    if (userRole === 'superadmin') {
      return [
        { href: '/dashboard', label: 'Workbench', icon: LayoutGrid },
        { href: '/appraisal-dashboard', label: 'Analitik', icon: BarChart2 },
        { type: 'action' as const },
        { href: '/master-data/company', label: 'Klien', icon: Building },
        { href: '/settings', label: 'Sistem', icon: Settings },
      ];
    }

    if (userRole === 'manajemen') {
       return [
        { href: '/workspace', label: 'Workspace', icon: LayoutGrid },
        { href: '/appraisal-dashboard', label: 'Dashboard', icon: BarChart2 },
        { type: 'action' as const },
        { href: '/collab-space', label: 'Collab', icon: MonitorPlay },
        { href: '/settings', label: 'Profil', icon: Settings },
      ];
    }

    // Default Role: User / Staff
    return [
      { href: '/action-center', label: 'Beranda', icon: Home },
      { href: '/my-performance', label: 'Performa', icon: Activity },
      { type: 'action' as const },
      { href: '/collab-space', label: 'Collab', icon: MonitorPlay },
      { href: '/settings', label: 'Profil', icon: Settings },
    ];
  }, [userRole]);

  // Hide bottom nav if explicitely requested, if not mobile, or on the main workspace entry page
  if (!isMobile || hideBottomNav || pathname === '/workspace') {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] h-[72px] bg-white/95 backdrop-blur-xl border-t border-slate-100 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.06)] no-print">
        <div className="relative grid grid-cols-5 items-center h-full w-full px-2">
            {items.map((item, idx) => {
                // RENDER: Big Center Action Button
                if (item.type === 'action') {
                    return (
                        <div key="action-center-btn" className="flex justify-center -translate-y-4">
                            <button 
                                onClick={handleMenuClick} 
                                className="size-14 bg-[#111827] text-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/20 ring-4 ring-white transition-transform active:scale-90"
                            >
                                <LayoutGrid size={26} strokeWidth={2} />
                            </button>
                        </div>
                    );
                }

                // RENDER: Standard Nav Link
                const isActive = item.href && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
                const Icon = item.icon || Folder;

                return (
                    <Link 
                        key={item.href || item.label} 
                        href={item.href || '#'}
                        className={cn(
                            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95 group"
                        )}
                    >
                        <div className={cn(
                            "p-1.5 rounded-lg transition-all duration-300",
                            isActive ? "bg-[#F3F4F6]" : "bg-transparent"
                        )}>
                            <Icon 
                              size={IconTokens.size.mobile} 
                              strokeWidth={IconTokens.strokeWidth} 
                              color={isActive ? IconTokens.color.active : IconTokens.color.default}
                            />
                        </div>
                        <span className={cn(
                            "text-[9px] font-bold tracking-tight",
                            isActive ? "text-[#2563eb]" : "text-slate-400"
                        )}>
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </div>
    </nav>
  );
}
