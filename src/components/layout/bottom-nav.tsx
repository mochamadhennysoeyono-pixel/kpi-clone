
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
  CheckCircle,
  BarChart2
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubMenu } from './submenu-context';
import { getNavItems, iconMap, getActiveModuleFromPath } from '@/lib/nav-items';
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
      label: 'Menu Utama',
      subItems: allDesktopItems,
    };
    setActiveGroup(menuGroup);
  };

  const isWorkspace = pathname === '/workspace';

  // --- Dynamic Item Calculation ---
  const dynamicItems = React.useMemo(() => {
    if (userRole === 'superadmin' || isWorkspace) return [];
    
    const allItems = getNavItems(userRole, hasSubordinates, userCompany, userSubscriptionPlan, false, currentUser, okrs, activeModule);
    
    let links: any[] = [];
    allItems.forEach((item: any) => {
        if (item.href) {
            links.push(item);
        } else if (item.subItems) {
            item.subItems.forEach((sub: any) => links.push(sub));
        }
    });

    const finalItems = [];
    if (links.length > 4) {
        finalItems.push(...links.slice(0, 3));
        finalItems.push({ label: 'Menu', iconName: 'more', type: 'more' });
    } else {
        finalItems.push(...links);
    }
    
    finalItems.push({ label: 'Workspace', href: '/workspace', iconName: 'portal' });
    
    return finalItems;
  }, [userRole, isWorkspace, hasSubordinates, userCompany, userSubscriptionPlan, currentUser, okrs, activeModule]);

  const classicBottomItems = React.useMemo(() => {
    return [
        { href: '/dashboard', label: 'Home', icon: Home },
        { href: '/appraisal-dashboard', label: 'Appraisal', icon: Activity },
        { href: '/reports', label: 'Laporan', icon: BarChart2 },
        { href: '/kbo-appraisal', label: 'KBO', icon: CheckCircle },
    ];
  }, []);

  if (!isMobile || hideBottomNav || isWorkspace) {
    return null;
  }

  // --- RENDER CLASSIC (SUPERADMIN) ---
  if (userRole === 'superadmin') {
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] h-[72px] bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)] no-print">
            <div className="relative grid grid-cols-5 items-center h-full w-full px-2">
                {classicBottomItems.slice(0, 2).map((item) => {
                    const Icon = item.icon || Folder;
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all active:scale-95 group">
                            <div className={cn(
                                "p-1.5 rounded-lg transition-all duration-300",
                                isActive ? "bg-[#F3F4F6]" : ""
                            )}>
                                <Icon 
                                  size={IconTokens.size.mobile} 
                                  strokeWidth={IconTokens.strokeWidth} 
                                  color={isActive ? IconTokens.color.active : IconTokens.color.default}
                                />
                            </div>
                            <span className={cn("text-[9px] font-bold tracking-tight", isActive ? "text-[#2563eb]" : "text-slate-400")}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
                
                <div className="flex justify-center -translate-y-4">
                    <button 
                        onClick={handleMenuClick} 
                        className="size-14 bg-[#111827] text-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/20 ring-4 ring-white transition-transform active:scale-90"
                    >
                        <LayoutGrid size={26} strokeWidth={2} />
                    </button>
                </div>

                {classicBottomItems.slice(2, 4).map((item) => {
                    const Icon = item.icon || Folder;
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all active:scale-95 group">
                            <div className={cn(
                                "p-1.5 rounded-lg transition-all duration-300",
                                isActive ? "bg-[#F3F4F6]" : ""
                            )}>
                                <Icon 
                                  size={IconTokens.size.mobile} 
                                  strokeWidth={IconTokens.strokeWidth} 
                                  color={isActive ? IconTokens.color.active : IconTokens.color.default}
                                />
                            </div>
                            <span className={cn("text-[9px] font-bold tracking-tight", isActive ? "text-[#2563eb]" : "text-slate-400")}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    );
  }

  // --- RENDER FLAT (MANAJEMEN / USER) ---
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] h-[72px] bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)] no-print">
        <div className="flex items-center justify-around h-full w-full px-2">
            {dynamicItems.map((item, idx) => {
                if (item.type === 'more') {
                    return (
                        <button 
                            key="more-btn"
                            onClick={handleMenuClick}
                            className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-90 group"
                        >
                            <div className="p-1.5 rounded-lg transition-all duration-300">
                                <LayoutGrid size={IconTokens.size.mobile} strokeWidth={IconTokens.strokeWidth} color={IconTokens.color.default} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">Menu</span>
                        </button>
                    );
                }

                const RawIcon = item.iconName === 'portal' ? Home : (iconMap[item.iconName || item.href || 'default'] || Folder);
                const Icon = RawIcon;
                const isActive = item.href && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));

                return (
                    <Link 
                        key={item.href || item.label} 
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95 group",
                            isActive ? "text-[#2563eb]" : "text-slate-400"
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
                            isActive ? "text-[#2563eb]" : "opacity-80"
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
