// src/components/layout/bottom-nav.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import {
  House,
  ChartBar,
  Checks,
  SquaresFour,
  CaretLeft,
  Activity,
  Folders
} from '@phosphor-icons/react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubMenu } from './submenu-context';
import { getNavItems, iconMap, getActiveModuleFromPath, getIconColor } from '@/lib/nav-items';
import { usePageContext } from '@/contexts/page-context';

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

  const isPortal = pathname === '/portal';

  // --- Dynamic Item Calculation for Management/User ---
  const dynamicItems = React.useMemo(() => {
    if (userRole === 'superadmin' || isPortal) return [];
    
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
    
    finalItems.push({ label: 'Portal', href: '/portal', iconName: 'portal' });
    
    return finalItems;
  }, [userRole, isPortal, hasSubordinates, userCompany, userSubscriptionPlan, currentUser, okrs, activeModule]);

  const classicBottomItems = React.useMemo(() => {
    return [
        { href: '/dashboard', label: 'Home', icon: House },
        { href: '/appraisal-dashboard', label: 'Appraisal', icon: Activity },
        { href: '/reports', label: 'Laporan', icon: ChartBar },
        { href: '/kbo-appraisal', label: 'KBO', icon: Checks },
    ];
  }, []);

  if (!isMobile || hideBottomNav || isPortal) {
    return null;
  }

  // --- RENDER CLASSIC (SUPERADMIN) ---
  if (userRole === 'superadmin') {
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] h-[72px] bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)] no-print">
            <div className="relative grid grid-cols-5 items-center h-full w-full px-2">
                {classicBottomItems.slice(0, 2).map((item) => {
                    const Icon = item.icon || Folders;
                    const isActive = pathname === item.href;
                    const iconColor = getIconColor(item.href);
                    return (
                        <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all active:scale-95 group">
                            <div className={cn(
                                "p-1.5 rounded-lg transition-all duration-300",
                                isActive ? "bg-primary/5 scale-110" : "opacity-60 group-active:scale-125"
                            )}>
                                <Icon size={22} weight="fill" color={isActive ? iconColor : "#8E8E93"} />
                            </div>
                            <span className={cn("text-[9px] font-bold tracking-tight", isActive ? "text-primary" : "text-slate-400")}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
                
                <div className="flex justify-center -translate-y-4">
                    <button 
                        onClick={handleMenuClick} 
                        className="size-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/20 ring-4 ring-white transition-transform active:scale-90"
                    >
                        <SquaresFour size={26} weight="fill" />
                    </button>
                </div>

                {classicBottomItems.slice(2, 4).map((item) => {
                    const Icon = item.icon || Folders;
                    const isActive = pathname === item.href;
                    const iconColor = getIconColor(item.href);
                    return (
                        <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all active:scale-95 group">
                            <div className={cn(
                                "p-1.5 rounded-lg transition-all duration-300",
                                isActive ? "bg-primary/5 scale-110" : "opacity-60 group-active:scale-125"
                            )}>
                                <Icon size={22} weight="fill" color={isActive ? iconColor : "#8E8E93"} />
                            </div>
                            <span className={cn("text-[9px] font-bold tracking-tight", isActive ? "text-primary" : "text-slate-400")}>
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
                            <div className="p-1.5 rounded-lg transition-all duration-300 group-active:scale-125">
                                <SquaresFour size={22} weight="fill" color="#8E8E93" className="opacity-90" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">Menu</span>
                        </button>
                    );
                }

                const RawIcon = item.iconName === 'portal' ? CaretLeft : (iconMap[item.iconName || item.href || 'default'] || Folders);
                const Icon = RawIcon;
                const isActive = item.href && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
                const iconColor = getIconColor(item.href || item.label);

                return (
                    <Link 
                        key={item.href || item.label} 
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95 group",
                            isActive ? "text-primary" : "text-slate-400"
                        )}
                    >
                        <div className={cn(
                            "p-1.5 rounded-lg transition-all duration-300",
                            isActive ? "bg-primary/5 scale-110" : "bg-transparent group-active:scale-125"
                        )}>
                            <Icon size={22} weight="fill" color={isActive ? iconColor : "#8E8E93"} className={cn(isActive ? "opacity-100" : "opacity-90")} />
                        </div>
                        <span className={cn(
                            "text-[9px] font-bold tracking-tight",
                            isActive ? "text-primary" : "opacity-60"
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
