// src/components/layout/bottom-nav.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import {
  ListTodo,
  UserCog,
  Mail,
  Settings,
  LayoutGrid,
  ChevronLeft,
  MoreHorizontal
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubMenu } from './submenu-context';
import { getNavItems, iconMap, getActiveModuleFromPath } from '@/lib/nav-items';
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
      label: 'Semua Menu',
      subItems: allDesktopItems,
    };
    setActiveGroup(menuGroup);
  };

  const isPortal = pathname === '/portal';

  // --- Dynamic Item Calculation for Management/User ---
  const dynamicItems = React.useMemo(() => {
    if (userRole === 'superadmin' || isPortal) return [];
    
    // Get items relevant to the current module
    const allItems = getNavItems(userRole, hasSubordinates, userCompany, userSubscriptionPlan, false, currentUser, okrs, activeModule);
    
    // Flatten links from subItems if a group is active
    let links: any[] = [];
    allItems.forEach((item: any) => {
        if (item.href) {
            links.push(item);
        } else if (item.subItems) {
            item.subItems.forEach((sub: any) => links.push(sub));
        }
    });

    // Strategy: Show up to 4 items + Portal, or 3 items + More + Portal
    const finalItems = [];
    if (links.length > 4) {
        finalItems.push(...links.slice(0, 3));
        finalItems.push({ label: 'Menu', iconName: 'more', type: 'more' });
    } else {
        finalItems.push(...links);
    }
    
    // Always add Portal at the end
    finalItems.push({ label: 'Portal', href: '/portal', iconName: 'portal' });
    
    return finalItems;
  }, [userRole, isPortal, hasSubordinates, userCompany, userSubscriptionPlan, currentUser, okrs, activeModule]);

  const classicBottomItems = React.useMemo(() => {
    return [
        { href: '/dashboard', label: 'Admin', iconName: '/dashboard' },
        { href: '/appraisal-dashboard', label: 'Appraisal', iconName: '/appraisal-dashboard' },
        { href: '/reports', label: 'Laporan', iconName: '/reports' },
        { href: '/kbo-appraisal', label: 'KBO', iconName: '/kbo-appraisal' },
    ];
  }, []);

  if (!isMobile || hideBottomNav || isPortal) {
    return null;
  }

  // --- RENDER CLASSIC (SUPERADMIN) ---
  if (userRole === 'superadmin') {
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] h-16 bg-background/80 backdrop-blur-sm border-t rounded-t-2xl shadow-2xl">
            <div className="relative grid grid-cols-5 items-center h-full w-full p-1">
                {classicBottomItems.slice(0, 2).map((item) => {
                    const Icon = iconMap[item.iconName || 'default'] || ListTodo;
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href} className="flex flex-1 items-center justify-center w-full h-full">
                            <div className={cn("relative flex flex-col items-center justify-center w-full h-full text-xs transition-all", isActive ? "text-primary scale-110" : "text-muted-foreground opacity-60")}>
                                <Icon className="h-6 w-6" />
                            </div>
                        </Link>
                    )
                })}
                <div className="col-start-3 flex justify-center">
                    <button onClick={handleMenuClick} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+8px)] w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-xl transform transition-transform duration-200 hover:scale-110">
                        <LayoutGrid className="h-7 w-7 text-primary-foreground" />
                    </button>
                </div>
                {classicBottomItems.slice(2, 4).map((item) => {
                    const Icon = iconMap[item.iconName || 'default'] || Settings;
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href} className="flex flex-1 items-center justify-center w-full h-full">
                            <div className={cn("relative flex flex-col items-center justify-center w-full h-full text-xs transition-all", isActive ? "text-primary scale-110" : "text-muted-foreground opacity-60")}>
                                <Icon className="h-6 w-6" />
                            </div>
                        </Link>
                    )
                })}
            </div>
        </nav>
    );
  }

  // --- RENDER FLAT (MANAJEMEN / USER) ---
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] h-16 bg-background/95 backdrop-blur-md border-t shadow-[0_-8px_30px_rgb(0,0,0,0.08)]">
        <div className="flex items-center justify-around h-full w-full px-2">
            {dynamicItems.map((item, idx) => {
                if (item.type === 'more') {
                    return (
                        <button 
                            key="more-btn"
                            onClick={handleMenuClick}
                            className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-90"
                        >
                            <div className="p-2 rounded-xl bg-muted/50">
                                <LayoutGrid size={22} className="text-muted-foreground" />
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground">Menu</span>
                        </button>
                    );
                }

                const Icon = item.iconName === 'portal' ? ChevronLeft : (iconMap[item.iconName || item.href || 'default'] || ListTodo);
                const isActive = item.href && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
                const isPortalLink = item.iconName === 'portal';

                return (
                    <Link 
                        key={item.href || item.label} 
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95",
                            isActive ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        <div className={cn(
                            "p-2 rounded-xl transition-colors",
                            isActive ? "bg-primary/10" : "bg-transparent",
                            isPortalLink && "bg-slate-100"
                        )}>
                            <Icon size={isPortalLink ? 20 : 22} className={cn(isActive ? "text-primary" : "opacity-70", isPortalLink && "text-slate-600 stroke-[3px]")} />
                        </div>
                        <span className={cn(
                            "text-[8px] font-black uppercase tracking-tighter",
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